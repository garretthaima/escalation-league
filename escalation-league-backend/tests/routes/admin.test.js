const request = require('supertest');
const { getAuthToken, getAuthTokenWithRole } = require('../helpers/authHelper');
const { createTestUser } = require('../helpers/dbHelper');
const { createTestLeague } = require('../helpers/leaguesHelper');
const { assignRoleToUser } = require('../helpers/rbacHelper');

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

describe.skip('Admin Routes', () => {
    describe('GET /api/admin/users', () => {
        it('should return all users for super_admin', async () => {
            await createTestUser({ firstname: 'User1' });
            await createTestUser({ firstname: 'User2' });
            await createTestUser({ firstname: 'User3' });

            const { token } = await getAuthTokenWithRole('super_admin');

            const res = await request(app)
                .get('/api/admin/users')
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(200);
            expect(Array.isArray(res.body)).toBe(true);
            expect(res.body.length).toBeGreaterThanOrEqual(3);
        });

        it('should reject non-admin access', async () => {
            const { token } = await getAuthToken();

            const res = await request(app)
                .get('/api/admin/users')
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(403);
        });

        it('should support pagination', async () => {
            const { token } = await getAuthTokenWithRole('super_admin');

            const res = await request(app)
                .get('/api/admin/users')
                .query({ page: 1, limit: 10 })
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('users');
            expect(res.body).toHaveProperty('total');
            expect(res.body).toHaveProperty('page');
        });

        // TODO: Test search by email
        // TODO: Test filter by role
        // TODO: Test filter by active/banned status
        // TODO: Test sorting options
    });

    describe('PUT /api/admin/users/:id/role', () => {
        it('should update user role', async () => {
            const targetUser = await createTestUser();
            const { token } = await getAuthTokenWithRole('super_admin');

            const res = await request(app)
                .put(`/api/admin/users/${targetUser}/role`)
                .set('Authorization', `Bearer ${token}`)
                .send({ role_id: 2 });

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('message');
        });

        it('should reject non-admin access', async () => {
            const targetUser = await createTestUser();
            const { token } = await getAuthToken();

            const res = await request(app)
                .put(`/api/admin/users/${targetUser}/role`)
                .set('Authorization', `Bearer ${token}`)
                .send({ role_id: 2 });

            expect(res.status).toBe(403);
        });

        it('should reject invalid role_id', async () => {
            const targetUser = await createTestUser();
            const { token } = await getAuthTokenWithRole('super_admin');

            const res = await request(app)
                .put(`/api/admin/users/${targetUser}/role`)
                .set('Authorization', `Bearer ${token}`)
                .send({ role_id: 99999 });

            expect(res.status).toBe(400);
        });

        // TODO: Test cannot demote last super_admin
        // TODO: Test activity log created
    });

    describe('POST /api/admin/users/:id/ban', () => {
        it('should ban user', async () => {
            const targetUser = await createTestUser();
            const { token } = await getAuthTokenWithRole('super_admin');

            const res = await request(app)
                .post(`/api/admin/users/${targetUser}/ban`)
                .set('Authorization', `Bearer ${token}`)
                .send({
                    reason: 'Violating community guidelines',
                    duration: 30 // days
                });

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('message');
        });

        it('should reject non-admin access', async () => {
            const targetUser = await createTestUser();
            const { token } = await getAuthToken();

            const res = await request(app)
                .post(`/api/admin/users/${targetUser}/ban`)
                .set('Authorization', `Bearer ${token}`)
                .send({ reason: 'Test' });

            expect(res.status).toBe(403);
        });

        it('should not allow banning super_admin', async () => {
            const targetUser = await createTestUser();
            await assignRoleToUser(targetUser, 'super_admin');

            const { token } = await getAuthTokenWithRole('super_admin');

            const res = await request(app)
                .post(`/api/admin/users/${targetUser}/ban`)
                .set('Authorization', `Bearer ${token}`)
                .send({ reason: 'Test' });

            expect(res.status).toBe(400);
        });

        // TODO: Test banned user cannot login
        // TODO: Test activity log created
    });

    describe('POST /api/admin/users/:id/unban', () => {
        it('should unban user', async () => {
            const targetUser = await createTestUser({ is_banned: 1 });
            const { token } = await getAuthTokenWithRole('super_admin');

            const res = await request(app)
                .post(`/api/admin/users/${targetUser}/unban`)
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('message');
        });

        // TODO: Test user can login after unban
    });

    describe('DELETE /api/admin/users/:id', () => {
        it('should soft delete user', async () => {
            const targetUser = await createTestUser();
            const { token } = await getAuthTokenWithRole('super_admin');

            const res = await request(app)
                .delete(`/api/admin/users/${targetUser}`)
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('message');
        });

        it('should not allow deleting yourself', async () => {
            const { token, userId } = await getAuthTokenWithRole('super_admin');

            const res = await request(app)
                .delete(`/api/admin/users/${userId}`)
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(400);
        });

        it('should not allow deleting last super_admin', async () => {
            const targetUser = await createTestUser();
            await assignRoleToUser(targetUser, 'super_admin');

            const { token } = await getAuthTokenWithRole('super_admin');

            const res = await request(app)
                .delete(`/api/admin/users/${targetUser}`)
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(400);
        });

        // TODO: Test cascade behavior
        // TODO: Test activity log created
    });

    describe('GET /api/admin/activity-logs', () => {
        it('should return activity logs', async () => {
            const { token } = await getAuthTokenWithRole('super_admin');

            const res = await request(app)
                .get('/api/admin/activity-logs')
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(200);
            expect(Array.isArray(res.body)).toBe(true);
        });

        it('should filter by user_id', async () => {
            const targetUser = await createTestUser();
            const { token } = await getAuthTokenWithRole('super_admin');

            const res = await request(app)
                .get('/api/admin/activity-logs')
                .query({ user_id: targetUser })
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(200);
            expect(Array.isArray(res.body)).toBe(true);
        });

        it('should filter by action type', async () => {
            const { token } = await getAuthTokenWithRole('super_admin');

            const res = await request(app)
                .get('/api/admin/activity-logs')
                .query({ action: 'user_banned' })
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(200);
        });

        // TODO: Test date range filtering
        // TODO: Test pagination
        // TODO: Test sorting by timestamp
    });

    describe('GET /api/admin/stats', () => {
        it('should return system statistics', async () => {
            const { token } = await getAuthTokenWithRole('super_admin');

            const res = await request(app)
                .get('/api/admin/stats')
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('totalUsers');
            expect(res.body).toHaveProperty('activeLeagues');
            expect(res.body).toHaveProperty('totalGames');
        });

        it('should reject non-admin access', async () => {
            const { token } = await getAuthToken();

            const res = await request(app)
                .get('/api/admin/stats')
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(403);
        });

        // TODO: Test includes user growth metrics
        // TODO: Test includes game activity metrics
    });

    describe('POST /api/admin/settings', () => {
        it('should update system setting', async () => {
            const { token } = await getAuthTokenWithRole('super_admin');

            const res = await request(app)
                .post('/api/admin/settings')
                .set('Authorization', `Bearer ${token}`)
                .send({
                    key: 'maintenance_mode',
                    value: 'true'
                });

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('message');
        });

        it('should reject non-admin access', async () => {
            const { token } = await getAuthToken();

            const res = await request(app)
                .post('/api/admin/settings')
                .set('Authorization', `Bearer ${token}`)
                .send({
                    key: 'test_setting',
                    value: 'test'
                });

            expect(res.status).toBe(403);
        });

        // TODO: Test validates setting keys
        // TODO: Test activity log created
    });
});