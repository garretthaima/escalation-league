const request = require('supertest');
const { getAuthToken, getAuthTokenWithRole } = require('../helpers/authHelper');
const { createTestAward, grantAwardToUser } = require('../helpers/awardsHelper');
const { createTestLeague } = require('../helpers/leaguesHelper');

jest.mock('../../models/db', () => require('../helpers/testDb'));
jest.mock('../../utils/settingsUtils', () => ({
    getSetting: jest.fn((key) => {
        if (key === 'secret_key') {
            return Promise.resolve(process.env.JWT_SECRET || 'test-secret-key');
        }
        return Promise.resolve(null);
    })
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

// Mock redis cache
jest.mock('../../utils/redisClient', () => ({
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue('OK'),
    setex: jest.fn().mockResolvedValue('OK'),
    del: jest.fn().mockResolvedValue(1)
}));

// Mock socket emitter
jest.mock('../../utils/socketEmitter', () => ({
    setIo: jest.fn(),
    getIo: jest.fn(),
    emitNotificationRead: jest.fn()
}));

const app = require('../../server');

describe('Awards Routes', () => {
    describe('GET /api/awards', () => {
        it('should return all awards', async () => {
            const { token } = await getAuthToken();

            await createTestAward({ name: 'Award 1' });
            await createTestAward({ name: 'Award 2' });

            const res = await request(app)
                .get('/api/awards')
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(200);
            expect(Array.isArray(res.body)).toBe(true);
            expect(res.body.length).toBeGreaterThanOrEqual(2);
        });

        it('should require authentication', async () => {
            const res = await request(app)
                .get('/api/awards');

            expect(res.status).toBe(401);
        });
    });

    describe('GET /api/awards/:awardId', () => {
        it('should return a specific award', async () => {
            const { token } = await getAuthToken();
            const awardId = await createTestAward({ name: 'Specific Award', description: 'Test description' });

            const res = await request(app)
                .get(`/api/awards/${awardId}`)
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('name', 'Specific Award');
            expect(res.body).toHaveProperty('description', 'Test description');
        });

        it('should return 404 for non-existent award', async () => {
            const { token } = await getAuthToken();

            const res = await request(app)
                .get('/api/awards/99999')
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(404);
        });

        it('should require authentication', async () => {
            const res = await request(app)
                .get('/api/awards/1');

            expect(res.status).toBe(401);
        });
    });

    describe('POST /api/awards', () => {
        it('should create a new award with admin permission', async () => {
            const { token } = await getAuthTokenWithRole('super_admin');

            const res = await request(app)
                .post('/api/awards')
                .set('Authorization', `Bearer ${token}`)
                .send({
                    name: 'New Award',
                    description: 'A brand new award'
                });

            expect(res.status).toBe(201);
            expect(res.body).toHaveProperty('name', 'New Award');
            expect(res.body).toHaveProperty('description', 'A brand new award');
        });

        it('should reject creation without name', async () => {
            const { token } = await getAuthTokenWithRole('super_admin');

            const res = await request(app)
                .post('/api/awards')
                .set('Authorization', `Bearer ${token}`)
                .send({
                    description: 'Missing name'
                });

            expect(res.status).toBe(400);
            expect(res.body).toHaveProperty('error', 'Award name is required.');
        });

        it('should reject duplicate award names', async () => {
            const { token } = await getAuthTokenWithRole('super_admin');
            const existingName = `Duplicate-${Date.now()}`;
            await createTestAward({ name: existingName });

            const res = await request(app)
                .post('/api/awards')
                .set('Authorization', `Bearer ${token}`)
                .send({
                    name: existingName,
                    description: 'Duplicate name'
                });

            expect(res.status).toBe(409);
            expect(res.body).toHaveProperty('error', 'Award with this name already exists.');
        });

        it('should reject creation without permission', async () => {
            const { token } = await getAuthToken(); // Regular user

            const res = await request(app)
                .post('/api/awards')
                .set('Authorization', `Bearer ${token}`)
                .send({
                    name: 'Unauthorized Award',
                    description: 'Should fail'
                });

            expect(res.status).toBe(403);
        });
    });

    describe('PUT /api/awards/:awardId', () => {
        it('should update an award with admin permission', async () => {
            const { token } = await getAuthTokenWithRole('super_admin');
            const awardId = await createTestAward({ name: 'Original Name' });

            const res = await request(app)
                .put(`/api/awards/${awardId}`)
                .set('Authorization', `Bearer ${token}`)
                .send({
                    name: 'Updated Name',
                    description: 'Updated description'
                });

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('name', 'Updated Name');
            expect(res.body).toHaveProperty('description', 'Updated description');
        });

        it('should return 404 for non-existent award', async () => {
            const { token } = await getAuthTokenWithRole('super_admin');

            const res = await request(app)
                .put('/api/awards/99999')
                .set('Authorization', `Bearer ${token}`)
                .send({
                    name: 'Updated Name'
                });

            expect(res.status).toBe(404);
        });

        it('should reject update to duplicate name', async () => {
            const { token } = await getAuthTokenWithRole('super_admin');
            const existingName = `Existing-${Date.now()}`;
            await createTestAward({ name: existingName });
            const awardId = await createTestAward({ name: 'Other Award' });

            const res = await request(app)
                .put(`/api/awards/${awardId}`)
                .set('Authorization', `Bearer ${token}`)
                .send({
                    name: existingName
                });

            expect(res.status).toBe(409);
            expect(res.body).toHaveProperty('error', 'Award with this name already exists.');
        });

        it('should reject update with no fields', async () => {
            const { token } = await getAuthTokenWithRole('super_admin');
            const awardId = await createTestAward({ name: 'No Update Award' });

            const res = await request(app)
                .put(`/api/awards/${awardId}`)
                .set('Authorization', `Bearer ${token}`)
                .send({});

            expect(res.status).toBe(400);
            expect(res.body).toHaveProperty('error', 'No fields to update.');
        });

        it('should reject update without permission', async () => {
            const { token } = await getAuthToken();
            const awardId = await createTestAward({ name: 'Locked Award' });

            const res = await request(app)
                .put(`/api/awards/${awardId}`)
                .set('Authorization', `Bearer ${token}`)
                .send({
                    name: 'Hacked Name'
                });

            expect(res.status).toBe(403);
        });
    });

    describe('DELETE /api/awards/:awardId', () => {
        it('should delete an award with admin permission', async () => {
            const { token } = await getAuthTokenWithRole('super_admin');
            const awardId = await createTestAward({ name: 'To Delete' });

            const res = await request(app)
                .delete(`/api/awards/${awardId}`)
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('message', 'Award deleted successfully.');
        });

        it('should return 404 for non-existent award', async () => {
            const { token } = await getAuthTokenWithRole('super_admin');

            const res = await request(app)
                .delete('/api/awards/99999')
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(404);
        });

        it('should not delete award given to users', async () => {
            const { token, userId } = await getAuthTokenWithRole('super_admin');
            const awardId = await createTestAward({ name: 'Given Award' });
            const leagueId = await createTestLeague();
            await grantAwardToUser(userId, awardId, leagueId);

            const res = await request(app)
                .delete(`/api/awards/${awardId}`)
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(409);
            expect(res.body.error).toContain('Cannot delete award');
        });

        it('should reject delete without permission', async () => {
            const { token } = await getAuthToken();
            const awardId = await createTestAward({ name: 'Protected Award' });

            const res = await request(app)
                .delete(`/api/awards/${awardId}`)
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(403);
        });
    });

    describe('GET /api/awards/league/:leagueId', () => {
        it('should return awards for a league', async () => {
            const { token, userId } = await getAuthTokenWithRole('super_admin');
            const leagueId = await createTestLeague();
            const awardId = await createTestAward({ name: 'League Award' });
            await grantAwardToUser(userId, awardId, leagueId);

            const res = await request(app)
                .get(`/api/awards/league/${leagueId}`)
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(200);
            expect(Array.isArray(res.body)).toBe(true);
            expect(res.body.length).toBe(1);
            expect(res.body[0]).toHaveProperty('award_name', 'League Award');
        });

        it('should return empty array for league with no awards', async () => {
            const { token } = await getAuthToken();
            const leagueId = await createTestLeague();

            const res = await request(app)
                .get(`/api/awards/league/${leagueId}`)
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(200);
            expect(Array.isArray(res.body)).toBe(true);
            expect(res.body.length).toBe(0);
        });

        it('should require authentication', async () => {
            const res = await request(app)
                .get('/api/awards/league/1');

            expect(res.status).toBe(401);
        });
    });

    describe('POST /api/awards/give', () => {
        it('should give award to user with admin permission', async () => {
            const { token } = await getAuthTokenWithRole('super_admin');
            const { userId } = await getAuthToken();
            const leagueId = await createTestLeague();
            const awardId = await createTestAward({ name: 'Award to Give' });

            const res = await request(app)
                .post('/api/awards/give')
                .set('Authorization', `Bearer ${token}`)
                .send({
                    userId,
                    awardId,
                    leagueId
                });

            expect(res.status).toBe(201);
            expect(res.body).toHaveProperty('award_name', 'Award to Give');
        });

        it('should reject missing required fields', async () => {
            const { token } = await getAuthTokenWithRole('super_admin');

            const res = await request(app)
                .post('/api/awards/give')
                .set('Authorization', `Bearer ${token}`)
                .send({
                    userId: 1
                    // Missing awardId and leagueId
                });

            expect(res.status).toBe(400);
            expect(res.body).toHaveProperty('error', 'User ID, Award ID, and League ID are required.');
        });

        it('should reject non-existent award', async () => {
            const { token } = await getAuthTokenWithRole('super_admin');
            const { userId } = await getAuthToken();
            const leagueId = await createTestLeague();

            const res = await request(app)
                .post('/api/awards/give')
                .set('Authorization', `Bearer ${token}`)
                .send({
                    userId,
                    awardId: 99999,
                    leagueId
                });

            expect(res.status).toBe(404);
            expect(res.body).toHaveProperty('error', 'Award not found.');
        });

        it('should reject non-existent user', async () => {
            const { token } = await getAuthTokenWithRole('super_admin');
            const leagueId = await createTestLeague();
            const awardId = await createTestAward({ name: 'Test Award' });

            const res = await request(app)
                .post('/api/awards/give')
                .set('Authorization', `Bearer ${token}`)
                .send({
                    userId: 99999,
                    awardId,
                    leagueId
                });

            expect(res.status).toBe(404);
            expect(res.body).toHaveProperty('error', 'User not found.');
        });

        it('should reject non-existent league', async () => {
            const { token } = await getAuthTokenWithRole('super_admin');
            const { userId } = await getAuthToken();
            const awardId = await createTestAward({ name: 'Test Award' });

            const res = await request(app)
                .post('/api/awards/give')
                .set('Authorization', `Bearer ${token}`)
                .send({
                    userId,
                    awardId,
                    leagueId: 99999
                });

            expect(res.status).toBe(404);
            expect(res.body).toHaveProperty('error', 'League not found.');
        });

        it('should reject duplicate award for same league', async () => {
            const { token } = await getAuthTokenWithRole('super_admin');
            const { userId } = await getAuthToken();
            const leagueId = await createTestLeague();
            const awardId = await createTestAward({ name: 'Unique Award' });
            await grantAwardToUser(userId, awardId, leagueId);

            const res = await request(app)
                .post('/api/awards/give')
                .set('Authorization', `Bearer ${token}`)
                .send({
                    userId,
                    awardId,
                    leagueId
                });

            expect(res.status).toBe(409);
            expect(res.body).toHaveProperty('error', 'User already has this award for this league.');
        });

        it('should reject without permission', async () => {
            const { token } = await getAuthToken();
            const { userId } = await getAuthToken();
            const leagueId = await createTestLeague();
            const awardId = await createTestAward({ name: 'Admin Only Award' });

            const res = await request(app)
                .post('/api/awards/give')
                .set('Authorization', `Bearer ${token}`)
                .send({
                    userId,
                    awardId,
                    leagueId
                });

            expect(res.status).toBe(403);
        });
    });

    describe('DELETE /api/awards/user-award/:userAwardId', () => {
        it('should remove award from user with admin permission', async () => {
            const { token, userId } = await getAuthTokenWithRole('super_admin');
            const leagueId = await createTestLeague();
            const awardId = await createTestAward({ name: 'To Remove Award' });
            const userAwardId = await grantAwardToUser(userId, awardId, leagueId);

            const res = await request(app)
                .delete(`/api/awards/user-award/${userAwardId}`)
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('message', 'Award removed from user successfully.');
        });

        it('should return 404 for non-existent user award', async () => {
            const { token } = await getAuthTokenWithRole('super_admin');

            const res = await request(app)
                .delete('/api/awards/user-award/99999')
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(404);
        });

        it('should reject without permission', async () => {
            const { token: adminToken, userId } = await getAuthTokenWithRole('super_admin');
            const { token: userToken } = await getAuthToken();
            const leagueId = await createTestLeague();
            const awardId = await createTestAward({ name: 'Protected User Award' });
            const userAwardId = await grantAwardToUser(userId, awardId, leagueId);

            const res = await request(app)
                .delete(`/api/awards/user-award/${userAwardId}`)
                .set('Authorization', `Bearer ${userToken}`);

            expect(res.status).toBe(403);
        });
    });
});
