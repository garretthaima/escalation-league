const { db, clearDatabase, createTestUser } = require('../helpers/dbHelper');

jest.mock('../../models/db', () => require('../helpers/testDb'));

// Mock the socket emitter
jest.mock('../../utils/socketEmitter', () => ({
    emitNotification: jest.fn()
}));

// Import the service after mocking
const notificationService = require('../../services/notificationService');
const { emitNotification } = require('../../utils/socketEmitter');

describe('notificationService', () => {
    let userId1, userId2, userId3;
    let adminId, superAdminId;
    let mockApp;

    beforeEach(async () => {
        // Reset mocks
        jest.clearAllMocks();

        // Create test users
        userId1 = await createTestUser({ firstname: 'User', lastname: 'One', role_id: 3 }); // regular user
        userId2 = await createTestUser({ firstname: 'User', lastname: 'Two', role_id: 3 });
        userId3 = await createTestUser({ firstname: 'User', lastname: 'Three', role_id: 3 });
        adminId = await createTestUser({ firstname: 'League', lastname: 'Admin', role_id: 2 }); // league_admin
        superAdminId = await createTestUser({ firstname: 'Super', lastname: 'Admin', role_id: 1 }); // super_admin

        // Mock Express app
        mockApp = {
            get: jest.fn()
        };
    });

    describe('createNotification', () => {
        it('should create a notification in the database', async () => {
            const notification = await notificationService.createNotification(mockApp, userId1, {
                title: 'Test Notification',
                message: 'This is a test message',
                type: 'info',
                link: '/test'
            });

            expect(notification).toBeDefined();
            expect(notification.user_id).toBe(userId1);
            expect(notification.title).toBe('Test Notification');
            expect(notification.message).toBe('This is a test message');
            expect(notification.type).toBe('info');
            expect(notification.link).toBe('/test');
            expect(notification.is_read).toBe(0);
        });

        it('should emit notification via WebSocket', async () => {
            await notificationService.createNotification(mockApp, userId1, {
                title: 'Test Notification',
                type: 'info'
            });

            expect(emitNotification).toHaveBeenCalledTimes(1);
            expect(emitNotification).toHaveBeenCalledWith(
                mockApp,
                userId1,
                expect.objectContaining({
                    user_id: userId1,
                    title: 'Test Notification'
                })
            );
        });

        it('should use default type of info', async () => {
            const notification = await notificationService.createNotification(mockApp, userId1, {
                title: 'Test'
            });

            expect(notification.type).toBe('info');
        });

        it('should handle optional message and link', async () => {
            const notification = await notificationService.createNotification(mockApp, userId1, {
                title: 'Test'
            });

            expect(notification.message).toBeNull();
            expect(notification.link).toBeNull();
        });

        it('should create notifications with all types', async () => {
            const types = ['info', 'success', 'warning', 'error'];

            for (const type of types) {
                const notification = await notificationService.createNotification(mockApp, userId1, {
                    title: `Test ${type}`,
                    type
                });

                expect(notification.type).toBe(type);
            }
        });
    });

    describe('createBulkNotifications', () => {
        it('should create notifications for multiple users', async () => {
            const userIds = [userId1, userId2, userId3];
            const notifications = await notificationService.createBulkNotifications(mockApp, userIds, {
                title: 'Bulk Notification',
                message: 'This goes to everyone',
                type: 'info'
            });

            expect(notifications).toHaveLength(3);
            expect(emitNotification).toHaveBeenCalledTimes(3);

            // Verify each user got a notification
            const dbNotifications = await db('notifications').whereIn('user_id', userIds);
            expect(dbNotifications).toHaveLength(3);
        });

        it('should return empty array for empty user list', async () => {
            const notifications = await notificationService.createBulkNotifications(mockApp, [], {
                title: 'Test'
            });

            expect(notifications).toHaveLength(0);
            expect(emitNotification).not.toHaveBeenCalled();
        });
    });

    describe('getAdminUserIds', () => {
        it('should return all admin user IDs', async () => {
            const adminIds = await notificationService.getAdminUserIds();

            expect(adminIds).toContain(adminId);
            expect(adminIds).toContain(superAdminId);
            expect(adminIds).not.toContain(userId1);
            expect(adminIds).not.toContain(userId2);
        });

        it('should return both super_admin and league_admin roles', async () => {
            const adminIds = await notificationService.getAdminUserIds();

            expect(adminIds).toHaveLength(2);
        });
    });

    describe('notifyAdmins', () => {
        it('should notify all admins', async () => {
            const notifications = await notificationService.notifyAdmins(mockApp, {
                title: 'Admin Alert',
                message: 'Something happened',
                type: 'warning'
            });

            expect(notifications).toHaveLength(2); // adminId and superAdminId
            expect(emitNotification).toHaveBeenCalledTimes(2);
        });
    });

    describe('notifySignupApproved', () => {
        it('should create signup approved notification', async () => {
            const notification = await notificationService.notifySignupApproved(
                mockApp,
                userId1,
                'Test League',
                1
            );

            expect(notification.title).toBe('Welcome to Test League!');
            expect(notification.message).toBe('Your signup request has been approved.');
            expect(notification.type).toBe('success');
            expect(notification.link).toBe('/leagues');
        });
    });

    describe('notifySignupRejected', () => {
        it('should create signup rejected notification', async () => {
            const notification = await notificationService.notifySignupRejected(
                mockApp,
                userId1,
                'Test League'
            );

            expect(notification.title).toBe('Signup Update');
            expect(notification.message).toContain('Test League');
            expect(notification.message).toContain('not approved');
            expect(notification.type).toBe('warning');
        });
    });

    describe('notifyPodAssigned', () => {
        it('should create pod assigned notification', async () => {
            const notification = await notificationService.notifyPodAssigned(
                mockApp,
                userId1,
                123,
                1
            );

            expect(notification.title).toBe('Pod Assigned');
            expect(notification.message).toContain('assigned to a new pod');
            expect(notification.type).toBe('info');
            expect(notification.link).toBe('/pods');
        });
    });

    describe('notifyConfirmGame', () => {
        it('should create game confirmation notification', async () => {
            const notification = await notificationService.notifyConfirmGame(
                mockApp,
                userId1,
                123
            );

            expect(notification.title).toBe('Confirm Your Game');
            expect(notification.message).toContain('confirmation');
            expect(notification.type).toBe('warning');
            expect(notification.link).toBe('/pods');
        });
    });

    describe('notifyGameComplete', () => {
        it('should create game complete notification', async () => {
            const notification = await notificationService.notifyGameComplete(
                mockApp,
                userId1,
                123
            );

            expect(notification.title).toBe('Game Complete');
            expect(notification.message).toContain('confirmed by all players');
            expect(notification.type).toBe('success');
            expect(notification.link).toBe('/pods/history');
        });
    });

    describe('notificationTypes templates', () => {
        const { notificationTypes } = notificationService;

        it('should generate signupApproved template', () => {
            const template = notificationTypes.signupApproved('My League');

            expect(template.title).toBe('Welcome to My League!');
            expect(template.type).toBe('success');
            expect(template.link).toBe('/leagues');
        });

        it('should generate signupRejected template', () => {
            const template = notificationTypes.signupRejected('My League');

            expect(template.title).toBe('Signup Update');
            expect(template.message).toContain('My League');
            expect(template.type).toBe('warning');
        });

        it('should generate newSignupRequest template', () => {
            const template = notificationTypes.newSignupRequest('John Doe', 'My League');

            expect(template.title).toBe('New Signup Request');
            expect(template.message).toContain('John Doe');
            expect(template.message).toContain('My League');
            expect(template.type).toBe('info');
        });

        it('should generate podAssigned template with default link', () => {
            const template = notificationTypes.podAssigned(123);

            expect(template.title).toBe('Pod Assigned');
            expect(template.message).toContain('Pod #123');
            expect(template.link).toBe('/pods');
        });

        it('should generate podAssigned template with custom link', () => {
            const template = notificationTypes.podAssigned(123, '/custom-link');

            expect(template.link).toBe('/custom-link');
        });

        it('should generate confirmGame template', () => {
            const template = notificationTypes.confirmGame(123);

            expect(template.title).toBe('Confirm Your Game');
            expect(template.link).toBe('/pods?podId=123');
            expect(template.type).toBe('warning');
        });

        it('should generate gameComplete template for winner', () => {
            const template = notificationTypes.gameComplete(123, 'won');

            expect(template.title).toBe('Game Complete');
            expect(template.message).toContain('Pod #123');
            expect(template.message).toContain('won');
            expect(template.type).toBe('success');
        });

        it('should generate gameComplete template for non-winner', () => {
            const template = notificationTypes.gameComplete(123, 'lost');

            expect(template.title).toBe('Game Complete');
            expect(template.type).toBe('info');
        });
    });
});
