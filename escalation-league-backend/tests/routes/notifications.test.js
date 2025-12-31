const request = require('supertest');
const { getAuthToken } = require('../helpers/authHelper');
const { createTestNotification } = require('../helpers/notificationHelper');

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

describe.skip('Notification Routes', () => {
    describe('GET /api/notifications', () => {
        it('should return user notifications', async () => {
            const { token, userId } = await getAuthToken();

            await createTestNotification(userId, {
                title: 'Test Notification 1',
                message: 'Test message 1'
            });
            await createTestNotification(userId, {
                title: 'Test Notification 2',
                message: 'Test message 2'
            });

            const res = await request(app)
                .get('/api/notifications')
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(200);
            expect(Array.isArray(res.body)).toBe(true);
            expect(res.body.length).toBeGreaterThanOrEqual(2);
        });

        it('should only return own notifications', async () => {
            const user1 = await getAuthToken();
            const user2 = await getAuthToken();

            await createTestNotification(user1.userId, { title: 'For User 1' });
            await createTestNotification(user2.userId, { title: 'For User 2' });

            const res = await request(app)
                .get('/api/notifications')
                .set('Authorization', `Bearer ${user1.token}`);

            expect(res.status).toBe(200);
            expect(res.body.every(n => n.user_id === user1.userId)).toBe(true);
        });

        it('should filter by read status', async () => {
            const { token, userId } = await getAuthToken();

            await createTestNotification(userId, { is_read: 0 });
            await createTestNotification(userId, { is_read: 1 });

            const res = await request(app)
                .get('/api/notifications')
                .query({ is_read: 0 })
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(200);
            expect(res.body.every(n => n.is_read === 0)).toBe(true);
        });

        // TODO: Test pagination
        // TODO: Test sorting by created_at
    });

    describe('PUT /api/notifications/:id/read', () => {
        it('should mark notification as read', async () => {
            const { token, userId } = await getAuthToken();
            const notificationId = await createTestNotification(userId, { is_read: 0 });

            const res = await request(app)
                .put(`/api/notifications/${notificationId}/read`)
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(200);
        });

        it('should only allow marking own notifications', async () => {
            const user1 = await getAuthToken();
            const user2 = await getAuthToken();

            const notificationId = await createTestNotification(user1.userId);

            const res = await request(app)
                .put(`/api/notifications/${notificationId}/read`)
                .set('Authorization', `Bearer ${user2.token}`);

            expect(res.status).toBe(403);
        });

        // TODO: Test updates read_at timestamp
    });

    describe('PUT /api/notifications/read-all', () => {
        it('should mark all notifications as read', async () => {
            const { token, userId } = await getAuthToken();

            await createTestNotification(userId, { is_read: 0 });
            await createTestNotification(userId, { is_read: 0 });

            const res = await request(app)
                .put('/api/notifications/read-all')
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(200);
        });

        // TODO: Test only marks user's own notifications
    });

    describe('DELETE /api/notifications/:id', () => {
        it('should delete notification', async () => {
            const { token, userId } = await getAuthToken();
            const notificationId = await createTestNotification(userId);

            const res = await request(app)
                .delete(`/api/notifications/${notificationId}`)
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(200);
        });

        it('should only allow deleting own notifications', async () => {
            const user1 = await getAuthToken();
            const user2 = await getAuthToken();

            const notificationId = await createTestNotification(user1.userId);

            const res = await request(app)
                .delete(`/api/notifications/${notificationId}`)
                .set('Authorization', `Bearer ${user2.token}`);

            expect(res.status).toBe(403);
        });
    });

    describe('GET /api/notifications/unread-count', () => {
        it('should return unread notification count', async () => {
            const { token, userId } = await getAuthToken();

            await createTestNotification(userId, { is_read: 0 });
            await createTestNotification(userId, { is_read: 0 });
            await createTestNotification(userId, { is_read: 1 });

            const res = await request(app)
                .get('/api/notifications/unread-count')
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('count', 2);
        });
    });
});