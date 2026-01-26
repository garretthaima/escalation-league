const request = require('supertest');
const bcrypt = require('bcrypt');
const { getAuthToken, getAuthTokenWithRole } = require('../helpers/authHelper');
const { createTestUser } = require('../helpers/dbHelper');
const { createTestLeague, addUserToLeague } = require('../helpers/leaguesHelper');

jest.mock('../../models/db', () => require('../helpers/testDb'));
jest.mock('../../utils/settingsUtils', () => ({
    getSetting: jest.fn((key) => {
        if (key === 'secret_key') {
            return Promise.resolve(process.env.JWT_SECRET || 'test-secret-key');
        }
        return Promise.resolve(null);
    })
}));

// Mock redis cache
jest.mock('../../utils/redisClient', () => ({
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue('OK'),
    setex: jest.fn().mockResolvedValue('OK'),
    del: jest.fn().mockResolvedValue(1)
}));

// Mock the permissions utility to use test DB
jest.mock('../../utils/permissionsUtils', () => {
    const testDb = require('../helpers/testDb');

    return {
        resolveRolesAndPermissions: async (roleId) => {
            // Get permissions for the role using test DB
            const accessibleRoles = await testDb.withRecursive('role_inheritance', (builder) => {
                builder
                    .select('parent_role_id as role_id', 'child_role_id')
                    .from('role_hierarchy')
                    .unionAll(function () {
                        this.select('ri.role_id', 'rh.child_role_id')
                            .from('role_inheritance as ri')
                            .join('role_hierarchy as rh', 'ri.child_role_id', 'rh.parent_role_id');
                    });
            })
                .select('child_role_id')
                .from('role_inheritance')
                .where('role_id', roleId)
                .union(function () {
                    this.select(testDb.raw('?', [roleId]));
                })
                .then((roles) => roles.map((role) => role.child_role_id));

            const permissions = await testDb('role_permissions')
                .join('permissions', 'role_permissions.permission_id', 'permissions.id')
                .whereIn('role_permissions.role_id', accessibleRoles)
                .select('permissions.id', 'permissions.name');

            const deduplicatedPermissions = Array.from(
                new Map(permissions.map((perm) => [perm.id, perm])).values()
            );

            return { accessibleRoles, permissions: deduplicatedPermissions };
        }
    };
});

const app = require('../../server');
const db = require('../helpers/testDb');
const redis = require('../../utils/redisClient');

