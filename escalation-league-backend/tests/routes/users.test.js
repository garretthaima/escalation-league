const request = require('supertest');
const { getAuthToken, getAuthTokenWithRole } = require('../helpers/authHelper');
const { createTestUser } = require('../helpers/dbHelper');
const { createTestLeague } = require('../helpers/league-helper');

jest.mock('../../models/db', () => require('../helpers/testDb'));
jest.mock('../../utils/settingsUtils', () => ({
    getSetting: jest.fn((key) => {
        if (key === 'secret_key') {
            return Promise.resolve(process.env.JWT_SECRET || 'test-secret-key');
        }
        return Promise.resolve(null);
    })
}));

const app = require('../../server');

describe('User Routes', () => {
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
            expect(res.body).toHaveProperty('id', userId);
            expect(res.body).toHaveProperty('firstname', 'John');
            expect(res.body).toHaveProperty('lastname', 'Doe');
            expect(res.body).not.toHaveProperty('password'); // Should not expose password
        });

        it('should reject request without authentication', async () => {
            const res = await request(app)
                .get('/api/users/profile');

            expect(res.status).toBe(401);
        });

        // TODO: Test profile includes user stats (wins, losses, draws)
        // TODO: Test profile includes role information
    });

    describe('PUT /api/users/profile', () => {
        it('should update user profile', async () => {
            const { token } = await getAuthToken();

            const res = await request(app)
                .put('/api/users/profile')
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

            expect(profileRes.body.firstname).toBe('Updated');
            expect(profileRes.body.lastname).toBe('Name');
        });

        it('should not allow updating email to existing email', async () => {
            const existingEmail = `existing-${Date.now()}@example.com`;
            await createTestUser({ email: existingEmail });

            const { token } = await getAuthToken();

            const res = await request(app)
                .put('/api/users/profile')
                .set('Authorization', `Bearer ${token}`)
                .send({
                    email: existingEmail
                });

            expect(res.status).toBe(400);
        });

        // TODO: Test password update requires old password
        // TODO: Test email verification when changing email
        // TODO: Test profile picture upload
    });

    describe('GET /api/users/:id', () => {
        it('should return public user profile', async () => {
            const targetUserId = await createTestUser({
                firstname: 'Target',
                lastname: 'User',
                wins: 10,
                losses: 5
            });

            const { token } = await getAuthToken();

            const res = await request(app)
                .get(`/api/users/${targetUserId}`)
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
                .get('/api/users/99999')
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(404);
        });

        // TODO: Test includes user's recent games
        // TODO: Test includes user's league participation
    });

    describe('GET /api/users', () => {
        it('should return list of users for admin', async () => {
            // Create some test users
            await createTestUser({ firstname: 'User1' });
            await createTestUser({ firstname: 'User2' });
            await createTestUser({ firstname: 'User3' });

            const { token } = await getAuthTokenWithRole('super_admin');

            const res = await request(app)
                .get('/api/users')
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(200);
            expect(Array.isArray(res.body)).toBe(true);
            expect(res.body.length).toBeGreaterThanOrEqual(3);
        });

        it('should reject request from non-admin', async () => {
            const { token } = await getAuthToken();

            const res = await request(app)
                .get('/api/users')
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(403);
        });

        // TODO: Test pagination
        // TODO: Test search/filter by name
        // TODO: Test filter by role
        // TODO: Test sorting options
    });

    describe('GET /api/users/:id/stats', () => {
        it('should return user statistics', async () => {
            const targetUserId = await createTestUser({
                wins: 15,
                losses: 8,
                draws: 2
            });

            const { token } = await getAuthToken();

            const res = await request(app)
                .get(`/api/users/${targetUserId}/stats`)
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('wins', 15);
            expect(res.body).toHaveProperty('losses', 8);
            expect(res.body).toHaveProperty('draws', 2);
            expect(res.body).toHaveProperty('totalGames', 25);
            expect(res.body).toHaveProperty('winRate');
        });

        // TODO: Test stats include league-specific performance
        // TODO: Test stats include commander win rates
        // TODO: Test stats include recent game history
    });

    describe('DELETE /api/users/:id', () => {
        it('should soft delete user for admin', async () => {
            const userToDelete = await createTestUser();
            const { token } = await getAuthTokenWithRole('super_admin');

            const res = await request(app)
                .delete(`/api/users/${userToDelete}`)
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('message');
        });

        it('should reject deletion from non-admin', async () => {
            const userToDelete = await createTestUser();
            const { token } = await getAuthToken();

            const res = await request(app)
                .delete(`/api/users/${userToDelete}`)
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(403);
        });

        it('should not allow user to delete themselves', async () => {
            const { token, userId } = await getAuthTokenWithRole('super_admin');

            const res = await request(app)
                .delete(`/api/users/${userId}`)
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(400);
            expect(res.body).toHaveProperty('error');
        });

        // TODO: Test cascade behavior (games, decks, etc.)
        // TODO: Test restore deleted user functionality
    });

    describe('POST /api/users/:id/ban', () => {
        it('should ban user for admin', async () => {
            const userToBan = await createTestUser();
            const { token } = await getAuthTokenWithRole('super_admin');

            const res = await request(app)
                .post(`/api/users/${userToBan}/ban`)
                .set('Authorization', `Bearer ${token}`)
                .send({ reason: 'Cheating' });

            expect(res.status).toBe(200);
        });

        // TODO: Test banned user cannot login
        // TODO: Test unban functionality
        // TODO: Test ban duration/expiry
    });

    describe('GET /api/users/search', () => {
        it('should search users by name', async () => {
            await createTestUser({ firstname: 'Alice', lastname: 'Smith' });
            await createTestUser({ firstname: 'Bob', lastname: 'Jones' });
            await createTestUser({ firstname: 'Alice', lastname: 'Brown' });

            const { token } = await getAuthToken();

            const res = await request(app)
                .get('/api/users/search')
                .query({ q: 'Alice' })
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(200);
            expect(Array.isArray(res.body)).toBe(true);
            expect(res.body.length).toBeGreaterThanOrEqual(2);
            expect(res.body.every(u => u.firstname.includes('Alice'))).toBe(true);
        });

        it('should require search query', async () => {
            const { token } = await getAuthToken();

            const res = await request(app)
                .get('/api/users/search')
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(400);
        });

        // TODO: Test search by email (admin only)
        // TODO: Test minimum query length
        // TODO: Test search result limits
    });
});