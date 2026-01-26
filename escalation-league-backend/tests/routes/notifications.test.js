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

// Mock socket emitter to avoid socket.io errors in tests
jest.mock('../../utils/socketEmitter', () => ({
    emitNotificationRead: jest.fn(),
    setIo: jest.fn(),
    getIo: jest.fn()
}));

const app = require('../../server');

describe('Notification Routes', () => {
    describe('GET /api/notifications', () => {
        it('should return user notifications with pagination', async () => {
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
            expect(res.body).toHaveProperty('notifications');
            expect(Array.isArray(res.body.notifications)).toBe(true);
            expect(res.body.notifications.length).toBe(2);
            expect(res.body).toHaveProperty('total', 2);
            expect(res.body).toHaveProperty('limit');
            expect(res.body).toHaveProperty('offset');
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
            expect(res.body.notifications.length).toBe(1);
            expect(res.body.notifications[0].title).toBe('For User 1');
        });

        it('should support pagination with limit and offset', async () => {
            const { token, userId } = await getAuthToken();

            // Create 5 notifications
            for (let i = 1; i <= 5; i++) {
                await createTestNotification(userId, {
                    title: `Notification ${i}`,
                    message: `Message ${i}`
                });
            }

            const res = await request(app)
                .get('/api/notifications')
                .query({ limit: 2, offset: 2 })
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(200);
            expect(res.body.notifications.length).toBe(2);
            expect(res.body.total).toBe(5);
            expect(res.body.limit).toBe(2);
            expect(res.body.offset).toBe(2);
        });

        it('should require authentication', async () => {
            const res = await request(app)
                .get('/api/notifications');

            expect(res.status).toBe(401);
        });
    });

    describe('GET /api/notifications/unread-count', () => {
        it('should return unread notification count', async () => {
            const { token, userId } = await getAuthToken();

            await createTestNotification(userId, { is_read: false });
            await createTestNotification(userId, { is_read: false });
            await createTestNotification(userId, { is_read: true });

            const res = await request(app)
                .get('/api/notifications/unread-count')
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('count', 2);
        });

        it('should return 0 when no unread notifications', async () => {
            const { token, userId } = await getAuthToken();

            await createTestNotification(userId, { is_read: true });

            const res = await request(app)
                .get('/api/notifications/unread-count')
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('count', 0);
        });

        it('should require authentication', async () => {
            const res = await request(app)
                .get('/api/notifications/unread-count');

            expect(res.status).toBe(401);
        });
    });

    describe('PUT /api/notifications/:id/read', () => {
        it('should mark notification as read', async () => {
            const { token, userId } = await getAuthToken();
            const notificationId = await createTestNotification(userId, { is_read: false });

            const res = await request(app)
                .put(`/api/notifications/${notificationId}/read`)
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('message', 'Notification marked as read.');
        });

        it('should return success if already read', async () => {
            const { token, userId } = await getAuthToken();
            const notificationId = await createTestNotification(userId, { is_read: true });

            const res = await request(app)
                .put(`/api/notifications/${notificationId}/read`)
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('message', 'Already marked as read.');
        });

        it('should not allow marking other user notifications', async () => {
            const user1 = await getAuthToken();
            const user2 = await getAuthToken();

            const notificationId = await createTestNotification(user1.userId, { is_read: false });

            const res = await request(app)
                .put(`/api/notifications/${notificationId}/read`)
                .set('Authorization', `Bearer ${user2.token}`);

            expect(res.status).toBe(404);
        });

        it('should return 404 for non-existent notification', async () => {
            const { token } = await getAuthToken();

            const res = await request(app)
                .put('/api/notifications/99999/read')
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(404);
        });

        it('should require authentication', async () => {
            const res = await request(app)
                .put('/api/notifications/1/read');

            expect(res.status).toBe(401);
        });
    });

    describe('PUT /api/notifications/read-all', () => {
        it('should mark all notifications as read', async () => {
            const { token, userId } = await getAuthToken();

            await createTestNotification(userId, { is_read: false });
            await createTestNotification(userId, { is_read: false });
            await createTestNotification(userId, { is_read: false });

            const res = await request(app)
                .put('/api/notifications/read-all')
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('message', 'All notifications marked as read.');
            expect(res.body).toHaveProperty('count', 3);
        });

        it('should only mark own notifications', async () => {
            const user1 = await getAuthToken();
            const user2 = await getAuthToken();

            await createTestNotification(user1.userId, { is_read: false });
            await createTestNotification(user2.userId, { is_read: false });

            const res = await request(app)
                .put('/api/notifications/read-all')
                .set('Authorization', `Bearer ${user1.token}`);

            expect(res.status).toBe(200);
            expect(res.body.count).toBe(1);
        });

        it('should return count 0 when no unread notifications', async () => {
            const { token, userId } = await getAuthToken();

            await createTestNotification(userId, { is_read: true });

            const res = await request(app)
                .put('/api/notifications/read-all')
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(200);
            expect(res.body.count).toBe(0);
        });

        it('should require authentication', async () => {
            const res = await request(app)
                .put('/api/notifications/read-all');

            expect(res.status).toBe(401);
        });
    });

    describe('DELETE /api/notifications/:id', () => {
        it('should delete notification', async () => {
            const { token, userId } = await getAuthToken();
            const notificationId = await createTestNotification(userId);

            const res = await request(app)
                .delete(`/api/notifications/${notificationId}`)
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('message', 'Notification deleted.');
        });

        it('should not allow deleting other user notifications', async () => {
            const user1 = await getAuthToken();
            const user2 = await getAuthToken();

            const notificationId = await createTestNotification(user1.userId);

            const res = await request(app)
                .delete(`/api/notifications/${notificationId}`)
                .set('Authorization', `Bearer ${user2.token}`);

            expect(res.status).toBe(404);
        });

        it('should return 404 for non-existent notification', async () => {
            const { token } = await getAuthToken();

            const res = await request(app)
                .delete('/api/notifications/99999')
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(404);
        });

        it('should require authentication', async () => {
            const res = await request(app)
                .delete('/api/notifications/1');

            expect(res.status).toBe(401);
        });
    });
});
