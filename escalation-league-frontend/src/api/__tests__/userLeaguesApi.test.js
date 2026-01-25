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
    signUpForLeague,
    getUserLeagueStats,
    updateUserLeagueData,
    leaveLeague,
    getLeagueParticipants,
    getLeagueParticipantsDetails,
    updateLeagueStats,
    submitSignupRequest,
    getUserPendingSignupRequests,
    isUserInLeague,
    requestSignupForLeague,
    updateParticipantStatus,
    getOpponentMatchups,
    getTurnOrderStats,
} from '../userLeaguesApi';

describe('userLeaguesApi', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('signUpForLeague', () => {
        it('should sign up for a league successfully', async () => {
            const leagueId = 1;
            const mockResponse = {
                message: 'Successfully signed up',
                leagueId: 1,
                userId: 100,
            };
            axiosInstance.post.mockResolvedValue({ data: mockResponse });

            const result = await signUpForLeague(leagueId);

            expect(axiosInstance.post).toHaveBeenCalledWith('/user-leagues/signup', {
                league_id: 1,
            });
            expect(result).toEqual(mockResponse);
        });

        it('should propagate errors', async () => {
            const error = new Error('Already signed up');
            axiosInstance.post.mockRejectedValue(error);

            await expect(signUpForLeague(1)).rejects.toThrow('Already signed up');
        });
    });

    describe('getUserLeagueStats', () => {
        it('should fetch user league stats successfully', async () => {
            const leagueId = 1;
            const mockStats = {
                wins: 5,
                losses: 3,
                gamesPlayed: 8,
                points: 15,
            };
            axiosInstance.get.mockResolvedValue({ data: mockStats });

            const result = await getUserLeagueStats(leagueId);

            expect(axiosInstance.get).toHaveBeenCalledWith('/user-leagues/1');
            expect(result).toEqual(mockStats);
        });

        it('should propagate errors', async () => {
            const error = new Error('Not in league');
            axiosInstance.get.mockRejectedValue(error);

            await expect(getUserLeagueStats(999)).rejects.toThrow('Not in league');
        });
    });

    describe('updateUserLeagueData', () => {
        it('should update user league data successfully', async () => {
            const leagueId = 1;
            const updates = { commander: 'Kenrith', deckUrl: 'https://moxfield.com/decks/abc' };
            const mockResponse = { ...updates, updated: true };
            axiosInstance.put.mockResolvedValue({ data: mockResponse });

            const result = await updateUserLeagueData(leagueId, updates);

            expect(axiosInstance.put).toHaveBeenCalledWith('/user-leagues/1', updates);
            expect(result).toEqual(mockResponse);
        });

        it('should propagate errors', async () => {
            const error = new Error('Failed to update');
            axiosInstance.put.mockRejectedValue(error);

            await expect(updateUserLeagueData(1, {})).rejects.toThrow('Failed to update');
        });
    });

    describe('leaveLeague', () => {
        it('should leave a league successfully', async () => {
            const leagueId = 1;
            const mockResponse = { message: 'Left league successfully' };
            axiosInstance.delete.mockResolvedValue({ data: mockResponse });

            const result = await leaveLeague(leagueId);

            expect(axiosInstance.delete).toHaveBeenCalledWith('/user-leagues/1');
            expect(result).toEqual(mockResponse);
        });

        it('should propagate errors', async () => {
            const error = new Error('Cannot leave active league');
            axiosInstance.delete.mockRejectedValue(error);

            await expect(leaveLeague(1)).rejects.toThrow('Cannot leave active league');
        });
    });

    describe('getLeagueParticipants', () => {
        it('should fetch league participants successfully', async () => {
            const leagueId = 1;
            const mockParticipants = [
                { id: 1, username: 'player1', wins: 5 },
                { id: 2, username: 'player2', wins: 3 },
            ];
            axiosInstance.get.mockResolvedValue({ data: mockParticipants });

            const result = await getLeagueParticipants(leagueId);

            expect(axiosInstance.get).toHaveBeenCalledWith('/user-leagues/1/participants');
            expect(result).toEqual(mockParticipants);
        });

        it('should propagate errors', async () => {
            const error = new Error('Not authorized');
            axiosInstance.get.mockRejectedValue(error);

            await expect(getLeagueParticipants(1)).rejects.toThrow('Not authorized');
        });
    });

    describe('getLeagueParticipantsDetails', () => {
        it('should fetch participant details successfully', async () => {
            const leagueId = 1;
            const userId = 100;
            const mockDetails = {
                id: 100,
                username: 'player1',
                commander: 'Kenrith',
                wins: 5,
                losses: 3,
            };
            axiosInstance.get.mockResolvedValue({ data: mockDetails });

            const result = await getLeagueParticipantsDetails(leagueId, userId);

            expect(axiosInstance.get).toHaveBeenCalledWith('/user-leagues/1/participants/100');
            expect(result).toEqual(mockDetails);
        });

        it('should propagate errors', async () => {
            const error = new Error('Participant not found');
            axiosInstance.get.mockRejectedValue(error);

            await expect(getLeagueParticipantsDetails(1, 999)).rejects.toThrow(
                'Participant not found'
            );
        });
    });

    describe('updateLeagueStats', () => {
        it('should update league stats successfully', async () => {
            const data = { leagueId: 1, userId: 100, wins: 6, losses: 3 };
            const mockResponse = { message: 'Stats updated', ...data };
            axiosInstance.put.mockResolvedValue({ data: mockResponse });

            const result = await updateLeagueStats(data);

            expect(axiosInstance.put).toHaveBeenCalledWith('/user-leagues/update-league-stats', data);
            expect(result).toEqual(mockResponse);
        });

        it('should propagate errors', async () => {
            const error = new Error('Failed to update stats');
            axiosInstance.put.mockRejectedValue(error);

            await expect(updateLeagueStats({})).rejects.toThrow('Failed to update stats');
        });
    });

    describe('submitSignupRequest', () => {
        it('should submit signup request successfully', async () => {
            const leagueId = 1;
            const mockResponse = { message: 'Request submitted', requestId: 123 };
            axiosInstance.post.mockResolvedValue({ data: mockResponse });

            const result = await submitSignupRequest(leagueId);

            expect(axiosInstance.post).toHaveBeenCalledWith('/user-leagues/signup-request', {
                leagueId: 1,
            });
            expect(result).toEqual(mockResponse);
        });

        it('should propagate errors', async () => {
            const error = new Error('Request already pending');
            axiosInstance.post.mockRejectedValue(error);

            await expect(submitSignupRequest(1)).rejects.toThrow('Request already pending');
        });
    });

    describe('getUserPendingSignupRequests', () => {
        it('should fetch user pending signup requests successfully', async () => {
            const mockRequests = [
                { id: 1, leagueId: 1, status: 'pending' },
                { id: 2, leagueId: 2, status: 'pending' },
            ];
            axiosInstance.get.mockResolvedValue({ data: mockRequests });

            const result = await getUserPendingSignupRequests();

            expect(axiosInstance.get).toHaveBeenCalledWith('/user-leagues/signup-request', {});
            expect(result).toEqual(mockRequests);
        });

        it('should return empty array when no pending requests', async () => {
            axiosInstance.get.mockResolvedValue({ data: [] });

            const result = await getUserPendingSignupRequests();

            expect(result).toEqual([]);
        });

        it('should propagate errors', async () => {
            const error = new Error('Failed to fetch requests');
            axiosInstance.get.mockRejectedValue(error);

            await expect(getUserPendingSignupRequests()).rejects.toThrow(
                'Failed to fetch requests'
            );
        });
    });

    describe('isUserInLeague', () => {
        it('should return true when user is in a league', async () => {
            const mockResponse = { inLeague: true, leagueId: 1 };
            axiosInstance.get.mockResolvedValue({ data: mockResponse });

            const result = await isUserInLeague();

            expect(axiosInstance.get).toHaveBeenCalledWith('/user-leagues/in-league');
            expect(result).toEqual(mockResponse);
        });

        it('should return false when user is not in a league', async () => {
            const mockResponse = { inLeague: false };
            axiosInstance.get.mockResolvedValue({ data: mockResponse });

            const result = await isUserInLeague();

            expect(result).toEqual(mockResponse);
        });

        it('should propagate errors', async () => {
            const error = new Error('Failed to check');
            axiosInstance.get.mockRejectedValue(error);

            await expect(isUserInLeague()).rejects.toThrow('Failed to check');
        });
    });

    describe('requestSignupForLeague', () => {
        it('should request signup for a league successfully', async () => {
            const data = { leagueId: 1, commander: 'Kenrith' };
            const mockResponse = { message: 'Request submitted' };
            axiosInstance.post.mockResolvedValue({ data: mockResponse });

            const result = await requestSignupForLeague(data);

            expect(axiosInstance.post).toHaveBeenCalledWith('/user-leagues/signup-request', {
                data,
            });
            expect(result).toEqual(mockResponse);
        });

        it('should propagate errors', async () => {
            const error = new Error('Invalid request');
            axiosInstance.post.mockRejectedValue(error);

            await expect(requestSignupForLeague({})).rejects.toThrow('Invalid request');
        });
    });

    describe('updateParticipantStatus', () => {
        it('should update participant status successfully', async () => {
            const leagueId = 1;
            const userId = 100;
            const updates = { active: false, disqualified: true };
            const mockResponse = { message: 'Status updated', ...updates };
            axiosInstance.put.mockResolvedValue({ data: mockResponse });

            const result = await updateParticipantStatus(leagueId, userId, updates);

            expect(axiosInstance.put).toHaveBeenCalledWith('/user-leagues/1/participants/100', updates);
            expect(result).toEqual(mockResponse);
        });

        it('should activate a participant', async () => {
            const leagueId = 2;
            const userId = 101;
            const updates = { active: true };
            const mockResponse = { active: true };
            axiosInstance.put.mockResolvedValue({ data: mockResponse });

            const result = await updateParticipantStatus(leagueId, userId, updates);

            expect(axiosInstance.put).toHaveBeenCalledWith('/user-leagues/2/participants/101', updates);
            expect(result).toEqual(mockResponse);
        });

        it('should propagate errors', async () => {
            const error = new Error('Failed to update status');
            axiosInstance.put.mockRejectedValue(error);

            await expect(updateParticipantStatus(1, 1, {})).rejects.toThrow(
                'Failed to update status'
            );
        });
    });

    describe('getOpponentMatchups', () => {
        it('should fetch opponent matchups successfully', async () => {
            const leagueId = 1;
            const userId = 100;
            const mockMatchups = {
                nemesis: { userId: 101, username: 'player2', losses: 3 },
                victim: { userId: 102, username: 'player3', wins: 4 },
            };
            axiosInstance.get.mockResolvedValue({ data: mockMatchups });

            const result = await getOpponentMatchups(leagueId, userId);

            expect(axiosInstance.get).toHaveBeenCalledWith('/user-leagues/1/participants/100/matchups');
            expect(result).toEqual(mockMatchups);
        });

        it('should return empty matchups when no data', async () => {
            const mockMatchups = { nemesis: null, victim: null };
            axiosInstance.get.mockResolvedValue({ data: mockMatchups });

            const result = await getOpponentMatchups(1, 100);

            expect(result).toEqual(mockMatchups);
        });

        it('should propagate errors', async () => {
            const error = new Error('Failed to fetch matchups');
            axiosInstance.get.mockRejectedValue(error);

            await expect(getOpponentMatchups(1, 100)).rejects.toThrow('Failed to fetch matchups');
        });
    });

    describe('getTurnOrderStats', () => {
        it('should fetch turn order stats successfully', async () => {
            const leagueId = 1;
            const userId = 100;
            const mockStats = {
                positions: [
                    { position: 1, games: 5, wins: 2 },
                    { position: 2, games: 4, wins: 1 },
                    { position: 3, games: 3, wins: 1 },
                    { position: 4, games: 2, wins: 1 },
                ],
            };
            axiosInstance.get.mockResolvedValue({ data: mockStats });

            const result = await getTurnOrderStats(leagueId, userId);

            expect(axiosInstance.get).toHaveBeenCalledWith(
                '/user-leagues/1/participants/100/turn-order-stats'
            );
            expect(result).toEqual(mockStats);
        });

        it('should propagate errors', async () => {
            const error = new Error('Failed to fetch stats');
            axiosInstance.get.mockRejectedValue(error);

            await expect(getTurnOrderStats(1, 100)).rejects.toThrow('Failed to fetch stats');
        });
    });
});
