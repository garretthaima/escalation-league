// Mock axiosInstance BEFORE importing modules that use it
jest.mock('../axiosConfig', () => ({
    __esModule: true,
    default: {
        get: jest.fn(),
        post: jest.fn(),
        put: jest.fn(),
        delete: jest.fn(),
        patch: jest.fn(),
    },
}));

import axiosInstance from '../axiosConfig';
import {
    getTodaySession,
    getLeagueSessions,
    getSession,
    createSession,
    updateSessionStatus,
    checkIn,
    checkOut,
    adminCheckIn,
    adminCheckOut,
    getActiveAttendees,
    getPodSuggestions,
    getMatchupMatrix,
    postDiscordPoll,
    closeDiscordPoll,
    lockSession,
    reopenSession,
    createPodWithPlayers,
    getParticipantMatchups,
    getActivePollSession,
    postSessionRecap,
} from '../attendanceApi';

describe('attendanceApi', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('getTodaySession', () => {
        it('should make GET request to correct URL with leagueId', async () => {
            const mockData = { id: 1, date: '2024-01-15', league_id: 5 };
            axiosInstance.get.mockResolvedValue({ data: mockData });

            const result = await getTodaySession(5);

            expect(axiosInstance.get).toHaveBeenCalledWith('/attendance/leagues/5/today');
            expect(axiosInstance.get).toHaveBeenCalledTimes(1);
            expect(result).toEqual(mockData);
        });

        it('should handle different leagueIds', async () => {
            const mockData = { id: 2, date: '2024-01-15', league_id: 10 };
            axiosInstance.get.mockResolvedValue({ data: mockData });

            const result = await getTodaySession(10);

            expect(axiosInstance.get).toHaveBeenCalledWith('/attendance/leagues/10/today');
            expect(result).toEqual(mockData);
        });
    });

    describe('getLeagueSessions', () => {
        it('should make GET request to correct URL with leagueId', async () => {
            const mockData = [
                { id: 1, date: '2024-01-15' },
                { id: 2, date: '2024-01-22' },
            ];
            axiosInstance.get.mockResolvedValue({ data: mockData });

            const result = await getLeagueSessions(5);

            expect(axiosInstance.get).toHaveBeenCalledWith('/attendance/leagues/5/sessions');
            expect(axiosInstance.get).toHaveBeenCalledTimes(1);
            expect(result).toEqual(mockData);
        });
    });

    describe('getSession', () => {
        it('should make GET request to correct URL with sessionId', async () => {
            const mockData = { id: 123, date: '2024-01-15', attendees: [] };
            axiosInstance.get.mockResolvedValue({ data: mockData });

            const result = await getSession(123);

            expect(axiosInstance.get).toHaveBeenCalledWith('/attendance/sessions/123');
            expect(axiosInstance.get).toHaveBeenCalledTimes(1);
            expect(result).toEqual(mockData);
        });
    });

    describe('createSession', () => {
        it('should make POST request to correct URL with data', async () => {
            const sessionData = { league_id: 5, date: '2024-01-15' };
            const mockResponse = { id: 1, ...sessionData };
            axiosInstance.post.mockResolvedValue({ data: mockResponse });

            const result = await createSession(sessionData);

            expect(axiosInstance.post).toHaveBeenCalledWith('/admin/attendance/sessions', sessionData);
            expect(axiosInstance.post).toHaveBeenCalledTimes(1);
            expect(result).toEqual(mockResponse);
        });
    });

    describe('updateSessionStatus', () => {
        it('should make PATCH request to correct URL with status', async () => {
            const mockResponse = { id: 123, status: 'active' };
            axiosInstance.patch.mockResolvedValue({ data: mockResponse });

            const result = await updateSessionStatus(123, 'active');

            expect(axiosInstance.patch).toHaveBeenCalledWith(
                '/admin/attendance/sessions/123/status',
                { status: 'active' }
            );
            expect(axiosInstance.patch).toHaveBeenCalledTimes(1);
            expect(result).toEqual(mockResponse);
        });

        it('should handle different status values', async () => {
            const mockResponse = { id: 456, status: 'completed' };
            axiosInstance.patch.mockResolvedValue({ data: mockResponse });

            const result = await updateSessionStatus(456, 'completed');

            expect(axiosInstance.patch).toHaveBeenCalledWith(
                '/admin/attendance/sessions/456/status',
                { status: 'completed' }
            );
            expect(result).toEqual(mockResponse);
        });
    });

    describe('checkIn', () => {
        it('should make POST request to correct URL with sessionId', async () => {
            const mockResponse = { id: 1, session_id: 123, user_id: 5 };
            axiosInstance.post.mockResolvedValue({ data: mockResponse });

            const result = await checkIn(123);

            expect(axiosInstance.post).toHaveBeenCalledWith('/attendance/sessions/123/check-in');
            expect(axiosInstance.post).toHaveBeenCalledTimes(1);
            expect(result).toEqual(mockResponse);
        });
    });

    describe('checkOut', () => {
        it('should make POST request to correct URL with sessionId', async () => {
            const mockResponse = { id: 1, session_id: 123, checked_out_at: '2024-01-15T18:00:00Z' };
            axiosInstance.post.mockResolvedValue({ data: mockResponse });

            const result = await checkOut(123);

            expect(axiosInstance.post).toHaveBeenCalledWith('/attendance/sessions/123/check-out');
            expect(axiosInstance.post).toHaveBeenCalledTimes(1);
            expect(result).toEqual(mockResponse);
        });
    });

    describe('adminCheckIn', () => {
        it('should make POST request to correct URL with sessionId and userId', async () => {
            const mockResponse = { id: 1, session_id: 123, user_id: 42 };
            axiosInstance.post.mockResolvedValue({ data: mockResponse });

            const result = await adminCheckIn(123, 42);

            expect(axiosInstance.post).toHaveBeenCalledWith(
                '/admin/attendance/sessions/123/check-in',
                { user_id: 42 }
            );
            expect(axiosInstance.post).toHaveBeenCalledTimes(1);
            expect(result).toEqual(mockResponse);
        });
    });

    describe('adminCheckOut', () => {
        it('should make POST request to correct URL with sessionId and userId', async () => {
            const mockResponse = { id: 1, session_id: 123, user_id: 42, checked_out_at: '2024-01-15T18:00:00Z' };
            axiosInstance.post.mockResolvedValue({ data: mockResponse });

            const result = await adminCheckOut(123, 42);

            expect(axiosInstance.post).toHaveBeenCalledWith(
                '/admin/attendance/sessions/123/check-out',
                { user_id: 42 }
            );
            expect(axiosInstance.post).toHaveBeenCalledTimes(1);
            expect(result).toEqual(mockResponse);
        });
    });

    describe('getActiveAttendees', () => {
        it('should make GET request to correct URL with sessionId', async () => {
            const mockData = [
                { id: 1, user_id: 5, display_name: 'Player 1' },
                { id: 2, user_id: 6, display_name: 'Player 2' },
            ];
            axiosInstance.get.mockResolvedValue({ data: mockData });

            const result = await getActiveAttendees(123);

            expect(axiosInstance.get).toHaveBeenCalledWith('/attendance/sessions/123/active');
            expect(axiosInstance.get).toHaveBeenCalledTimes(1);
            expect(result).toEqual(mockData);
        });
    });

    describe('getPodSuggestions', () => {
        it('should make GET request with default podSize of 4', async () => {
            const mockData = { pods: [[1, 2, 3, 4], [5, 6, 7, 8]] };
            axiosInstance.get.mockResolvedValue({ data: mockData });

            const result = await getPodSuggestions(123);

            expect(axiosInstance.get).toHaveBeenCalledWith(
                '/admin/attendance/sessions/123/suggest-pods?pod_size=4'
            );
            expect(axiosInstance.get).toHaveBeenCalledTimes(1);
            expect(result).toEqual(mockData);
        });

        it('should make GET request with custom podSize', async () => {
            const mockData = { pods: [[1, 2, 3], [4, 5, 6]] };
            axiosInstance.get.mockResolvedValue({ data: mockData });

            const result = await getPodSuggestions(123, 3);

            expect(axiosInstance.get).toHaveBeenCalledWith(
                '/admin/attendance/sessions/123/suggest-pods?pod_size=3'
            );
            expect(result).toEqual(mockData);
        });

        it('should handle podSize of 5', async () => {
            const mockData = { pods: [[1, 2, 3, 4, 5]] };
            axiosInstance.get.mockResolvedValue({ data: mockData });

            const result = await getPodSuggestions(456, 5);

            expect(axiosInstance.get).toHaveBeenCalledWith(
                '/admin/attendance/sessions/456/suggest-pods?pod_size=5'
            );
            expect(result).toEqual(mockData);
        });
    });

    describe('getMatchupMatrix', () => {
        it('should make GET request to correct URL with leagueId', async () => {
            const mockData = { matrix: [[0, 1, 2], [1, 0, 1], [2, 1, 0]] };
            axiosInstance.get.mockResolvedValue({ data: mockData });

            const result = await getMatchupMatrix(5);

            expect(axiosInstance.get).toHaveBeenCalledWith('/admin/attendance/leagues/5/matchup-matrix');
            expect(axiosInstance.get).toHaveBeenCalledTimes(1);
            expect(result).toEqual(mockData);
        });
    });

    describe('postDiscordPoll', () => {
        it('should make POST request with null custom message by default', async () => {
            const mockResponse = { message_id: 'abc123', session_id: 123 };
            axiosInstance.post.mockResolvedValue({ data: mockResponse });

            const result = await postDiscordPoll(123);

            expect(axiosInstance.post).toHaveBeenCalledWith(
                '/admin/attendance/sessions/123/discord-poll',
                { custom_message: null }
            );
            expect(axiosInstance.post).toHaveBeenCalledTimes(1);
            expect(result).toEqual(mockResponse);
        });

        it('should make POST request with custom message when provided', async () => {
            const mockResponse = { message_id: 'abc123', session_id: 123 };
            axiosInstance.post.mockResolvedValue({ data: mockResponse });

            const result = await postDiscordPoll(123, 'Who is coming tonight?');

            expect(axiosInstance.post).toHaveBeenCalledWith(
                '/admin/attendance/sessions/123/discord-poll',
                { custom_message: 'Who is coming tonight?' }
            );
            expect(result).toEqual(mockResponse);
        });
    });

    describe('closeDiscordPoll', () => {
        it('should make DELETE request to correct URL with sessionId', async () => {
            const mockResponse = { success: true, session_id: 123, locked: true };
            axiosInstance.delete.mockResolvedValue({ data: mockResponse });

            const result = await closeDiscordPoll(123);

            expect(axiosInstance.delete).toHaveBeenCalledWith(
                '/admin/attendance/sessions/123/discord-poll'
            );
            expect(axiosInstance.delete).toHaveBeenCalledTimes(1);
            expect(result).toEqual(mockResponse);
        });
    });

    describe('lockSession', () => {
        it('should make POST request to correct URL with sessionId', async () => {
            const mockResponse = { id: 123, locked: true };
            axiosInstance.post.mockResolvedValue({ data: mockResponse });

            const result = await lockSession(123);

            expect(axiosInstance.post).toHaveBeenCalledWith('/admin/attendance/sessions/123/lock');
            expect(axiosInstance.post).toHaveBeenCalledTimes(1);
            expect(result).toEqual(mockResponse);
        });
    });

    describe('reopenSession', () => {
        it('should make POST request to correct URL with sessionId', async () => {
            const mockResponse = { id: 123, locked: false };
            axiosInstance.post.mockResolvedValue({ data: mockResponse });

            const result = await reopenSession(123);

            expect(axiosInstance.post).toHaveBeenCalledWith('/admin/attendance/sessions/123/reopen');
            expect(axiosInstance.post).toHaveBeenCalledTimes(1);
            expect(result).toEqual(mockResponse);
        });
    });

    describe('createPodWithPlayers', () => {
        it('should make POST request to correct URL with sessionId and playerIds', async () => {
            const mockResponse = { id: 1, session_id: 123, players: [1, 2, 3, 4] };
            axiosInstance.post.mockResolvedValue({ data: mockResponse });

            const result = await createPodWithPlayers(123, [1, 2, 3, 4]);

            expect(axiosInstance.post).toHaveBeenCalledWith(
                '/admin/attendance/sessions/123/pods',
                { player_ids: [1, 2, 3, 4] }
            );
            expect(axiosInstance.post).toHaveBeenCalledTimes(1);
            expect(result).toEqual(mockResponse);
        });

        it('should handle different player arrays', async () => {
            const mockResponse = { id: 2, session_id: 456, players: [10, 20, 30] };
            axiosInstance.post.mockResolvedValue({ data: mockResponse });

            const result = await createPodWithPlayers(456, [10, 20, 30]);

            expect(axiosInstance.post).toHaveBeenCalledWith(
                '/admin/attendance/sessions/456/pods',
                { player_ids: [10, 20, 30] }
            );
            expect(result).toEqual(mockResponse);
        });
    });

    describe('getParticipantMatchups', () => {
        it('should make GET request to correct URL with leagueId and userId', async () => {
            const mockData = { nemesis: { id: 2, wins: 3 }, victim: { id: 3, losses: 2 } };
            axiosInstance.get.mockResolvedValue({ data: mockData });

            const result = await getParticipantMatchups(5, 42);

            expect(axiosInstance.get).toHaveBeenCalledWith('/user-leagues/5/participants/42/matchups');
            expect(axiosInstance.get).toHaveBeenCalledTimes(1);
            expect(result).toEqual(mockData);
        });

        it('should handle different leagueId and userId combinations', async () => {
            const mockData = { nemesis: null, victim: null };
            axiosInstance.get.mockResolvedValue({ data: mockData });

            const result = await getParticipantMatchups(10, 99);

            expect(axiosInstance.get).toHaveBeenCalledWith('/user-leagues/10/participants/99/matchups');
            expect(result).toEqual(mockData);
        });
    });

    describe('getActivePollSession', () => {
        it('should make GET request to correct URL with leagueId', async () => {
            const mockData = { id: 123, has_active_poll: true, poll_message_id: 'abc123' };
            axiosInstance.get.mockResolvedValue({ data: mockData });

            const result = await getActivePollSession(5);

            expect(axiosInstance.get).toHaveBeenCalledWith('/attendance/leagues/5/active-poll');
            expect(axiosInstance.get).toHaveBeenCalledTimes(1);
            expect(result).toEqual(mockData);
        });

        it('should return null data when no active poll exists', async () => {
            axiosInstance.get.mockResolvedValue({ data: null });

            const result = await getActivePollSession(5);

            expect(axiosInstance.get).toHaveBeenCalledWith('/attendance/leagues/5/active-poll');
            expect(result).toBeNull();
        });
    });

    describe('postSessionRecap', () => {
        it('should make POST request to correct URL with sessionId', async () => {
            const mockResponse = { success: true, discord_message_id: 'recap123' };
            axiosInstance.post.mockResolvedValue({ data: mockResponse });

            const result = await postSessionRecap(123);

            expect(axiosInstance.post).toHaveBeenCalledWith('/admin/attendance/sessions/123/recap');
            expect(axiosInstance.post).toHaveBeenCalledTimes(1);
            expect(result).toEqual(mockResponse);
        });
    });

    describe('error handling', () => {
        it('should propagate errors from getTodaySession', async () => {
            const error = new Error('Network error');
            axiosInstance.get.mockRejectedValue(error);

            await expect(getTodaySession(5)).rejects.toThrow('Network error');
        });

        it('should propagate errors from createSession', async () => {
            const error = new Error('Server error');
            axiosInstance.post.mockRejectedValue(error);

            await expect(createSession({ league_id: 5 })).rejects.toThrow('Server error');
        });

        it('should propagate errors from updateSessionStatus', async () => {
            const error = new Error('Unauthorized');
            axiosInstance.patch.mockRejectedValue(error);

            await expect(updateSessionStatus(123, 'active')).rejects.toThrow('Unauthorized');
        });

        it('should propagate errors from closeDiscordPoll', async () => {
            const error = new Error('Poll not found');
            axiosInstance.delete.mockRejectedValue(error);

            await expect(closeDiscordPoll(123)).rejects.toThrow('Poll not found');
        });
    });
});
