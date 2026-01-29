const request = require('supertest');
const { getAuthToken, getAuthTokenWithRole } = require('../helpers/authHelper');
const db = require('../helpers/testDb');

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

// Helper to create activity log entries
async function createActivityLog(userId, action, metadata = null) {
    const [id] = await db('activity_logs').insert({
        user_id: userId,
        action,
        metadata: metadata ? JSON.stringify(metadata) : null,
        timestamp: db.fn.now()
    });
    return id;
}

describe('Activity Logs Routes', () => {
    describe('GET /api/activity-logs/me', () => {
        it('should return current user activity logs', async () => {
            const { token, userId } = await getAuthToken();

            await createActivityLog(userId, 'LOGIN', { ip: '127.0.0.1' });
            await createActivityLog(userId, 'PROFILE_UPDATE', { field: 'email' });

            const res = await request(app)
                .get('/api/activity-logs/me')
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('logs');
            expect(Array.isArray(res.body.logs)).toBe(true);
            expect(res.body.logs.length).toBe(2);
            expect(res.body).toHaveProperty('pagination');
            expect(res.body.pagination).toHaveProperty('page', 1);
            expect(res.body.pagination).toHaveProperty('total', 2);
        });

        it('should parse metadata JSON correctly', async () => {
            const { token, userId } = await getAuthToken();

            await createActivityLog(userId, 'ACTION', { key: 'value', number: 123 });

            const res = await request(app)
                .get('/api/activity-logs/me')
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(200);
            expect(res.body.logs[0].metadata).toEqual({ key: 'value', number: 123 });
        });

        it('should only return own logs', async () => {
            const user1 = await getAuthToken();
            const user2 = await getAuthToken();

            await createActivityLog(user1.userId, 'USER1_ACTION');
            await createActivityLog(user2.userId, 'USER2_ACTION');

            const res = await request(app)
                .get('/api/activity-logs/me')
                .set('Authorization', `Bearer ${user1.token}`);

            expect(res.status).toBe(200);
            expect(res.body.logs.length).toBe(1);
            expect(res.body.logs[0].action).toBe('USER1_ACTION');
        });

        it('should support pagination', async () => {
            const { token, userId } = await getAuthToken();

            // Create 10 logs
            for (let i = 1; i <= 10; i++) {
                await createActivityLog(userId, `ACTION_${i}`);
            }

            const res = await request(app)
                .get('/api/activity-logs/me')
                .query({ page: 2, limit: 3 })
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(200);
            expect(res.body.logs.length).toBe(3);
            expect(res.body.pagination.page).toBe(2);
            expect(res.body.pagination.limit).toBe(3);
            expect(res.body.pagination.total).toBe(10);
            expect(res.body.pagination.totalPages).toBe(4);
        });

        it('should require authentication', async () => {
            const res = await request(app)
                .get('/api/activity-logs/me');

            expect(res.status).toBe(401);
        });
    });

    describe('GET /api/activity-logs', () => {
        it('should return all activity logs with admin permission', async () => {
            const { token: adminToken } = await getAuthTokenWithRole('super_admin');
            const { userId: userId1 } = await getAuthToken();
            const { userId: userId2 } = await getAuthToken();

            await createActivityLog(userId1, 'USER1_ACTION');
            await createActivityLog(userId2, 'USER2_ACTION');

            const res = await request(app)
                .get('/api/activity-logs')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('logs');
            expect(res.body.logs.length).toBeGreaterThanOrEqual(2);
            expect(res.body).toHaveProperty('pagination');
        });

        it('should include user details in logs', async () => {
            const { token: adminToken } = await getAuthTokenWithRole('super_admin');
            const { userId } = await getAuthToken();

            await createActivityLog(userId, 'TEST_ACTION');

            const res = await request(app)
                .get('/api/activity-logs')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(res.status).toBe(200);
            const log = res.body.logs.find(l => l.user_id === userId);
            expect(log).toHaveProperty('firstname');
            expect(log).toHaveProperty('lastname');
            expect(log).toHaveProperty('email');
        });

        it('should filter by action', async () => {
            const { token: adminToken } = await getAuthTokenWithRole('super_admin');
            const { userId } = await getAuthToken();

            await createActivityLog(userId, 'LOGIN');
            await createActivityLog(userId, 'LOGOUT');
            await createActivityLog(userId, 'LOGIN_FAILED');

            const res = await request(app)
                .get('/api/activity-logs')
                .query({ action: 'LOGIN' })
                .set('Authorization', `Bearer ${adminToken}`);

            expect(res.status).toBe(200);
            // Should match LOGIN and LOGIN_FAILED (LIKE query)
            expect(res.body.logs.every(l => l.action.includes('LOGIN'))).toBe(true);
        });

        it('should filter by userId', async () => {
            const { token: adminToken } = await getAuthTokenWithRole('super_admin');
            const { userId: userId1 } = await getAuthToken();
            const { userId: userId2 } = await getAuthToken();

            await createActivityLog(userId1, 'ACTION1');
            await createActivityLog(userId2, 'ACTION2');

            const res = await request(app)
                .get('/api/activity-logs')
                .query({ userId: userId1 })
                .set('Authorization', `Bearer ${adminToken}`);

            expect(res.status).toBe(200);
            expect(res.body.logs.every(l => l.user_id === userId1)).toBe(true);
        });

        it('should filter by date range', async () => {
            const { token: adminToken } = await getAuthTokenWithRole('super_admin');
            const { userId } = await getAuthToken();

            await createActivityLog(userId, 'RECENT_ACTION');

            const today = new Date().toISOString().split('T')[0];
            const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];

            const res = await request(app)
                .get('/api/activity-logs')
                .query({ startDate: today, endDate: tomorrow })
                .set('Authorization', `Bearer ${adminToken}`);

            expect(res.status).toBe(200);
            expect(res.body.logs.length).toBeGreaterThanOrEqual(1);
        });

        it('should reject without admin permission', async () => {
            const { token } = await getAuthToken(); // Regular user

            const res = await request(app)
                .get('/api/activity-logs')
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(403);
        });

        it('should require authentication', async () => {
            const res = await request(app)
                .get('/api/activity-logs');

            expect(res.status).toBe(401);
        });
    });

    describe('GET /api/activity-logs/action-types', () => {
        it('should return distinct action types with admin permission', async () => {
            const { token: adminToken } = await getAuthTokenWithRole('super_admin');
            const { userId } = await getAuthToken();

            await createActivityLog(userId, 'LOGIN');
            await createActivityLog(userId, 'LOGOUT');
            await createActivityLog(userId, 'LOGIN'); // Duplicate

            const res = await request(app)
                .get('/api/activity-logs/action-types')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('actions');
            expect(Array.isArray(res.body.actions)).toBe(true);
            // Should have unique values
            const uniqueActions = [...new Set(res.body.actions)];
            expect(uniqueActions.length).toBe(res.body.actions.length);
        });

        it('should reject without admin permission', async () => {
            const { token } = await getAuthToken();

            const res = await request(app)
                .get('/api/activity-logs/action-types')
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(403);
        });

        it('should require authentication', async () => {
            const res = await request(app)
                .get('/api/activity-logs/action-types');

            expect(res.status).toBe(401);
        });
    });

    describe('GET /api/activity-logs/user/:id', () => {
        it('should return activity logs for specific user with admin permission', async () => {
            const { token: adminToken } = await getAuthTokenWithRole('super_admin');
            const { userId } = await getAuthToken();

            await createActivityLog(userId, 'USER_ACTION_1');
            await createActivityLog(userId, 'USER_ACTION_2');

            const res = await request(app)
                .get(`/api/activity-logs/user/${userId}`)
                .set('Authorization', `Bearer ${adminToken}`);

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('user');
            expect(res.body.user).toHaveProperty('id', userId);
            expect(res.body.user).toHaveProperty('firstname');
            expect(res.body.user).toHaveProperty('lastname');
            expect(res.body.user).toHaveProperty('email');
            expect(res.body).toHaveProperty('logs');
            expect(res.body.logs.length).toBe(2);
            expect(res.body).toHaveProperty('pagination');
        });

        it('should support pagination', async () => {
            const { token: adminToken } = await getAuthTokenWithRole('super_admin');
            const { userId } = await getAuthToken();

            for (let i = 1; i <= 10; i++) {
                await createActivityLog(userId, `ACTION_${i}`);
            }

            const res = await request(app)
                .get(`/api/activity-logs/user/${userId}`)
                .query({ page: 1, limit: 5 })
                .set('Authorization', `Bearer ${adminToken}`);

            expect(res.status).toBe(200);
            expect(res.body.logs.length).toBe(5);
            expect(res.body.pagination.total).toBe(10);
            expect(res.body.pagination.totalPages).toBe(2);
        });

        it('should return 404 for non-existent user', async () => {
            const { token: adminToken } = await getAuthTokenWithRole('super_admin');

            const res = await request(app)
                .get('/api/activity-logs/user/99999')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(res.status).toBe(404);
            expect(res.body).toHaveProperty('error', 'User not found.');
        });

        it('should reject without admin permission', async () => {
            const { token } = await getAuthToken();
            const { userId: otherUserId } = await getAuthToken();

            const res = await request(app)
                .get(`/api/activity-logs/user/${otherUserId}`)
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(403);
        });

        it('should require authentication', async () => {
            const res = await request(app)
                .get('/api/activity-logs/user/1');

            expect(res.status).toBe(401);
        });
    });
});
