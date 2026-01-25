import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { io } from 'socket.io-client';
import { performTokenRefresh } from '../api/axiosConfig';

const WebSocketContext = createContext(null);

export const useWebSocket = () => {
    const context = useContext(WebSocketContext);
    if (!context) {
        throw new Error('useWebSocket must be used within a WebSocketProvider');
    }
    return context;
};

// Get socket URL based on environment
const getSocketUrl = () => {
    if (process.env.REACT_APP_SOCKET_URL) {
        return process.env.REACT_APP_SOCKET_URL;
    }

    const hostname = window.location.hostname;
    if (hostname === 'dev.escalationleague.com') {
        return 'https://dev-api.escalationleague.com';
    } else if (hostname === 'escalationleague.com' || hostname === 'www.escalationleague.com') {
        return 'https://api.escalationleague.com';
    }
    return 'http://localhost:4000';
};

export const WebSocketProvider = ({ children }) => {
    const [socket, setSocket] = useState(null);
    const [connected, setConnected] = useState(false);
    const socketRef = useRef(null);
    const reconnectAttempts = useRef(0);

    // Create socket connection
    const createSocket = useCallback(() => {
        const token = localStorage.getItem('token');
        if (!token) return null;

        return io(getSocketUrl(), {
            path: '/socket.io/',
            auth: { token },
            transports: ['websocket', 'polling'],
            upgrade: true,
            rememberUpgrade: true,
            reconnection: true,
            reconnectionDelay: 500,
            reconnectionDelayMax: 2000,
            reconnectionAttempts: 10,
            timeout: 5000
        });
    }, []);

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) return;

        const newSocket = createSocket();
        if (!newSocket) return;

        socketRef.current = newSocket;
        setSocket(newSocket);

        newSocket.on('connect', () => {
            setConnected(true);
            reconnectAttempts.current = 0;
        });

        newSocket.on('disconnect', async (reason) => {
            setConnected(false);
            // If server disconnected us, try to reconnect with fresh token
            if (reason === 'io server disconnect' || reason === 'transport close') {
                // Wait for any in-progress token refresh to complete
                // This handles the race condition where axios interceptor is refreshing
                const newToken = await performTokenRefresh();
                if (newToken) {
                    newSocket.auth = { token: newToken };
                    setTimeout(() => newSocket.connect(), 500);
                }
            }
        });

        newSocket.on('connect_error', async (error) => {
            console.error('WebSocket connection error:', error.message);
            setConnected(false);

            // Check if it's an auth error
            if (error.message === 'Invalid token' || error.message === 'Token expired' || error.message === 'Authentication required') {
                // Use centralized token refresh to avoid race conditions with axios
                const newToken = await performTokenRefresh();

                if (newToken) {
                    // Successfully refreshed - update socket auth and reconnect
                    newSocket.auth = { token: newToken };
                    reconnectAttempts.current = 0;
                    setTimeout(() => newSocket.connect(), 500);
                    return;
                }

                // Token refresh failed
                reconnectAttempts.current++;
                if (reconnectAttempts.current >= 3) {
                    console.warn('WebSocket authentication failed - session expired');
                    localStorage.removeItem('token');
                    localStorage.removeItem('refreshToken');
                    window.location.href = '/signin';
                }
            }
        });

        newSocket.on('error', (error) => {
            console.error('WebSocket error:', error);
        });

        return () => {
            if (newSocket) {
                newSocket.close();
            }
        };
    }, [createSocket]);

    // Listen for token refresh events from axios interceptor
    useEffect(() => {
        const handleTokenRefresh = (event) => {
            const { token } = event.detail;
            if (socketRef.current && token) {
                // Update socket auth with new token
                socketRef.current.auth = { token };

                // If disconnected, try to reconnect
                if (!connected && socketRef.current.disconnected) {
                    reconnectAttempts.current = 0;
                    socketRef.current.connect();
                }
            }
        };

        window.addEventListener('tokenRefreshed', handleTokenRefresh);
        return () => {
            window.removeEventListener('tokenRefreshed', handleTokenRefresh);
        };
    }, [connected]);

    // Helper methods to join/leave rooms
    const joinLeague = (leagueId) => {
        if (socket && connected) {
            socket.emit('join:league', leagueId);
        }
    };

    const leaveLeague = (leagueId) => {
        if (socket && connected) {
            socket.emit('leave:league', leagueId);
        }
    };

    const joinPod = (podId) => {
        if (socket && connected) {
            socket.emit('join:pod', podId);
        }
    };

    const leavePod = (podId) => {
        if (socket && connected) {
            socket.emit('leave:pod', podId);
        }
    };

    const joinSession = (sessionId) => {
        if (socket && connected) {
            socket.emit('join:session', sessionId);
        }
    };

    const leaveSession = (sessionId) => {
        if (socket && connected) {
            socket.emit('leave:session', sessionId);
        }
    };

    const value = {
        socket,
        connected,
        joinLeague,
        leaveLeague,
        joinPod,
        leavePod,
        joinSession,
        leaveSession
    };

    return (
        <WebSocketContext.Provider value={value}>
            {children}
        </WebSocketContext.Provider>
    );
};
