import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';

const WebSocketContext = createContext(null);

export const useWebSocket = () => {
    const context = useContext(WebSocketContext);
    if (!context) {
        throw new Error('useWebSocket must be used within a WebSocketProvider');
    }
    return context;
};

export const WebSocketProvider = ({ children }) => {
    const [socket, setSocket] = useState(null);
    const [connected, setConnected] = useState(false);
    const socketRef = useRef(null);

    useEffect(() => {
        const token = localStorage.getItem('token');

        if (!token) {
            // No token, don't connect
            return;
        }

        // Use dedicated SOCKET_URL for WebSocket, fallback to auto-detect
        let socketUrl = process.env.REACT_APP_SOCKET_URL;

        if (!socketUrl) {
            // Auto-detect API URL based on hostname
            const hostname = window.location.hostname;
            if (hostname === 'dev.escalationleague.com') {
                socketUrl = 'https://dev-api.escalationleague.com';
            } else if (hostname === 'escalationleague.com' || hostname === 'www.escalationleague.com') {
                socketUrl = 'https://api.escalationleague.com';
            } else {
                // Local development fallback
                socketUrl = 'http://localhost:4000';
            }
        }

        // Create socket connection
        const newSocket = io(socketUrl, {
            path: '/socket.io/', // Explicitly set Socket.IO path
            auth: {
                token
            },
            transports: ['polling', 'websocket'], // Start with polling, then upgrade
            reconnection: true,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 5000,
            reconnectionAttempts: 5
        });

        socketRef.current = newSocket;
        setSocket(newSocket);

        // Connection event handlers
        newSocket.on('connect', () => {
            setConnected(true);
        });

        newSocket.on('disconnect', (reason) => {
            setConnected(false);
        });

        newSocket.on('connect_error', (error) => {
            console.error('WebSocket connection error:', error.message);
            setConnected(false);

            // Check if error is authentication-related
            if (error.message === 'Invalid token' || error.message === 'Authentication required') {
                console.warn('WebSocket authentication failed - session expired');
                localStorage.removeItem('token');
                localStorage.removeItem('refreshToken');
                window.location.href = '/signin';
            }
        });

        newSocket.on('error', (error) => {
            console.error('WebSocket error:', error);
        });

        // Cleanup on unmount
        return () => {
            if (newSocket) {
                newSocket.close();
            }
        };
    }, []); // Empty dependency array - connect once on mount

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

    const value = {
        socket,
        connected,
        joinLeague,
        leaveLeague,
        joinPod,
        leavePod
    };

    return (
        <WebSocketContext.Provider value={value}>
            {children}
        </WebSocketContext.Provider>
    );
};
