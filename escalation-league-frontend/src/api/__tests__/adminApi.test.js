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
    getAllUsers,
    deactivateUser,
    activateUser,
    banUser,
    unbanUser,
    getUserDetails,
    resetUserPassword,
    getLeagueReport,
    getAllRoles,
    assignUserRole,
    getPendingRoleRequests,
    reviewRoleRequest,
} from '../adminApi';

describe('adminApi', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('getAllUsers', () => {
        it('should fetch all users successfully', async () => {
            const mockUsers = [
                { id: 1, username: 'user1' },
                { id: 2, username: 'user2' },
            ];
            axiosInstance.get.mockResolvedValue({ data: mockUsers });

            const result = await getAllUsers();

            expect(axiosInstance.get).toHaveBeenCalledWith('/admin/user/all');
            expect(result).toEqual(mockUsers);
        });

        it('should propagate errors', async () => {
            const error = new Error('Network error');
            axiosInstance.get.mockRejectedValue(error);

            await expect(getAllUsers()).rejects.toThrow('Network error');
        });
    });

    describe('deactivateUser', () => {
        it('should deactivate a user successfully', async () => {
            const userId = 123;
            const mockResponse = { message: 'User deactivated' };
            axiosInstance.put.mockResolvedValue({ data: mockResponse });

            const result = await deactivateUser(userId);

            expect(axiosInstance.put).toHaveBeenCalledWith('/admin/user/deactivate/123');
            expect(result).toEqual(mockResponse);
        });

        it('should propagate errors', async () => {
            const error = new Error('Failed to deactivate');
            axiosInstance.put.mockRejectedValue(error);

            await expect(deactivateUser(1)).rejects.toThrow('Failed to deactivate');
        });
    });

    describe('activateUser', () => {
        it('should activate a user successfully', async () => {
            const userId = 456;
            const mockResponse = { message: 'User activated' };
            axiosInstance.put.mockResolvedValue({ data: mockResponse });

            const result = await activateUser(userId);

            expect(axiosInstance.put).toHaveBeenCalledWith('/admin/user/activate/456');
            expect(result).toEqual(mockResponse);
        });

        it('should propagate errors', async () => {
            const error = new Error('Failed to activate');
            axiosInstance.put.mockRejectedValue(error);

            await expect(activateUser(1)).rejects.toThrow('Failed to activate');
        });
    });

    describe('banUser', () => {
        it('should ban a user with reason', async () => {
            const userId = 789;
            const banReason = 'Violated rules';
            const mockResponse = { message: 'User banned' };
            axiosInstance.put.mockResolvedValue({ data: mockResponse });

            const result = await banUser(userId, banReason);

            expect(axiosInstance.put).toHaveBeenCalledWith('/admin/user/ban/789', {
                ban_reason: banReason,
            });
            expect(result).toEqual(mockResponse);
        });

        it('should propagate errors', async () => {
            const error = new Error('Failed to ban');
            axiosInstance.put.mockRejectedValue(error);

            await expect(banUser(1, 'reason')).rejects.toThrow('Failed to ban');
        });
    });

    describe('unbanUser', () => {
        it('should unban a user successfully', async () => {
            const userId = 321;
            const mockResponse = { message: 'User unbanned' };
            axiosInstance.put.mockResolvedValue({ data: mockResponse });

            const result = await unbanUser(userId);

            expect(axiosInstance.put).toHaveBeenCalledWith('/admin/user/unban/321');
            expect(result).toEqual(mockResponse);
        });

        it('should propagate errors', async () => {
            const error = new Error('Failed to unban');
            axiosInstance.put.mockRejectedValue(error);

            await expect(unbanUser(1)).rejects.toThrow('Failed to unban');
        });
    });

    describe('getUserDetails', () => {
        it('should fetch user details successfully', async () => {
            const userId = 555;
            const mockUser = { id: 555, username: 'testuser', email: 'test@example.com' };
            axiosInstance.get.mockResolvedValue({ data: mockUser });

            const result = await getUserDetails(userId);

            expect(axiosInstance.get).toHaveBeenCalledWith('/admin/user/555');
            expect(result).toEqual(mockUser);
        });

        it('should propagate errors', async () => {
            const error = new Error('User not found');
            axiosInstance.get.mockRejectedValue(error);

            await expect(getUserDetails(999)).rejects.toThrow('User not found');
        });
    });

    describe('resetUserPassword', () => {
        it('should reset user password successfully', async () => {
            const userId = 111;
            const newPassword = 'newSecurePassword123';
            const mockResponse = { message: 'Password reset successfully' };
            axiosInstance.put.mockResolvedValue({ data: mockResponse });

            const result = await resetUserPassword(userId, newPassword);

            expect(axiosInstance.put).toHaveBeenCalledWith('/admin/user/reset-password/111', {
                newPassword,
            });
            expect(result).toEqual(mockResponse);
        });

        it('should propagate errors', async () => {
            const error = new Error('Failed to reset password');
            axiosInstance.put.mockRejectedValue(error);

            await expect(resetUserPassword(1, 'pass')).rejects.toThrow('Failed to reset password');
        });
    });

    describe('getLeagueReport', () => {
        it('should fetch league report successfully', async () => {
            const mockReport = {
                totalLeagues: 5,
                activeLeagues: 3,
                participants: 100,
            };
            axiosInstance.get.mockResolvedValue({ data: mockReport });

            const result = await getLeagueReport();

            expect(axiosInstance.get).toHaveBeenCalledWith('/admin/reports/leagues');
            expect(result).toEqual(mockReport);
        });

        it('should propagate errors', async () => {
            const error = new Error('Failed to fetch report');
            axiosInstance.get.mockRejectedValue(error);

            await expect(getLeagueReport()).rejects.toThrow('Failed to fetch report');
        });
    });

    describe('getAllRoles', () => {
        it('should fetch all roles successfully', async () => {
            const mockRoles = [
                { id: 1, name: 'admin' },
                { id: 2, name: 'user' },
            ];
            axiosInstance.get.mockResolvedValue({ data: { roles: mockRoles } });

            const result = await getAllRoles();

            expect(axiosInstance.get).toHaveBeenCalledWith('/admin/roles');
            expect(result).toEqual(mockRoles);
        });

        it('should propagate errors', async () => {
            const error = new Error('Failed to fetch roles');
            axiosInstance.get.mockRejectedValue(error);

            await expect(getAllRoles()).rejects.toThrow('Failed to fetch roles');
        });
    });

    describe('assignUserRole', () => {
        it('should assign role to user successfully', async () => {
            const userId = 222;
            const roleId = 3;
            const mockResponse = { message: 'Role assigned' };
            axiosInstance.put.mockResolvedValue({ data: mockResponse });

            const result = await assignUserRole(userId, roleId);

            expect(axiosInstance.put).toHaveBeenCalledWith('/admin/user/222/role', { roleId: 3 });
            expect(result).toEqual(mockResponse);
        });

        it('should propagate errors', async () => {
            const error = new Error('Failed to assign role');
            axiosInstance.put.mockRejectedValue(error);

            await expect(assignUserRole(1, 1)).rejects.toThrow('Failed to assign role');
        });
    });

    describe('getPendingRoleRequests', () => {
        it('should fetch pending role requests successfully', async () => {
            const mockRequests = [
                { id: 1, userId: 10, requestedRole: 'league_admin' },
                { id: 2, userId: 11, requestedRole: 'league_admin' },
            ];
            axiosInstance.get.mockResolvedValue({ data: mockRequests });

            const result = await getPendingRoleRequests();

            expect(axiosInstance.get).toHaveBeenCalledWith('/admin/role-requests');
            expect(result).toEqual(mockRequests);
        });

        it('should propagate errors', async () => {
            const error = new Error('Failed to fetch requests');
            axiosInstance.get.mockRejectedValue(error);

            await expect(getPendingRoleRequests()).rejects.toThrow('Failed to fetch requests');
        });
    });

    describe('reviewRoleRequest', () => {
        it('should review role request with comment', async () => {
            const requestId = 1;
            const status = 'approved';
            const adminComment = 'Approved for good standing';
            const mockResponse = { message: 'Request reviewed' };
            axiosInstance.post.mockResolvedValue({ data: mockResponse });

            const result = await reviewRoleRequest(requestId, status, adminComment);

            expect(axiosInstance.post).toHaveBeenCalledWith('/admin/role-requests/review', {
                requestId: 1,
                status: 'approved',
                adminComment: 'Approved for good standing',
            });
            expect(result).toEqual(mockResponse);
        });

        it('should review role request without comment (default empty string)', async () => {
            const requestId = 2;
            const status = 'rejected';
            const mockResponse = { message: 'Request reviewed' };
            axiosInstance.post.mockResolvedValue({ data: mockResponse });

            const result = await reviewRoleRequest(requestId, status);

            expect(axiosInstance.post).toHaveBeenCalledWith('/admin/role-requests/review', {
                requestId: 2,
                status: 'rejected',
                adminComment: '',
            });
            expect(result).toEqual(mockResponse);
        });

        it('should propagate errors', async () => {
            const error = new Error('Failed to review request');
            axiosInstance.post.mockRejectedValue(error);

            await expect(reviewRoleRequest(1, 'approved')).rejects.toThrow(
                'Failed to review request'
            );
        });
    });
});
