const jwt = require('jsonwebtoken');
const { getSetting } = require('../utils/settingsUtils');
const logger = require('../utils/logger');

module.exports = (io) => {
    console.log('[DEBUG] Socket handler initialized');

    // Log connection errors at namespace level
    io.of("/").on("connection_error", (err) => {
        console.log('[DEBUG] Namespace connection error:', {
            message: err.message,
            data: err.data
        });
    });

    // Authentication middleware for Socket.IO
    io.use(async (socket, next) => {
        try {
            const token = socket.handshake.auth.token;
            
            if (!token) {
                logger.warn('WebSocket connection attempt without token');
                return next(new Error('Authentication required'));
            }

            // Get JWT secret from settings
            const jwtSecret = await getSetting('secret_key');
            
            // Verify token
            const decoded = jwt.verify(token, jwtSecret);
            socket.userId = decoded.id;
            
            logger.info('WebSocket authenticated', {
                userId: decoded.id,
                socketId: socket.id
            });
            
            next();
        } catch (error) {
            logger.error('WebSocket authentication failed', {
                error: error.message,
                socketId: socket.id
            });
            next(new Error('Invalid token'));
        }
    });

    io.on('connection', (socket) => {
        console.log('[DEBUG] WebSocket connected (authenticated):', {
            socketId: socket.id,
            userId: socket.userId
        });

        // Join user's personal room (for notifications)
        socket.join(`user:${socket.userId}`);

        // Join league room when requested
        socket.on('join:league', (leagueId) => {
            socket.join(`league:${leagueId}`);
            logger.info('User joined league room', {
                userId: socket.userId,
                leagueId,
                socketId: socket.id
            });
        });

        // Leave league room when requested
        socket.on('leave:league', (leagueId) => {
            socket.leave(`league:${leagueId}`);
            logger.info('User left league room', {
                userId: socket.userId,
                leagueId,
                socketId: socket.id
            });
        });

        // Join pod room when viewing/participating
        socket.on('join:pod', (podId) => {
            socket.join(`pod:${podId}`);
            logger.info('User joined pod room', {
                userId: socket.userId,
                podId,
                socketId: socket.id
            });
        });

        // Leave pod room
        socket.on('leave:pod', (podId) => {
            socket.leave(`pod:${podId}`);
            logger.info('User left pod room', {
                userId: socket.userId,
                podId,
                socketId: socket.id
            });
        });

        // Handle disconnection
        socket.on('disconnect', () => {
            logger.info('WebSocket disconnected', {
                userId: socket.userId,
                socketId: socket.id
            });
        });

        // Handle errors
        socket.on('error', (error) => {
            logger.error('WebSocket error', {
                userId: socket.userId,
                socketId: socket.id,
                error: error.message
            });
        });
    });

    return io;
};
