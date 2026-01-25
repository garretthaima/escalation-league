import { useEffect } from 'react';
import { useWebSocket } from '../context/WebSocketProvider';

/**
 * Custom hook for managing WebSocket league room subscription
 * Automatically joins/leaves room based on leagueId
 *
 * @param {number|string} leagueId - League ID to join
 * @returns {Object} WebSocket connection state and methods
 */
const useLeagueRoom = (leagueId) => {
    const { connected, joinLeague, leaveLeague, socket } = useWebSocket();

    useEffect(() => {
        if (connected && leagueId) {
            joinLeague(leagueId);
        }

        return () => {
            if (leagueId) {
                leaveLeague(leagueId);
            }
        };
    }, [connected, leagueId, joinLeague, leaveLeague]);

    return {
        connected,
        socket
    };
};

export default useLeagueRoom;
