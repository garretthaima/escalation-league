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
    getUserProfile,
    updateUserProfile,
    deleteUserAccount,
    changePassword,
    updateUserStats,
    getUserPermissions,
    getUserSummary,
    getUserSetting,
    updateUserSetting,
    getDiscordAuthUrl,
    getDiscordStatus,
    unlinkDiscord,
    getGlobalLeaderboard,
} from '../usersApi';

describe('usersApi', () => {
    // Reset mocks before each test
    beforeEach(() => {
        jest.clearAllMocks();
        // Mock console.error to prevent noise in test output
        jest.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
        console.error.mockRestore();
    });

    describe('getUserProfile', () => {
        it('should make GET request to /users/profile', async () => {
            const mockProfile = { id: 1, username: 'testuser', email: 'test@example.com' };
            axiosInstance.get.mockResolvedValue({ data: mockProfile });

            const result = await getUserProfile();

            expect(axiosInstance.get).toHaveBeenCalledWith('/users/profile');
            expect(axiosInstance.get).toHaveBeenCalledTimes(1);
            expect(result).toEqual(mockProfile);
        });

        it('should throw error when request fails', async () => {
            const error = new Error('Network error');
            axiosInstance.get.mockRejectedValue(error);

            await expect(getUserProfile()).rejects.toThrow('Network error');
            expect(console.error).toHaveBeenCalledWith('Error fetching user profile:', error);
        });
    });

    describe('updateUserProfile', () => {
        it('should make PUT request to /users/update with profile data', async () => {
            const profileData = { username: 'newusername', email: 'new@example.com' };
            const mockResponse = { id: 1, ...profileData };
            axiosInstance.put.mockResolvedValue({ data: mockResponse });

            const result = await updateUserProfile(profileData);

            expect(axiosInstance.put).toHaveBeenCalledWith('/users/update', profileData);
            expect(axiosInstance.put).toHaveBeenCalledTimes(1);
            expect(result).toEqual(mockResponse);
        });

        it('should throw error when request fails', async () => {
            const error = new Error('Update failed');
            const profileData = { username: 'test' };
            axiosInstance.put.mockRejectedValue(error);

            await expect(updateUserProfile(profileData)).rejects.toThrow('Update failed');
            expect(console.error).toHaveBeenCalledWith('Error updating user profile:', error);
        });
    });

    describe('deleteUserAccount', () => {
        it('should make DELETE request to /users/delete', async () => {
            const mockResponse = { message: 'Account deleted successfully' };
            axiosInstance.delete.mockResolvedValue({ data: mockResponse });

            const result = await deleteUserAccount();

            expect(axiosInstance.delete).toHaveBeenCalledWith('/users/delete');
            expect(axiosInstance.delete).toHaveBeenCalledTimes(1);
            expect(result).toEqual(mockResponse);
        });

        it('should throw error when request fails', async () => {
            const error = new Error('Delete failed');
            axiosInstance.delete.mockRejectedValue(error);

            await expect(deleteUserAccount()).rejects.toThrow('Delete failed');
            expect(console.error).toHaveBeenCalledWith('Error deleting user account:', error);
        });
    });

    describe('changePassword', () => {
        it('should make PUT request to /users/change-password with password data', async () => {
            const passwordData = { currentPassword: 'old123', newPassword: 'new456' };
            const mockResponse = { message: 'Password changed successfully' };
            axiosInstance.put.mockResolvedValue({ data: mockResponse });

            const result = await changePassword(passwordData);

            expect(axiosInstance.put).toHaveBeenCalledWith('/users/change-password', passwordData);
            expect(axiosInstance.put).toHaveBeenCalledTimes(1);
            expect(result).toEqual(mockResponse);
        });

        it('should throw error when request fails', async () => {
            const error = new Error('Password change failed');
            const passwordData = { currentPassword: 'old', newPassword: 'new' };
            axiosInstance.put.mockRejectedValue(error);

            await expect(changePassword(passwordData)).rejects.toThrow('Password change failed');
            expect(console.error).toHaveBeenCalledWith('Error changing password:', error);
        });
    });

    describe('updateUserStats', () => {
        it('should make PUT request to /users/update-stats with stats data', async () => {
            const statsData = { wins: 10, losses: 5, elo: 1500 };
            const mockResponse = { ...statsData, updated: true };
            axiosInstance.put.mockResolvedValue({ data: mockResponse });

            const result = await updateUserStats(statsData);

            expect(axiosInstance.put).toHaveBeenCalledWith('/users/update-stats', statsData);
            expect(axiosInstance.put).toHaveBeenCalledTimes(1);
            expect(result).toEqual(mockResponse);
        });

        it('should throw error when request fails', async () => {
            const error = new Error('Stats update failed');
            const statsData = { wins: 10 };
            axiosInstance.put.mockRejectedValue(error);

            await expect(updateUserStats(statsData)).rejects.toThrow('Stats update failed');
            expect(console.error).toHaveBeenCalledWith('Error updating user stats:', error);
        });
    });

    describe('getUserPermissions', () => {
        it('should make GET request to /users/permissions', async () => {
            const mockPermissions = { isAdmin: true, canManageLeagues: true };
            axiosInstance.get.mockResolvedValue({ data: mockPermissions });

            const result = await getUserPermissions();

            expect(axiosInstance.get).toHaveBeenCalledWith('/users/permissions');
            expect(axiosInstance.get).toHaveBeenCalledTimes(1);
            expect(result).toEqual(mockPermissions);
        });

        it('should throw error when request fails', async () => {
            const error = new Error('Permissions fetch failed');
            axiosInstance.get.mockRejectedValue(error);

            await expect(getUserPermissions()).rejects.toThrow('Permissions fetch failed');
            expect(console.error).toHaveBeenCalledWith('Error fetching user permissions:', error);
        });
    });

    describe('getUserSummary', () => {
        it('should make GET request to /users/profile/:userId', async () => {
            const userId = 123;
            const mockSummary = { id: userId, username: 'testuser', elo: 1500 };
            axiosInstance.get.mockResolvedValue({ data: mockSummary });

            const result = await getUserSummary(userId);

            expect(axiosInstance.get).toHaveBeenCalledWith(`/users/profile/${userId}`);
            expect(axiosInstance.get).toHaveBeenCalledTimes(1);
            expect(result).toEqual(mockSummary);
        });

        it('should handle different user IDs correctly', async () => {
            const userId = 456;
            const mockSummary = { id: userId, username: 'anotheruser' };
            axiosInstance.get.mockResolvedValue({ data: mockSummary });

            const result = await getUserSummary(userId);

            expect(axiosInstance.get).toHaveBeenCalledWith('/users/profile/456');
            expect(result).toEqual(mockSummary);
        });

        it('should throw error when request fails', async () => {
            const userId = 999;
            const error = new Error('User not found');
            axiosInstance.get.mockRejectedValue(error);

            await expect(getUserSummary(userId)).rejects.toThrow('User not found');
            expect(console.error).toHaveBeenCalledWith(`Error fetching user summary for user ID ${userId}:`, error);
        });
    });

    describe('getUserSetting', () => {
        it('should make GET request to /users/settings with key_name param', async () => {
            const keyName = 'theme';
            const mockSetting = { key_name: 'theme', value: 'dark' };
            axiosInstance.get.mockResolvedValue({ data: mockSetting });

            const result = await getUserSetting(keyName);

            expect(axiosInstance.get).toHaveBeenCalledWith('/users/settings', {
                params: { key_name: keyName },
            });
            expect(axiosInstance.get).toHaveBeenCalledTimes(1);
            expect(result).toEqual(mockSetting);
        });

        it('should handle different setting keys', async () => {
            const keyName = 'notifications_enabled';
            const mockSetting = { key_name: 'notifications_enabled', value: 'true' };
            axiosInstance.get.mockResolvedValue({ data: mockSetting });

            const result = await getUserSetting(keyName);

            expect(axiosInstance.get).toHaveBeenCalledWith('/users/settings', {
                params: { key_name: 'notifications_enabled' },
            });
            expect(result).toEqual(mockSetting);
        });

        it('should throw error when request fails', async () => {
            const keyName = 'invalid_setting';
            const error = new Error('Setting not found');
            axiosInstance.get.mockRejectedValue(error);

            await expect(getUserSetting(keyName)).rejects.toThrow('Setting not found');
            expect(console.error).toHaveBeenCalledWith(`Error fetching user setting "${keyName}":`, error);
        });
    });

    describe('updateUserSetting', () => {
        it('should make PUT request to /users/settings with key_name and value', async () => {
            const keyName = 'theme';
            const value = 'light';
            const mockResponse = { success: true, message: 'Setting updated' };
            axiosInstance.put.mockResolvedValue({ data: mockResponse });

            const result = await updateUserSetting(keyName, value);

            expect(axiosInstance.put).toHaveBeenCalledWith('/users/settings', {
                key_name: keyName,
                value: value,
            });
            expect(axiosInstance.put).toHaveBeenCalledTimes(1);
            expect(result).toEqual(mockResponse);
        });

        it('should handle boolean-like values', async () => {
            const keyName = 'notifications_enabled';
            const value = 'false';
            const mockResponse = { success: true };
            axiosInstance.put.mockResolvedValue({ data: mockResponse });

            const result = await updateUserSetting(keyName, value);

            expect(axiosInstance.put).toHaveBeenCalledWith('/users/settings', {
                key_name: 'notifications_enabled',
                value: 'false',
            });
            expect(result).toEqual(mockResponse);
        });

        it('should throw error when request fails', async () => {
            const keyName = 'theme';
            const value = 'invalid';
            const error = new Error('Update failed');
            axiosInstance.put.mockRejectedValue(error);

            await expect(updateUserSetting(keyName, value)).rejects.toThrow('Update failed');
            expect(console.error).toHaveBeenCalledWith(`Error updating user setting "${keyName}":`, error);
        });
    });

    describe('getDiscordAuthUrl', () => {
        it('should make GET request to /auth/discord/url', async () => {
            const mockResponse = { url: 'https://discord.com/oauth2/authorize?client_id=123' };
            axiosInstance.get.mockResolvedValue({ data: mockResponse });

            const result = await getDiscordAuthUrl();

            expect(axiosInstance.get).toHaveBeenCalledWith('/auth/discord/url');
            expect(axiosInstance.get).toHaveBeenCalledTimes(1);
            expect(result).toEqual(mockResponse);
        });

        it('should throw error when request fails', async () => {
            const error = new Error('Failed to get Discord auth URL');
            axiosInstance.get.mockRejectedValue(error);

            await expect(getDiscordAuthUrl()).rejects.toThrow('Failed to get Discord auth URL');
            expect(console.error).toHaveBeenCalledWith('Error getting Discord auth URL:', error);
        });
    });

    describe('getDiscordStatus', () => {
        it('should make GET request to /auth/discord/status', async () => {
            const mockResponse = { linked: true, discord_username: 'user#1234', discord_avatar: 'avatar_url' };
            axiosInstance.get.mockResolvedValue({ data: mockResponse });

            const result = await getDiscordStatus();

            expect(axiosInstance.get).toHaveBeenCalledWith('/auth/discord/status');
            expect(axiosInstance.get).toHaveBeenCalledTimes(1);
            expect(result).toEqual(mockResponse);
        });

        it('should return unlinked status', async () => {
            const mockResponse = { linked: false, discord_username: null, discord_avatar: null };
            axiosInstance.get.mockResolvedValue({ data: mockResponse });

            const result = await getDiscordStatus();

            expect(result).toEqual(mockResponse);
            expect(result.linked).toBe(false);
        });

        it('should throw error when request fails', async () => {
            const error = new Error('Failed to get Discord status');
            axiosInstance.get.mockRejectedValue(error);

            await expect(getDiscordStatus()).rejects.toThrow('Failed to get Discord status');
            expect(console.error).toHaveBeenCalledWith('Error getting Discord status:', error);
        });
    });

    describe('unlinkDiscord', () => {
        it('should make DELETE request to /auth/discord/unlink', async () => {
            const mockResponse = { success: true, message: 'Discord unlinked successfully' };
            axiosInstance.delete.mockResolvedValue({ data: mockResponse });

            const result = await unlinkDiscord();

            expect(axiosInstance.delete).toHaveBeenCalledWith('/auth/discord/unlink');
            expect(axiosInstance.delete).toHaveBeenCalledTimes(1);
            expect(result).toEqual(mockResponse);
        });

        it('should throw error when request fails', async () => {
            const error = new Error('Failed to unlink Discord');
            axiosInstance.delete.mockRejectedValue(error);

            await expect(unlinkDiscord()).rejects.toThrow('Failed to unlink Discord');
            expect(console.error).toHaveBeenCalledWith('Error unlinking Discord:', error);
        });
    });

    describe('getGlobalLeaderboard', () => {
        it('should make GET request to /users/leaderboard', async () => {
            const mockResponse = {
                leaderboard: [
                    { id: 1, username: 'player1', elo: 1800 },
                    { id: 2, username: 'player2', elo: 1600 },
                    { id: 3, username: 'player3', elo: 1400 },
                ],
            };
            axiosInstance.get.mockResolvedValue({ data: mockResponse });

            const result = await getGlobalLeaderboard();

            expect(axiosInstance.get).toHaveBeenCalledWith('/users/leaderboard');
            expect(axiosInstance.get).toHaveBeenCalledTimes(1);
            expect(result).toEqual(mockResponse);
        });

        it('should return empty leaderboard', async () => {
            const mockResponse = { leaderboard: [] };
            axiosInstance.get.mockResolvedValue({ data: mockResponse });

            const result = await getGlobalLeaderboard();

            expect(result).toEqual(mockResponse);
            expect(result.leaderboard).toHaveLength(0);
        });

        it('should throw error when request fails', async () => {
            const error = new Error('Failed to fetch leaderboard');
            axiosInstance.get.mockRejectedValue(error);

            await expect(getGlobalLeaderboard()).rejects.toThrow('Failed to fetch leaderboard');
            expect(console.error).toHaveBeenCalledWith('Error fetching global leaderboard:', error);
        });
    });
});
