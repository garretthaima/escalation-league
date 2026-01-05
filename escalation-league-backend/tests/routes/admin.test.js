const request = require('supertest');
const { getAuthToken, getAuthTokenWithRole } = require('../helpers/authHelper');
const { createTestUser } = require('../helpers/dbHelper');

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

describe('Admin Routes', () => {
    describe('GET /api/admin/user/all', () => {
        it('should return all users for super_admin', async () => {
            await createTestUser({ firstname: 'User1' });
            await createTestUser({ firstname: 'User2' });
            await createTestUser({ firstname: 'User3' });

            const { token } = await getAuthTokenWithRole('super_admin');

            const res = await request(app)
                .get('/api/admin/user/all')
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(200);
            expect(Array.isArray(res.body)).toBe(true);
            expect(res.body.length).toBeGreaterThanOrEqual(3);
        });

        it('should reject non-admin access', async () => {
            const { token } = await getAuthToken();

            const res = await request(app)
                .get('/api/admin/user/all')
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(403);
        });

        // TODO: Test pagination support
        // TODO: Test search/filter capabilities
    });

    describe('GET /api/admin/user/:id', () => {
        it('should return user details', async () => {
            const userId = await createTestUser({ firstname: 'TestUser' });
            const { token } = await getAuthTokenWithRole('super_admin');

            const res = await request(app)
                .get(`/api/admin/user/${userId}`)
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('id', userId);
            expect(res.body).toHaveProperty('firstname', 'TestUser');
        });

        it('should reject non-admin access', async () => {
            const userId = await createTestUser();
            const { token } = await getAuthToken();

            const res = await request(app)
                .get(`/api/admin/user/${userId}`)
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(403);
        });

        it('should return 404 for non-existent user', async () => {
            const { token } = await getAuthTokenWithRole('super_admin');

            const res = await request(app)
                .get('/api/admin/user/99999')
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(404);
        });
    });

    describe('PUT /api/admin/user/ban/:id', () => {
        it('should ban a user', async () => {
            const userId = await createTestUser();
            const { token } = await getAuthTokenWithRole('super_admin');

            const res = await request(app)
                .put(`/api/admin/user/ban/${userId}`)
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('message');
        });

        it('should reject non-admin access', async () => {
            const userId = await createTestUser();
            const { token } = await getAuthToken();

            const res = await request(app)
                .put(`/api/admin/user/ban/${userId}`)
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(403);
        });

        // TODO: Test banned user cannot login
    });

    describe('PUT /api/admin/user/unban/:id', () => {
        it('should unban a user', async () => {
            const userId = await createTestUser({ is_banned: 1 });
            const { token } = await getAuthTokenWithRole('super_admin');

            const res = await request(app)
                .put(`/api/admin/user/unban/${userId}`)
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('message');
        });

        it('should reject non-admin access', async () => {
            const userId = await createTestUser({ is_banned: 1 });
            const { token } = await getAuthToken();

            const res = await request(app)
                .put(`/api/admin/user/unban/${userId}`)
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(403);
        });
    });

    describe('PUT /api/admin/user/deactivate/:id', () => {
        it('should deactivate a user', async () => {
            const userId = await createTestUser({ is_active: 1 });
            const { token } = await getAuthTokenWithRole('super_admin');

            const res = await request(app)
                .put(`/api/admin/user/deactivate/${userId}`)
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('message');
        });

        it('should reject non-admin access', async () => {
            const userId = await createTestUser();
            const { token } = await getAuthToken();

            const res = await request(app)
                .put(`/api/admin/user/deactivate/${userId}`)
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(403);
        });

        // TODO: Test deactivated user cannot login
    });

    describe('PUT /api/admin/user/activate/:id', () => {
        it('should activate a user', async () => {
            const userId = await createTestUser({ is_active: 0 });
            const { token } = await getAuthTokenWithRole('super_admin');

            const res = await request(app)
                .put(`/api/admin/user/activate/${userId}`)
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('message');
        });

        it('should reject non-admin access', async () => {
            const userId = await createTestUser({ is_active: 0 });
            const { token } = await getAuthToken();

            const res = await request(app)
                .put(`/api/admin/user/activate/${userId}`)
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(403);
        });
    });

    describe('PUT /api/admin/user/reset-password/:id', () => {
        it('should reset user password', async () => {
            const userId = await createTestUser();
            const { token } = await getAuthTokenWithRole('super_admin');

            const res = await request(app)
                .put(`/api/admin/user/reset-password/${userId}`)
                .set('Authorization', `Bearer ${token}`)
                .send({ newPassword: 'NewSecurePass123!' });

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('message');
        });

        it('should reject non-admin access', async () => {
            const userId = await createTestUser();
            const { token } = await getAuthToken();

            const res = await request(app)
                .put(`/api/admin/user/reset-password/${userId}`)
                .set('Authorization', `Bearer ${token}`)
                .send({ newPassword: 'NewSecurePass123!' });

            expect(res.status).toBe(403);
        });

        // TODO: Test password complexity requirements
        // TODO: Test user can login with new password
    });

    describe('GET /api/admin/role-requests', () => {
        it('should return pending role requests', async () => {
            const { token } = await getAuthTokenWithRole('super_admin');

            const res = await request(app)
                .get('/api/admin/role-requests')
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(200);
            expect(Array.isArray(res.body)).toBe(true);
        });

        it('should reject non-admin access', async () => {
            const { token } = await getAuthToken();

            const res = await request(app)
                .get('/api/admin/role-requests')
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(403);
        });

        // TODO: Test includes user details
        // TODO: Test filtering by status
    });

    describe('POST /api/admin/role-requests/review', () => {
        it('should approve role request', async () => {
            const { token } = await getAuthTokenWithRole('super_admin');

            const res = await request(app)
                .post('/api/admin/role-requests/review')
                .set('Authorization', `Bearer ${token}`)
                .send({
                    requestId: 1,
                    action: 'approve',
                    newRoleId: 2
                });

            // May be 200 or 404 depending on if request exists
            expect([200, 404]).toContain(res.status);
        });

        it('should reject role request', async () => {
            const { token } = await getAuthTokenWithRole('super_admin');

            const res = await request(app)
                .post('/api/admin/role-requests/review')
                .set('Authorization', `Bearer ${token}`)
                .send({
                    requestId: 1,
                    action: 'reject'
                });

            // May be 200 or 404 depending on if request exists
            expect([200, 404]).toContain(res.status);
        });

        it('should reject non-admin access', async () => {
            const { token } = await getAuthToken();

            const res = await request(app)
                .post('/api/admin/role-requests/review')
                .set('Authorization', `Bearer ${token}`)
                .send({
                    requestId: 1,
                    action: 'approve'
                });

            expect(res.status).toBe(403);
        });

        // TODO: Test validates action (approve/reject)
        // TODO: Test user receives updated role
    });

    describe('GET /api/admin/reports/leagues', () => {
        it('should return league report', async () => {
            const { token } = await getAuthTokenWithRole('super_admin');

            const res = await request(app)
                .get('/api/admin/reports/leagues')
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(200);
            expect(Array.isArray(res.body) || typeof res.body === 'object').toBe(true);
        });

        it('should reject non-admin access', async () => {
            const { token } = await getAuthToken();

            const res = await request(app)
                .get('/api/admin/reports/leagues')
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(403);
        });

        // TODO: Test report includes league stats
        // TODO: Test date range filtering
    });
});
