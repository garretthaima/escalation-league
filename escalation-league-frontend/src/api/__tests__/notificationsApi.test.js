// Mock axiosInstance BEFORE importing modules that use it
jest.mock('../axiosConfig', () => ({
    __esModule: true,
    default: {
        get: jest.fn(),
        post: jest.fn(),
        put: jest.fn(),
        delete: jest.fn(),
    },
}));

import axiosInstance from '../axiosConfig';
import {
    getNotifications,
    getUnreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
} from '../notificationsApi';

describe('notificationsApi', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('getNotifications', () => {
        it('should fetch notifications with default pagination', async () => {
            const mockResponse = {
                notifications: [
                    { id: 1, message: 'New game available', read: false },
                    { id: 2, message: 'You won a match!', read: true },
                ],
                total: 50,
                limit: 20,
                offset: 0,
            };
            axiosInstance.get.mockResolvedValue({ data: mockResponse });

            const result = await getNotifications();

            expect(axiosInstance.get).toHaveBeenCalledWith('/notifications?limit=20&offset=0');
            expect(result).toEqual(mockResponse);
        });

        it('should fetch notifications with custom pagination', async () => {
            const mockResponse = {
                notifications: [{ id: 3, message: 'Game reminder', read: false }],
                total: 50,
                limit: 10,
                offset: 20,
            };
            axiosInstance.get.mockResolvedValue({ data: mockResponse });

            const result = await getNotifications(10, 20);

            expect(axiosInstance.get).toHaveBeenCalledWith('/notifications?limit=10&offset=20');
            expect(result).toEqual(mockResponse);
        });

        it('should fetch notifications with only limit specified', async () => {
            const mockResponse = {
                notifications: [],
                total: 0,
                limit: 5,
                offset: 0,
            };
            axiosInstance.get.mockResolvedValue({ data: mockResponse });

            const result = await getNotifications(5);

            expect(axiosInstance.get).toHaveBeenCalledWith('/notifications?limit=5&offset=0');
            expect(result).toEqual(mockResponse);
        });

        it('should propagate errors', async () => {
            const error = new Error('Failed to fetch notifications');
            axiosInstance.get.mockRejectedValue(error);

            await expect(getNotifications()).rejects.toThrow('Failed to fetch notifications');
        });
    });

    describe('getUnreadCount', () => {
        it('should fetch unread notification count', async () => {
            const mockResponse = { count: 5 };
            axiosInstance.get.mockResolvedValue({ data: mockResponse });

            const result = await getUnreadCount();

            expect(axiosInstance.get).toHaveBeenCalledWith('/notifications/unread-count');
            expect(result).toEqual(mockResponse);
        });

        it('should return zero count', async () => {
            const mockResponse = { count: 0 };
            axiosInstance.get.mockResolvedValue({ data: mockResponse });

            const result = await getUnreadCount();

            expect(result).toEqual({ count: 0 });
        });

        it('should propagate errors', async () => {
            const error = new Error('Failed to fetch count');
            axiosInstance.get.mockRejectedValue(error);

            await expect(getUnreadCount()).rejects.toThrow('Failed to fetch count');
        });
    });

    describe('markAsRead', () => {
        it('should mark a notification as read', async () => {
            const notificationId = 123;
            const mockResponse = { message: 'Notification marked as read' };
            axiosInstance.put.mockResolvedValue({ data: mockResponse });

            const result = await markAsRead(notificationId);

            expect(axiosInstance.put).toHaveBeenCalledWith('/notifications/123/read');
            expect(result).toEqual(mockResponse);
        });

        it('should propagate errors', async () => {
            const error = new Error('Notification not found');
            axiosInstance.put.mockRejectedValue(error);

            await expect(markAsRead(999)).rejects.toThrow('Notification not found');
        });
    });

    describe('markAllAsRead', () => {
        it('should mark all notifications as read', async () => {
            const mockResponse = { message: 'All notifications marked as read', count: 10 };
            axiosInstance.put.mockResolvedValue({ data: mockResponse });

            const result = await markAllAsRead();

            expect(axiosInstance.put).toHaveBeenCalledWith('/notifications/read-all');
            expect(result).toEqual(mockResponse);
        });

        it('should return zero count when no notifications to mark', async () => {
            const mockResponse = { message: 'All notifications marked as read', count: 0 };
            axiosInstance.put.mockResolvedValue({ data: mockResponse });

            const result = await markAllAsRead();

            expect(result).toEqual(mockResponse);
        });

        it('should propagate errors', async () => {
            const error = new Error('Failed to mark all as read');
            axiosInstance.put.mockRejectedValue(error);

            await expect(markAllAsRead()).rejects.toThrow('Failed to mark all as read');
        });
    });

    describe('deleteNotification', () => {
        it('should delete a notification', async () => {
            const notificationId = 456;
            const mockResponse = { message: 'Notification deleted' };
            axiosInstance.delete.mockResolvedValue({ data: mockResponse });

            const result = await deleteNotification(notificationId);

            expect(axiosInstance.delete).toHaveBeenCalledWith('/notifications/456');
            expect(result).toEqual(mockResponse);
        });

        it('should propagate errors', async () => {
            const error = new Error('Notification not found');
            axiosInstance.delete.mockRejectedValue(error);

            await expect(deleteNotification(999)).rejects.toThrow('Notification not found');
        });
    });
});