describe('User Routes', () => {
    // Clear any cached user role data before each test
    beforeEach(() => {
        redis.get.mockClear();
        redis.get.mockResolvedValue(null);
        redis.set.mockClear();
        redis.set.mockResolvedValue('OK');
        redis.setex.mockClear();
        redis.setex.mockResolvedValue('OK');
        redis.del.mockClear();
        redis.del.mockResolvedValue(1);
    });
    describe('GET /api/users/profile', () => {
        it('should return current user profile', async () => {
            const { token, userId } = await getAuthToken({
                firstname: 'John',
                lastname: 'Doe',
                email: `user-${Date.now()}@example.com`
            });

            const res = await request(app)
                .get('/api/users/profile')
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('user');
            expect(res.body.user).toHaveProperty('id', userId);
            expect(res.body.user).toHaveProperty('firstname', 'John');
            expect(res.body.user).toHaveProperty('lastname', 'Doe');
            expect(res.body.user).not.toHaveProperty('password'); // Should not expose password
        });

        it('should reject request without authentication', async () => {
            const res = await request(app)
                .get('/api/users/profile');

            expect(res.status).toBe(401);
        });

        it('should return user profile with stats', async () => {
            const { token, userId } = await getAuthToken({
                firstname: 'Stats',
                lastname: 'User',
                email: `stats-user-${Date.now()}@example.com`,
                wins: 10,
                losses: 5,
                draws: 2
            });

            const res = await request(app)
                .get('/api/users/profile')
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(200);
            expect(res.body.user).toHaveProperty('wins', 10);
            expect(res.body.user).toHaveProperty('losses', 5);
            expect(res.body.user).toHaveProperty('draws', 2);
        });

        it('should include role_id in profile response', async () => {
            const { token } = await getAuthToken();

            const res = await request(app)
                .get('/api/users/profile')
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(200);
            expect(res.body.user).toHaveProperty('role_id');
        });

        it('should return 404 for deleted user', async () => {
            // Create a user and mark as deleted
            const email = `deleted-${Date.now()}@example.com`;
            const hashedPassword = await bcrypt.hash('password123', 10);
            const [userId] = await db('users').insert({
                firstname: 'Deleted',
                lastname: 'User',
                email,
                password: hashedPassword,
                role_id: 5,
                is_deleted: true,
                is_active: true
            });

            // Try to get a token for this deleted user - this will create a new user
            // So we need to manually create a JWT for the deleted user
            const jwt = require('jsonwebtoken');
            const token = jwt.sign({ id: userId }, process.env.JWT_SECRET || 'test-secret-key');

            const res = await request(app)
                .get('/api/users/profile')
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(404);
        });
    });

    describe('PUT /api/users/update', () => {
        it('should update user profile', async () => {
            const { token } = await getAuthToken();

            const res = await request(app)
                .put('/api/users/update')
                .set('Authorization', `Bearer ${token}`)
                .send({
                    firstname: 'Updated',
                    lastname: 'Name'
                });

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('message');

            // Verify update
            const profileRes = await request(app)
                .get('/api/users/profile')
                .set('Authorization', `Bearer ${token}`);

            expect(profileRes.body.user.firstname).toBe('Updated');
            expect(profileRes.body.user.lastname).toBe('Name');
        });

        it('should not allow updating email to existing email', async () => {
            const existingEmail = `existing-${Date.now()}@example.com`;
            await createTestUser({ email: existingEmail });

            const { token } = await getAuthToken();

            const res = await request(app)
                .put('/api/users/update')
                .set('Authorization', `Bearer ${token}`)
                .send({
                    email: existingEmail
                });

            expect(res.status).toBe(400);
        });

        it('should reject update with no valid fields', async () => {
            const { token } = await getAuthToken();

            const res = await request(app)
                .put('/api/users/update')
                .set('Authorization', `Bearer ${token}`)
                .send({});

            expect(res.status).toBe(400);
            expect(res.body).toHaveProperty('error', 'No valid fields to update.');
        });

        it('should update favorite_color and deck_archetype', async () => {
            const { token } = await getAuthToken();

            const res = await request(app)
                .put('/api/users/update')
                .set('Authorization', `Bearer ${token}`)
                .send({
                    favorite_color: 'blue',
                    deck_archetype: 'control'
                });

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('message', 'Profile updated successfully.');

            // Verify update
            const profileRes = await request(app)
                .get('/api/users/profile')
                .set('Authorization', `Bearer ${token}`);

            expect(profileRes.body.user.favorite_color).toBe('blue');
            expect(profileRes.body.user.deck_archetype).toBe('control');
        });

        it('should allow valid stock profile picture', async () => {
            const { token } = await getAuthToken();

            const res = await request(app)
                .put('/api/users/update')
                .set('Authorization', `Bearer ${token}`)
                .send({
                    picture: '/images/profile-pictures/avatar1.png'
                });

            expect(res.status).toBe(200);
        });

        it('should reject invalid profile picture', async () => {
            const { token } = await getAuthToken();

            const res = await request(app)
                .put('/api/users/update')
                .set('Authorization', `Bearer ${token}`)
                .send({
                    picture: '/images/invalid/picture.png'
                });

            expect(res.status).toBe(400);
            expect(res.body).toHaveProperty('error', 'Invalid profile picture selected.');
        });

        it('should reject request without authentication', async () => {
            const res = await request(app)
                .put('/api/users/update')
                .send({ firstname: 'Test' });

            expect(res.status).toBe(401);
        });
    });

    describe('GET /api/users/profile/:id', () => {
        it('should return public user profile', async () => {
            const targetUserId = await createTestUser({
                firstname: 'Target',
                lastname: 'User',
                wins: 10,
                losses: 5
            });

            const { token } = await getAuthToken();

            const res = await request(app)
                .get(`/api/users/profile/${targetUserId}`)
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('id', targetUserId);
            expect(res.body).toHaveProperty('firstname', 'Target');
            expect(res.body).toHaveProperty('wins', 10);
            expect(res.body).not.toHaveProperty('password');
            expect(res.body).not.toHaveProperty('email'); // Should hide email in public profile
        });

        it('should return 404 for non-existent user', async () => {
            const { token } = await getAuthToken();

            const res = await request(app)
                .get('/api/users/profile/99999')
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(404);
        });

        it('should reject request without authentication', async () => {
            const userId = await createTestUser();

            const res = await request(app)
                .get(`/api/users/profile/${userId}`);

            expect(res.status).toBe(401);
        });
    });

    describe('DELETE /api/users/delete', () => {
        it('should soft delete user account', async () => {
            const { token, userId } = await getAuthToken({
                email: `delete-test-${Date.now()}@example.com`
            });

            const res = await request(app)
                .delete('/api/users/delete')
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('message', 'User account soft deleted successfully.');

            // Verify the user is marked as deleted
            const user = await db('users').where({ id: userId }).first();
            expect(user.is_deleted).toBe(1);
        });

        it('should reject deletion without authentication', async () => {
            const res = await request(app)
                .delete('/api/users/delete');

            expect(res.status).toBe(401);
        });
    });

    describe('PUT /api/users/change-password', () => {
        it('should change password with valid old password', async () => {
            const oldPassword = 'TestPass123!';
            const newPassword = 'NewPassword456!';

            // Use getAuthToken which creates a user with 'TestPass123!' as default password
            const { token, userId } = await getAuthToken({
                email: `password-change-${Date.now()}@example.com`,
                password: oldPassword
            });

            const res = await request(app)
                .put('/api/users/change-password')
                .set('Authorization', `Bearer ${token}`)
                .send({
                    oldPassword,
                    newPassword
                });

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('message', 'Password changed successfully.');

            // Verify new password works
            const user = await db('users').where({ id: userId }).first();
            const passwordMatch = await bcrypt.compare(newPassword, user.password);
            expect(passwordMatch).toBe(true);
        });

        it('should reject password change with incorrect old password', async () => {
            const correctPassword = 'TestPass123!';
            const wrongPassword = 'WrongPassword123!';

            const { token } = await getAuthToken({
                email: `wrong-pw-${Date.now()}@example.com`,
                password: correctPassword
            });

            const res = await request(app)
                .put('/api/users/change-password')
                .set('Authorization', `Bearer ${token}`)
                .send({
                    oldPassword: wrongPassword,
                    newPassword: 'NewPassword456!'
                });

            expect(res.status).toBe(400);
            expect(res.body).toHaveProperty('error', 'Old password is incorrect.');
        });

        it('should reject password change without required fields', async () => {
            const { token } = await getAuthToken();

            const res = await request(app)
                .put('/api/users/change-password')
                .set('Authorization', `Bearer ${token}`)
                .send({});

            expect(res.status).toBe(400);
            expect(res.body).toHaveProperty('error', 'Old password and new password are required.');
        });

        it('should reject password change for Google-authenticated users', async () => {
            // Create user with proper role using getAuthToken
            const { token, userId } = await getAuthToken({
                email: `google-user-${Date.now()}@example.com`,
                password: 'TestPass123!'
            });

            // Update user to have google_id
            await db('users').where({ id: userId }).update({ google_id: 'google-123456' });

            const res = await request(app)
                .put('/api/users/change-password')
                .set('Authorization', `Bearer ${token}`)
                .send({
                    oldPassword: 'TestPass123!',
                    newPassword: 'NewPassword456!'
                });

            expect(res.status).toBe(400);
            expect(res.body).toHaveProperty('error', 'Password changes are not allowed for Google-authenticated users.');
        });

        it('should reject weak passwords', async () => {
            const oldPassword = 'TestPass123!';

            const { token } = await getAuthToken({
                email: `weak-pw-${Date.now()}@example.com`,
                password: oldPassword
            });

            const res = await request(app)
                .put('/api/users/change-password')
                .set('Authorization', `Bearer ${token}`)
                .send({
                    oldPassword,
                    newPassword: '123' // Too weak
                });

            expect(res.status).toBe(400);
            expect(res.body).toHaveProperty('error', 'Invalid password');
        });

        it('should reject request without authentication', async () => {
            const res = await request(app)
                .put('/api/users/change-password')
                .send({
                    oldPassword: 'old',
                    newPassword: 'new'
                });

            expect(res.status).toBe(401);
        });
    });

    describe('GET /api/users/permissions', () => {
        it('should return user permissions', async () => {
            const { token } = await getAuthToken();

            const res = await request(app)
                .get('/api/users/permissions')
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('accessibleRoles');
            expect(res.body).toHaveProperty('permissions');
            expect(Array.isArray(res.body.accessibleRoles)).toBe(true);
            expect(Array.isArray(res.body.permissions)).toBe(true);
        });

        it('should return permissions for super admin', async () => {
            const { token } = await getAuthTokenWithRole('super_admin');

            const res = await request(app)
                .get('/api/users/permissions')
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(200);
            expect(res.body.permissions.length).toBeGreaterThan(0);
        });

        it('should reject request without authentication', async () => {
            const res = await request(app)
                .get('/api/users/permissions');

            expect(res.status).toBe(401);
        });
    });

    describe('GET /api/users/settings', () => {
        it('should return a user setting', async () => {
            const { token, userId } = await getAuthToken();

            // Insert a test setting
            await db('user_settings').insert({
                user_id: userId,
                key_name: 'test_setting',
                value: 'test_value'
            });

            const res = await request(app)
                .get('/api/users/settings')
                .query({ key_name: 'test_setting' })
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('key_name', 'test_setting');
            expect(res.body).toHaveProperty('value', 'test_value');
        });

        it('should return default value for dark_mode if not set', async () => {
            const { token } = await getAuthToken();

            const res = await request(app)
                .get('/api/users/settings')
                .query({ key_name: 'dark_mode' })
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('key_name', 'dark_mode');
            expect(res.body).toHaveProperty('value', 'false');
        });

        it('should return null for non-existent setting', async () => {
            const { token } = await getAuthToken();

            const res = await request(app)
                .get('/api/users/settings')
                .query({ key_name: 'non_existent_setting' })
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(200);
            expect(res.body.value).toBeNull();
        });

        it('should reject request without key_name', async () => {
            const { token } = await getAuthToken();

            const res = await request(app)
                .get('/api/users/settings')
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(400);
            expect(res.body).toHaveProperty('error', 'key_name is required.');
        });

        it('should reject request without authentication', async () => {
            const res = await request(app)
                .get('/api/users/settings')
                .query({ key_name: 'test' });

            expect(res.status).toBe(401);
        });
    });

    describe('PUT /api/users/settings', () => {
        it('should create a new user setting', async () => {
            const { token } = await getAuthToken();

            const res = await request(app)
                .put('/api/users/settings')
                .set('Authorization', `Bearer ${token}`)
                .send({
                    key_name: 'new_setting',
                    value: 'new_value'
                });

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('message', 'Setting "new_setting" updated successfully.');
        });

        it('should update an existing user setting', async () => {
            const { token, userId } = await getAuthToken();

            // Use a unique key name
            const keyName = `update_test_${Date.now()}`;

            // Insert initial setting
            await db('user_settings').insert({
                user_id: userId,
                key_name: keyName,
                value: 'initial_value'
            });

            const res = await request(app)
                .put('/api/users/settings')
                .set('Authorization', `Bearer ${token}`)
                .send({
                    key_name: keyName,
                    value: 'updated_value'
                });

            expect(res.status).toBe(200);

            // Verify the update
            const getRes = await request(app)
                .get('/api/users/settings')
                .query({ key_name: keyName })
                .set('Authorization', `Bearer ${token}`);

            expect(getRes.status).toBe(200);
            expect(getRes.body.value).toBe('updated_value');
        });

        it('should reject request without key_name', async () => {
            const { token } = await getAuthToken();

            const res = await request(app)
                .put('/api/users/settings')
                .set('Authorization', `Bearer ${token}`)
                .send({ value: 'test' });

            expect(res.status).toBe(400);
            expect(res.body).toHaveProperty('error', 'key_name and value are required.');
        });

        it('should reject request without value', async () => {
            const { token } = await getAuthToken();

            const res = await request(app)
                .put('/api/users/settings')
                .set('Authorization', `Bearer ${token}`)
                .send({ key_name: 'test' });

            expect(res.status).toBe(400);
            expect(res.body).toHaveProperty('error', 'key_name and value are required.');
        });

        it('should reject request without authentication', async () => {
            const res = await request(app)
                .put('/api/users/settings')
                .send({
                    key_name: 'test',
                    value: 'test'
                });

            expect(res.status).toBe(401);
        });
    });

    describe('GET /api/users/leaderboard', () => {
        it('should return global leaderboard', async () => {
            // Create users with games played
            await createTestUser({
                firstname: 'Leader1',
                email: `leader1-${Date.now()}@example.com`,
                wins: 10,
                losses: 2,
                draws: 0,
                elo_rating: 1600
            });
            await createTestUser({
                firstname: 'Leader2',
                email: `leader2-${Date.now()}@example.com`,
                wins: 8,
                losses: 4,
                draws: 1,
                elo_rating: 1550
            });

            const { token } = await getAuthToken();

            const res = await request(app)
                .get('/api/users/leaderboard')
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('leaderboard');
            expect(Array.isArray(res.body.leaderboard)).toBe(true);
        });

        it('should order leaderboard by ELO rating', async () => {
            // Create users with different ELO ratings
            await createTestUser({
                firstname: 'HighELO',
                email: `highelo-${Date.now()}@example.com`,
                wins: 5,
                losses: 0,
                elo_rating: 1700
            });
            await createTestUser({
                firstname: 'LowELO',
                email: `lowelo-${Date.now()}@example.com`,
                wins: 2,
                losses: 5,
                elo_rating: 1400
            });

            const { token } = await getAuthToken();

            const res = await request(app)
                .get('/api/users/leaderboard')
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(200);
            const leaderboard = res.body.leaderboard;
            // Verify ordering
            for (let i = 1; i < leaderboard.length; i++) {
                expect(leaderboard[i - 1].elo_rating).toBeGreaterThanOrEqual(leaderboard[i].elo_rating);
            }
        });

        it('should include rank for each player', async () => {
            const { token } = await getAuthToken({
                wins: 1,
                losses: 0,
                elo_rating: 1520
            });

            const res = await request(app)
                .get('/api/users/leaderboard')
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(200);
            if (res.body.leaderboard.length > 0) {
                expect(res.body.leaderboard[0]).toHaveProperty('rank', 1);
            }
        });

        it('should only include players who have played games', async () => {
            // Create user with no games (default ELO 1500, no wins/losses)
            await createTestUser({
                firstname: 'NoGames',
                email: `nogames-${Date.now()}@example.com`,
                wins: 0,
                losses: 0,
                draws: 0,
                elo_rating: 1500
            });

            const { token } = await getAuthToken();

            const res = await request(app)
                .get('/api/users/leaderboard')
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(200);
            // Verify all entries have at least one game
            res.body.leaderboard.forEach(player => {
                const totalGames = player.wins + player.losses + player.draws;
                expect(totalGames).toBeGreaterThan(0);
            });
        });

        it('should reject request without authentication', async () => {
            const res = await request(app)
                .get('/api/users/leaderboard');

            expect(res.status).toBe(401);
        });
    });

    describe('GET /api/users/profile - deck data', () => {
        it('should return profile with deck data from cache', async () => {
            const { token, userId } = await getAuthToken({
                firstname: 'DeckCache',
                lastname: 'User',
                email: `deck-cache-${Date.now()}@example.com`
            });

            // Create a league and add user to it with a deck
            const leagueId = await createTestLeague({
                name: `Test League ${Date.now()}`,
                is_active: true
            });

            // Create a deck (decks table uses string ID from Moxfield/Archidekt)
            const deckId = `deck-cache-${Date.now()}`;
            await db('decks').insert({
                id: deckId,
                platform: 'moxfield',
                name: 'Test Deck',
                decklist_url: 'https://example.com/deck',
                commanders: JSON.stringify([
                    { name: 'Test Commander', scryfall_id: 'test-123' }
                ]),
                cards: JSON.stringify([])
            });

            // Add user to league with deck
            await addUserToLeague(userId, leagueId, { deck_id: deckId });

            // Mock Redis to return cached deck data for this specific deck
            redis.get.mockImplementation((key) => {
                if (key === `deck:${deckId}`) {
                    return Promise.resolve(JSON.stringify({
                        decklist_url: 'https://example.com/deck',
                        commanders: [{ name: 'Cached Commander', scryfall_id: 'cached-123' }]
                    }));
                }
                return Promise.resolve(null);
            });

            const res = await request(app)
                .get('/api/users/profile')
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('currentLeague');
            expect(res.body.currentLeague).toHaveProperty('decklistUrl', 'https://example.com/deck');
            expect(res.body.currentLeague).toHaveProperty('commander_name', 'Cached Commander');

            // Reset mock to default behavior
            redis.get.mockResolvedValue(null);
        });

        it('should return profile with deck data from database when cache miss', async () => {
            const { token, userId } = await getAuthToken({
                firstname: 'DeckDB',
                lastname: 'User',
                email: `deck-db-${Date.now()}@example.com`
            });

            // Create a league and add user to it with a deck
            const leagueId = await createTestLeague({
                name: `Test League DB ${Date.now()}`,
                is_active: true
            });

            // Create a deck
            const deckId = `deck-db-${Date.now()}`;
            await db('decks').insert({
                id: deckId,
                platform: 'archidekt',
                name: 'DB Test Deck',
                decklist_url: 'https://example.com/db-deck',
                commanders: JSON.stringify([
                    { name: 'DB Commander', scryfall_id: 'db-123' },
                    { name: 'Partner Commander', scryfall_id: 'partner-123' }
                ]),
                cards: JSON.stringify([])
            });

            // Add user to league with deck
            await addUserToLeague(userId, leagueId, { deck_id: deckId });

            // Ensure Redis returns null (cache miss)
            redis.get.mockResolvedValueOnce(null);

            const res = await request(app)
                .get('/api/users/profile')
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('currentLeague');
            expect(res.body.currentLeague).toHaveProperty('decklistUrl', 'https://example.com/db-deck');
            expect(res.body.currentLeague).toHaveProperty('commander_name', 'DB Commander');
            expect(res.body.currentLeague).toHaveProperty('partner_name', 'Partner Commander');
        });

        it('should handle deck with empty commanders array gracefully', async () => {
            const { token, userId } = await getAuthToken({
                firstname: 'NoCommander',
                lastname: 'User',
                email: `no-commander-${Date.now()}@example.com`
            });

            // Create a league and add user to it with a deck
            const leagueId = await createTestLeague({
                name: `Test League NoCmd ${Date.now()}`,
                is_active: true
            });

            // Create a deck with empty commanders array
            const deckId = `deck-no-cmd-${Date.now()}`;
            await db('decks').insert({
                id: deckId,
                platform: 'moxfield',
                name: 'No Commander Deck',
                decklist_url: 'https://example.com/no-cmd-deck',
                commanders: JSON.stringify([]),
                cards: JSON.stringify([])
            });

            // Add user to league with deck
            await addUserToLeague(userId, leagueId, { deck_id: deckId });

            // Ensure Redis returns null (cache miss)
            redis.get.mockResolvedValueOnce(null);

            const res = await request(app)
                .get('/api/users/profile')
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('currentLeague');
            // With empty commanders array, commander_name should be null
            expect(res.body.currentLeague.commander_name).toBeNull();
            expect(res.body.currentLeague.partner_name).toBeNull();
        });

        it('should include ELO rank when user has played games', async () => {
            const { token, userId } = await getAuthToken({
                firstname: 'EloRank',
                lastname: 'User',
                email: `elo-rank-${Date.now()}@example.com`,
                elo_rating: 1600 // Higher than default 1500
            });

            const res = await request(app)
                .get('/api/users/profile')
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(200);
            expect(res.body.user).toHaveProperty('elo_rank');
            expect(typeof res.body.user.elo_rank).toBe('number');
        });

        it('should return null ELO rank for user with default rating', async () => {
            const { token } = await getAuthToken({
                firstname: 'DefaultElo',
                lastname: 'User',
                email: `default-elo-${Date.now()}@example.com`,
                elo_rating: 1500
            });

            const res = await request(app)
                .get('/api/users/profile')
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(200);
            expect(res.body.user.elo_rank).toBeNull();
        });
    });

    describe('PUT /api/users/update-stats', () => {
        it('should update user stats', async () => {
            const { token, userId } = await getAuthToken({
                email: `stats-user-${Date.now()}@example.com`
            });

            const res = await request(app)
                .put('/api/users/update-stats')
                .set('Authorization', `Bearer ${token}`)
                .send({
                    userId: userId,
                    wins: 5,
                    losses: 3,
                    draws: 1
                });

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('message', 'User stats updated successfully.');
        });

        it('should reject request without userId', async () => {
            const { token } = await getAuthToken({
                email: `stats-no-id-${Date.now()}@example.com`
            });

            const res = await request(app)
                .put('/api/users/update-stats')
                .set('Authorization', `Bearer ${token}`)
                .send({
                    wins: 5
                });

            expect(res.status).toBe(400);
            expect(res.body).toHaveProperty('error', 'User ID is required.');
        });

        it('should reject request without any stats', async () => {
            const { token } = await getAuthToken({
                email: `stats-no-stats-${Date.now()}@example.com`
            });

            const res = await request(app)
                .put('/api/users/update-stats')
                .set('Authorization', `Bearer ${token}`)
                .send({
                    userId: 1
                });

            expect(res.status).toBe(400);
            expect(res.body).toHaveProperty('error', 'At least one of wins, losses, or draws must be provided.');
        });
    });

    describe('PUT /api/users/update - additional edge cases', () => {
        it('should allow Google profile picture URL', async () => {
            const { token } = await getAuthToken({
                email: `google-pic-${Date.now()}@example.com`
            });

            const res = await request(app)
                .put('/api/users/update')
                .set('Authorization', `Bearer ${token}`)
                .send({
                    picture: 'https://lh3.googleusercontent.com/a/profile-image'
                });

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('message', 'Profile updated successfully.');
        });

        it('should normalize picture URL by removing BACKEND_URL prefix', async () => {
            const { token, userId } = await getAuthToken({
                email: `normalize-pic-${Date.now()}@example.com`
            });

            const originalBackendUrl = process.env.BACKEND_URL;
            process.env.BACKEND_URL = 'http://localhost:3000';

            const res = await request(app)
                .put('/api/users/update')
                .set('Authorization', `Bearer ${token}`)
                .send({
                    picture: 'http://localhost:3000/images/profile-pictures/avatar2.png'
                });

            process.env.BACKEND_URL = originalBackendUrl;

            expect(res.status).toBe(200);

            // Verify the picture was normalized
            const user = await db('users').where({ id: userId }).first();
            expect(user.picture).toBe('/images/profile-pictures/avatar2.png');
        });
    });
});