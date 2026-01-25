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
    getActivityLogs,
    getMyActivityLogs,
    getUserActivityLogs,
    getActionTypes,
} from '../activityLogsApi';

describe('activityLogsApi', () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    beforeEach(() => {
        jest.clearAllMocks();
    });

    afterAll(() => {
        consoleErrorSpy.mockRestore();
    });

    describe('getActivityLogs', () => {
        it('should fetch all activity logs with default params', async () => {
            const mockResponse = {
                logs: [
                    { id: 1, action: 'login', userId: 100 },
                    { id: 2, action: 'signup', userId: 101 },
                ],
                total: 100,
                page: 1,
                limit: 50,
            };
            axiosInstance.get.mockResolvedValue({ data: mockResponse });

            const result = await getActivityLogs();

            expect(axiosInstance.get).toHaveBeenCalledWith('/activity-logs', { params: {} });
            expect(result).toEqual(mockResponse);
        });

        it('should fetch activity logs with pagination params', async () => {
            const params = { page: 2, limit: 25 };
            const mockResponse = {
                logs: [{ id: 3, action: 'game_completed', userId: 102 }],
                total: 100,
                page: 2,
                limit: 25,
            };
            axiosInstance.get.mockResolvedValue({ data: mockResponse });

            const result = await getActivityLogs(params);

            expect(axiosInstance.get).toHaveBeenCalledWith('/activity-logs', { params });
            expect(result).toEqual(mockResponse);
        });

        it('should fetch activity logs with action filter', async () => {
            const params = { action: 'login' };
            const mockResponse = {
                logs: [{ id: 1, action: 'login', userId: 100 }],
                total: 50,
            };
            axiosInstance.get.mockResolvedValue({ data: mockResponse });

            const result = await getActivityLogs(params);

            expect(axiosInstance.get).toHaveBeenCalledWith('/activity-logs', { params });
            expect(result).toEqual(mockResponse);
        });

        it('should fetch activity logs with userId filter', async () => {
            const params = { userId: 100 };
            const mockResponse = {
                logs: [{ id: 1, action: 'login', userId: 100 }],
                total: 10,
            };
            axiosInstance.get.mockResolvedValue({ data: mockResponse });

            const result = await getActivityLogs(params);

            expect(axiosInstance.get).toHaveBeenCalledWith('/activity-logs', { params });
            expect(result).toEqual(mockResponse);
        });

        it('should fetch activity logs with date range filter', async () => {
            const params = { startDate: '2025-01-01', endDate: '2025-01-31' };
            const mockResponse = {
                logs: [{ id: 1, action: 'login', createdAt: '2025-01-15' }],
                total: 20,
            };
            axiosInstance.get.mockResolvedValue({ data: mockResponse });

            const result = await getActivityLogs(params);

            expect(axiosInstance.get).toHaveBeenCalledWith('/activity-logs', { params });
            expect(result).toEqual(mockResponse);
        });

        it('should fetch activity logs with all filters combined', async () => {
            const params = {
                page: 1,
                limit: 50,
                action: 'game_completed',
                userId: 100,
                startDate: '2025-01-01',
                endDate: '2025-01-31',
            };
            const mockResponse = { logs: [], total: 0 };
            axiosInstance.get.mockResolvedValue({ data: mockResponse });

            const result = await getActivityLogs(params);

            expect(axiosInstance.get).toHaveBeenCalledWith('/activity-logs', { params });
            expect(result).toEqual(mockResponse);
        });

        it('should log error and rethrow on failure', async () => {
            const error = new Error('Failed to fetch');
            axiosInstance.get.mockRejectedValue(error);

            await expect(getActivityLogs()).rejects.toThrow('Failed to fetch');
            expect(consoleErrorSpy).toHaveBeenCalledWith(
                'Error fetching activity logs:',
                error
            );
        });
    });

    describe('getMyActivityLogs', () => {
        it('should fetch current user activity logs with default params', async () => {
            const mockResponse = {
                logs: [
                    { id: 1, action: 'login' },
                    { id: 2, action: 'profile_update' },
                ],
                total: 50,
                page: 1,
                limit: 20,
            };
            axiosInstance.get.mockResolvedValue({ data: mockResponse });

            const result = await getMyActivityLogs();

            expect(axiosInstance.get).toHaveBeenCalledWith('/activity-logs/me', { params: {} });
            expect(result).toEqual(mockResponse);
        });

        it('should fetch current user activity logs with pagination params', async () => {
            const params = { page: 3, limit: 10 };
            const mockResponse = {
                logs: [{ id: 5, action: 'deck_update' }],
                total: 50,
                page: 3,
                limit: 10,
            };
            axiosInstance.get.mockResolvedValue({ data: mockResponse });

            const result = await getMyActivityLogs(params);

            expect(axiosInstance.get).toHaveBeenCalledWith('/activity-logs/me', { params });
            expect(result).toEqual(mockResponse);
        });

        it('should log error and rethrow on failure', async () => {
            const error = new Error('Unauthorized');
            axiosInstance.get.mockRejectedValue(error);

            await expect(getMyActivityLogs()).rejects.toThrow('Unauthorized');
            expect(consoleErrorSpy).toHaveBeenCalledWith(
                'Error fetching user activity logs:',
                error
            );
        });
    });

    describe('getUserActivityLogs', () => {
        it('should fetch specific user activity logs with default params', async () => {
            const userId = 100;
            const mockResponse = {
                logs: [
                    { id: 1, action: 'signup', userId: 100 },
                    { id: 2, action: 'login', userId: 100 },
                ],
                total: 25,
                page: 1,
                limit: 50,
                user: { id: 100, username: 'testuser' },
            };
            axiosInstance.get.mockResolvedValue({ data: mockResponse });

            const result = await getUserActivityLogs(userId);

            expect(axiosInstance.get).toHaveBeenCalledWith('/activity-logs/user/100', {
                params: {},
            });
            expect(result).toEqual(mockResponse);
        });

        it('should fetch specific user activity logs with pagination params', async () => {
            const userId = 200;
            const params = { page: 2, limit: 25 };
            const mockResponse = {
                logs: [{ id: 10, action: 'game_completed', userId: 200 }],
                total: 30,
                page: 2,
                limit: 25,
            };
            axiosInstance.get.mockResolvedValue({ data: mockResponse });

            const result = await getUserActivityLogs(userId, params);

            expect(axiosInstance.get).toHaveBeenCalledWith('/activity-logs/user/200', { params });
            expect(result).toEqual(mockResponse);
        });

        it('should log error and rethrow on failure', async () => {
            const error = new Error('User not found');
            axiosInstance.get.mockRejectedValue(error);

            await expect(getUserActivityLogs(999)).rejects.toThrow('User not found');
            expect(consoleErrorSpy).toHaveBeenCalledWith(
                'Error fetching user activity logs:',
                error
            );
        });
    });

    describe('getActionTypes', () => {
        it('should fetch all action types successfully', async () => {
            const mockResponse = {
                actionTypes: [
                    'login',
                    'logout',
                    'signup',
                    'profile_update',
                    'game_completed',
                    'deck_update',
                ],
            };
            axiosInstance.get.mockResolvedValue({ data: mockResponse });

            const result = await getActionTypes();

            expect(axiosInstance.get).toHaveBeenCalledWith('/activity-logs/action-types');
            expect(result).toEqual(mockResponse);
        });

        it('should return empty array when no action types', async () => {
            const mockResponse = { actionTypes: [] };
            axiosInstance.get.mockResolvedValue({ data: mockResponse });

            const result = await getActionTypes();

            expect(result).toEqual(mockResponse);
        });

        it('should log error and rethrow on failure', async () => {
            const error = new Error('Failed to fetch action types');
            axiosInstance.get.mockRejectedValue(error);

            await expect(getActionTypes()).rejects.toThrow('Failed to fetch action types');
            expect(consoleErrorSpy).toHaveBeenCalledWith(
                'Error fetching action types:',
                error
            );
        });
    });
});
