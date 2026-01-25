import axiosInstance from '../axiosConfig';
import {
    createLeague,
    setActiveLeague,
    updateLeague,
    getLeagues,
    getActiveLeague,
    getLeagueDetails,
    getLeagueStats,
    searchLeagues,
    inviteToLeague,
    getSignupRequests,
    approveSignupRequest,
    rejectSignupRequest,
} from '../leaguesApi';

// Mock axiosInstance
jest.mock('../axiosConfig', () => ({
    __esModule: true,
    default: {
        get: jest.fn(),
        post: jest.fn(),
        put: jest.fn(),
    },
}));

describe('leaguesApi', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('createLeague', () => {
        it('should make a POST request to /leagues with league data', async () => {
            const leagueData = {
                name: 'Test League',
                description: 'A test league description',
                startDate: '2026-02-01',
                endDate: '2026-04-01',
            };
            const mockResponse = { data: { id: 1, ...leagueData } };
            axiosInstance.post.mockResolvedValue(mockResponse);

            const result = await createLeague(leagueData);

            expect(axiosInstance.post).toHaveBeenCalledTimes(1);
            expect(axiosInstance.post).toHaveBeenCalledWith('/leagues', leagueData);
            expect(result).toEqual(mockResponse.data);
        });

        it('should handle empty league data', async () => {
            const leagueData = {};
            const mockResponse = { data: { id: 1 } };
            axiosInstance.post.mockResolvedValue(mockResponse);

            const result = await createLeague(leagueData);

            expect(axiosInstance.post).toHaveBeenCalledWith('/leagues', leagueData);
            expect(result).toEqual(mockResponse.data);
        });

        it('should propagate errors from axios', async () => {
            const leagueData = { name: 'Test League' };
            const error = new Error('Network Error');
            axiosInstance.post.mockRejectedValue(error);

            await expect(createLeague(leagueData)).rejects.toThrow('Network Error');
            expect(axiosInstance.post).toHaveBeenCalledWith('/leagues', leagueData);
        });
    });

    describe('setActiveLeague', () => {
        it('should make a PUT request to /leagues/active with league_id', async () => {
            const leagueId = 5;
            const mockResponse = { data: { success: true, activeLeagueId: leagueId } };
            axiosInstance.put.mockResolvedValue(mockResponse);

            const result = await setActiveLeague(leagueId);

            expect(axiosInstance.put).toHaveBeenCalledTimes(1);
            expect(axiosInstance.put).toHaveBeenCalledWith('/leagues/active', { league_id: leagueId });
            expect(result).toEqual(mockResponse.data);
        });

        it('should handle numeric string league id', async () => {
            const leagueId = '10';
            const mockResponse = { data: { success: true } };
            axiosInstance.put.mockResolvedValue(mockResponse);

            const result = await setActiveLeague(leagueId);

            expect(axiosInstance.put).toHaveBeenCalledWith('/leagues/active', { league_id: leagueId });
            expect(result).toEqual(mockResponse.data);
        });

        it('should propagate errors from axios', async () => {
            const leagueId = 1;
            const error = new Error('Forbidden');
            axiosInstance.put.mockRejectedValue(error);

            await expect(setActiveLeague(leagueId)).rejects.toThrow('Forbidden');
        });
    });

    describe('updateLeague', () => {
        it('should make a PUT request to /leagues/:id with league data', async () => {
            const leagueId = 3;
            const leagueData = {
                name: 'Updated League Name',
                description: 'Updated description',
            };
            const mockResponse = { data: { id: leagueId, ...leagueData } };
            axiosInstance.put.mockResolvedValue(mockResponse);

            const result = await updateLeague(leagueId, leagueData);

            expect(axiosInstance.put).toHaveBeenCalledTimes(1);
            expect(axiosInstance.put).toHaveBeenCalledWith(`/leagues/${leagueId}`, leagueData);
            expect(result).toEqual(mockResponse.data);
        });

        it('should handle partial update data', async () => {
            const leagueId = 7;
            const leagueData = { name: 'Only Name Updated' };
            const mockResponse = { data: { id: leagueId, name: 'Only Name Updated' } };
            axiosInstance.put.mockResolvedValue(mockResponse);

            const result = await updateLeague(leagueId, leagueData);

            expect(axiosInstance.put).toHaveBeenCalledWith('/leagues/7', leagueData);
            expect(result).toEqual(mockResponse.data);
        });

        it('should propagate errors from axios', async () => {
            const leagueId = 1;
            const leagueData = { name: 'Test' };
            const error = new Error('Not Found');
            axiosInstance.put.mockRejectedValue(error);

            await expect(updateLeague(leagueId, leagueData)).rejects.toThrow('Not Found');
        });
    });

    describe('getLeagues', () => {
        it('should make a GET request to /leagues', async () => {
            const mockLeagues = [
                { id: 1, name: 'League 1' },
                { id: 2, name: 'League 2' },
                { id: 3, name: 'League 3' },
            ];
            const mockResponse = { data: mockLeagues };
            axiosInstance.get.mockResolvedValue(mockResponse);

            const result = await getLeagues();

            expect(axiosInstance.get).toHaveBeenCalledTimes(1);
            expect(axiosInstance.get).toHaveBeenCalledWith('/leagues');
            expect(result).toEqual(mockLeagues);
        });

        it('should return empty array when no leagues exist', async () => {
            const mockResponse = { data: [] };
            axiosInstance.get.mockResolvedValue(mockResponse);

            const result = await getLeagues();

            expect(axiosInstance.get).toHaveBeenCalledWith('/leagues');
            expect(result).toEqual([]);
        });

        it('should propagate errors from axios', async () => {
            const error = new Error('Server Error');
            axiosInstance.get.mockRejectedValue(error);

            await expect(getLeagues()).rejects.toThrow('Server Error');
        });
    });

    describe('getActiveLeague', () => {
        it('should make a GET request to /leagues/active', async () => {
            const mockActiveLeague = {
                id: 5,
                name: 'Active League',
                isActive: true,
            };
            const mockResponse = { data: mockActiveLeague };
            axiosInstance.get.mockResolvedValue(mockResponse);

            const result = await getActiveLeague();

            expect(axiosInstance.get).toHaveBeenCalledTimes(1);
            expect(axiosInstance.get).toHaveBeenCalledWith('/leagues/active');
            expect(result).toEqual(mockActiveLeague);
        });

        it('should return null when no active league exists', async () => {
            const mockResponse = { data: null };
            axiosInstance.get.mockResolvedValue(mockResponse);

            const result = await getActiveLeague();

            expect(axiosInstance.get).toHaveBeenCalledWith('/leagues/active');
            expect(result).toBeNull();
        });

        it('should propagate errors from axios', async () => {
            const error = new Error('Unauthorized');
            axiosInstance.get.mockRejectedValue(error);

            await expect(getActiveLeague()).rejects.toThrow('Unauthorized');
        });
    });

    describe('getLeagueDetails', () => {
        it('should make a GET request to /leagues/:id', async () => {
            const leagueId = 10;
            const mockLeagueDetails = {
                id: leagueId,
                name: 'Detailed League',
                description: 'Full details',
                members: ['user1', 'user2'],
            };
            const mockResponse = { data: mockLeagueDetails };
            axiosInstance.get.mockResolvedValue(mockResponse);

            const result = await getLeagueDetails(leagueId);

            expect(axiosInstance.get).toHaveBeenCalledTimes(1);
            expect(axiosInstance.get).toHaveBeenCalledWith(`/leagues/${leagueId}`);
            expect(result).toEqual(mockLeagueDetails);
        });

        it('should handle string league id', async () => {
            const leagueId = '15';
            const mockResponse = { data: { id: 15, name: 'League' } };
            axiosInstance.get.mockResolvedValue(mockResponse);

            const result = await getLeagueDetails(leagueId);

            expect(axiosInstance.get).toHaveBeenCalledWith('/leagues/15');
            expect(result).toEqual(mockResponse.data);
        });

        it('should propagate errors from axios', async () => {
            const leagueId = 999;
            const error = new Error('League not found');
            axiosInstance.get.mockRejectedValue(error);

            await expect(getLeagueDetails(leagueId)).rejects.toThrow('League not found');
        });
    });

    describe('getLeagueStats', () => {
        it('should make a GET request to /leagues/:id/stats', async () => {
            const leagueId = 8;
            const mockStats = {
                totalGames: 50,
                averageScore: 75.5,
                leaderboard: [
                    { userId: 1, points: 100 },
                    { userId: 2, points: 85 },
                ],
            };
            const mockResponse = { data: mockStats };
            axiosInstance.get.mockResolvedValue(mockResponse);

            const result = await getLeagueStats(leagueId);

            expect(axiosInstance.get).toHaveBeenCalledTimes(1);
            expect(axiosInstance.get).toHaveBeenCalledWith(`/leagues/${leagueId}/stats`);
            expect(result).toEqual(mockStats);
        });

        it('should handle league with no stats', async () => {
            const leagueId = 1;
            const mockResponse = { data: { totalGames: 0, leaderboard: [] } };
            axiosInstance.get.mockResolvedValue(mockResponse);

            const result = await getLeagueStats(leagueId);

            expect(axiosInstance.get).toHaveBeenCalledWith('/leagues/1/stats');
            expect(result).toEqual({ totalGames: 0, leaderboard: [] });
        });

        it('should propagate errors from axios', async () => {
            const leagueId = 1;
            const error = new Error('Stats unavailable');
            axiosInstance.get.mockRejectedValue(error);

            await expect(getLeagueStats(leagueId)).rejects.toThrow('Stats unavailable');
        });
    });

    describe('searchLeagues', () => {
        it('should make a GET request to /leagues/search with query parameter', async () => {
            const searchQuery = 'competitive';
            const mockResults = [
                { id: 1, name: 'Competitive League' },
                { id: 5, name: 'Super Competitive' },
            ];
            const mockResponse = { data: mockResults };
            axiosInstance.get.mockResolvedValue(mockResponse);

            const result = await searchLeagues(searchQuery);

            expect(axiosInstance.get).toHaveBeenCalledTimes(1);
            expect(axiosInstance.get).toHaveBeenCalledWith('/leagues/search', {
                params: { query: searchQuery },
            });
            expect(result).toEqual(mockResults);
        });

        it('should handle empty search query', async () => {
            const searchQuery = '';
            const mockResponse = { data: [] };
            axiosInstance.get.mockResolvedValue(mockResponse);

            const result = await searchLeagues(searchQuery);

            expect(axiosInstance.get).toHaveBeenCalledWith('/leagues/search', {
                params: { query: '' },
            });
            expect(result).toEqual([]);
        });

        it('should handle search query with special characters', async () => {
            const searchQuery = 'test & league @2026';
            const mockResponse = { data: [] };
            axiosInstance.get.mockResolvedValue(mockResponse);

            const result = await searchLeagues(searchQuery);

            expect(axiosInstance.get).toHaveBeenCalledWith('/leagues/search', {
                params: { query: searchQuery },
            });
            expect(result).toEqual([]);
        });

        it('should return empty array when no matches found', async () => {
            const searchQuery = 'nonexistent';
            const mockResponse = { data: [] };
            axiosInstance.get.mockResolvedValue(mockResponse);

            const result = await searchLeagues(searchQuery);

            expect(result).toEqual([]);
        });

        it('should propagate errors from axios', async () => {
            const searchQuery = 'test';
            const error = new Error('Search failed');
            axiosInstance.get.mockRejectedValue(error);

            await expect(searchLeagues(searchQuery)).rejects.toThrow('Search failed');
        });
    });

    describe('inviteToLeague', () => {
        it('should make a POST request to /leagues/:id/invite with userId', async () => {
            const leagueId = 4;
            const userId = 25;
            const mockResponse = { data: { success: true, message: 'Invitation sent' } };
            axiosInstance.post.mockResolvedValue(mockResponse);

            const result = await inviteToLeague(leagueId, userId);

            expect(axiosInstance.post).toHaveBeenCalledTimes(1);
            expect(axiosInstance.post).toHaveBeenCalledWith(`/leagues/${leagueId}/invite`, { userId });
            expect(result).toEqual(mockResponse.data);
        });

        it('should handle string user id', async () => {
            const leagueId = 2;
            const userId = '30';
            const mockResponse = { data: { success: true } };
            axiosInstance.post.mockResolvedValue(mockResponse);

            const result = await inviteToLeague(leagueId, userId);

            expect(axiosInstance.post).toHaveBeenCalledWith('/leagues/2/invite', { userId: '30' });
            expect(result).toEqual(mockResponse.data);
        });

        it('should propagate errors from axios', async () => {
            const leagueId = 1;
            const userId = 1;
            const error = new Error('User already in league');
            axiosInstance.post.mockRejectedValue(error);

            await expect(inviteToLeague(leagueId, userId)).rejects.toThrow('User already in league');
        });
    });

    describe('getSignupRequests', () => {
        it('should make a GET request to /leagues/signup-requests', async () => {
            const mockRequests = [
                { id: 1, userId: 5, leagueId: 2, status: 'pending' },
                { id: 2, userId: 8, leagueId: 2, status: 'pending' },
            ];
            const mockResponse = { data: mockRequests };
            axiosInstance.get.mockResolvedValue(mockResponse);

            const result = await getSignupRequests();

            expect(axiosInstance.get).toHaveBeenCalledTimes(1);
            expect(axiosInstance.get).toHaveBeenCalledWith('/leagues/signup-requests');
            expect(result).toEqual(mockRequests);
        });

        it('should return empty array when no pending requests', async () => {
            const mockResponse = { data: [] };
            axiosInstance.get.mockResolvedValue(mockResponse);

            const result = await getSignupRequests();

            expect(axiosInstance.get).toHaveBeenCalledWith('/leagues/signup-requests');
            expect(result).toEqual([]);
        });

        it('should propagate errors from axios', async () => {
            const error = new Error('Access denied');
            axiosInstance.get.mockRejectedValue(error);

            await expect(getSignupRequests()).rejects.toThrow('Access denied');
        });
    });

    describe('approveSignupRequest', () => {
        it('should make a PUT request to /leagues/signup-requests/:id/approve', async () => {
            const requestId = 15;
            const mockResponse = { data: { success: true, message: 'Request approved' } };
            axiosInstance.put.mockResolvedValue(mockResponse);

            const result = await approveSignupRequest(requestId);

            expect(axiosInstance.put).toHaveBeenCalledTimes(1);
            expect(axiosInstance.put).toHaveBeenCalledWith(`/leagues/signup-requests/${requestId}/approve`);
            expect(result).toEqual(mockResponse.data);
        });

        it('should handle string request id', async () => {
            const requestId = '20';
            const mockResponse = { data: { success: true } };
            axiosInstance.put.mockResolvedValue(mockResponse);

            const result = await approveSignupRequest(requestId);

            expect(axiosInstance.put).toHaveBeenCalledWith('/leagues/signup-requests/20/approve');
            expect(result).toEqual(mockResponse.data);
        });

        it('should propagate errors from axios', async () => {
            const requestId = 1;
            const error = new Error('Request not found');
            axiosInstance.put.mockRejectedValue(error);

            await expect(approveSignupRequest(requestId)).rejects.toThrow('Request not found');
        });
    });

    describe('rejectSignupRequest', () => {
        it('should make a PUT request to /leagues/signup-requests/:id/reject', async () => {
            const requestId = 22;
            const mockResponse = { data: { success: true, message: 'Request rejected' } };
            axiosInstance.put.mockResolvedValue(mockResponse);

            const result = await rejectSignupRequest(requestId);

            expect(axiosInstance.put).toHaveBeenCalledTimes(1);
            expect(axiosInstance.put).toHaveBeenCalledWith(`/leagues/signup-requests/${requestId}/reject`);
            expect(result).toEqual(mockResponse.data);
        });

        it('should handle string request id', async () => {
            const requestId = '25';
            const mockResponse = { data: { success: true } };
            axiosInstance.put.mockResolvedValue(mockResponse);

            const result = await rejectSignupRequest(requestId);

            expect(axiosInstance.put).toHaveBeenCalledWith('/leagues/signup-requests/25/reject');
            expect(result).toEqual(mockResponse.data);
        });

        it('should propagate errors from axios', async () => {
            const requestId = 1;
            const error = new Error('Request already processed');
            axiosInstance.put.mockRejectedValue(error);

            await expect(rejectSignupRequest(requestId)).rejects.toThrow('Request already processed');
        });
    });
});
