import { renderHook, act } from '@testing-library/react';
import React from 'react';
import useLeagueRoom from './useLeagueRoom';
import { WebSocketProvider } from '../context/WebSocketProvider';

// Mock the WebSocketProvider context
const mockJoinLeague = jest.fn();
const mockLeaveLeague = jest.fn();
const mockSocket = { on: jest.fn(), off: jest.fn() };

jest.mock('../context/WebSocketProvider', () => ({
    useWebSocket: () => ({
        connected: true,
        joinLeague: mockJoinLeague,
        leaveLeague: mockLeaveLeague,
        socket: mockSocket
    }),
    WebSocketProvider: ({ children }) => children
}));

describe('useLeagueRoom', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('when connected', () => {
        it('should join league when mounted with leagueId', () => {
            renderHook(() => useLeagueRoom(1));

            expect(mockJoinLeague).toHaveBeenCalledWith(1);
        });

        it('should not join league when leagueId is null', () => {
            renderHook(() => useLeagueRoom(null));

            expect(mockJoinLeague).not.toHaveBeenCalled();
        });

        it('should not join league when leagueId is undefined', () => {
            renderHook(() => useLeagueRoom(undefined));

            expect(mockJoinLeague).not.toHaveBeenCalled();
        });

        it('should leave league when unmounted', () => {
            const { unmount } = renderHook(() => useLeagueRoom(1));

            unmount();

            expect(mockLeaveLeague).toHaveBeenCalledWith(1);
        });

        it('should not call leaveLeague when leagueId is null', () => {
            const { unmount } = renderHook(() => useLeagueRoom(null));

            unmount();

            expect(mockLeaveLeague).not.toHaveBeenCalled();
        });
    });

    describe('when leagueId changes', () => {
        it('should leave old league and join new league', () => {
            const { rerender } = renderHook(
                ({ leagueId }) => useLeagueRoom(leagueId),
                { initialProps: { leagueId: 1 } }
            );

            expect(mockJoinLeague).toHaveBeenCalledWith(1);

            rerender({ leagueId: 2 });

            expect(mockLeaveLeague).toHaveBeenCalledWith(1);
            expect(mockJoinLeague).toHaveBeenCalledWith(2);
        });
    });

    describe('return value', () => {
        it('should return connected status and socket', () => {
            const { result } = renderHook(() => useLeagueRoom(1));

            expect(result.current.connected).toBe(true);
            expect(result.current.socket).toBe(mockSocket);
        });
    });
});

// Note: Testing the disconnected scenario would require a separate test file
// or more complex mocking setup due to how Jest module mocking works.
// The connected path is tested above.
