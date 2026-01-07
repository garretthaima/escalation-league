const jwt = require('jsonwebtoken');
const { getSetting } = require('../utils/settingsUtils');
const logger = require('../utils/logger');

module.exports = (io) => {
    console.log('[DEBUG] Socket handler initialized');

    // Middleware for authentication
    io.use(async (socket, next) => {
        console.log('[DEBUG] Socket connection attempt', {
            id: socket.id,
            hasToken: !!socket.handshake.auth.token
        });

        try {
            const token = socket.handshake.auth.token;

            console.log('[DEBUG] Token check:', {
                hasToken: !!token,
                tokenPreview: token ? token.substring(0, 20) + '...' : 'none'
            });

            if (!token) {
                console.log('[DEBUG] No token provided');
                return next(new Error('Authentication required'));
            }

            // Verify JWT token
            const secretKey = await getSetting('secret_key');
            console.log('[DEBUG] Secret key retrieved:', !!secretKey);

            const decoded = jwt.verify(token, secretKey);
            console.log('[DEBUG] Token decoded successfully:', { userId: decoded.id });

            socket.userId = decoded.id;
            socket.userEmail = decoded.email;

            logger.info('WebSocket authenticated', {
                userId: socket.userId,
                socketId: socket.id
            });

            next();
        } catch (err) {
            logger.error('WebSocket authentication failed', {
                error: err.message,
                socketId: socket.id
            });
            next(new Error('Authentication failed'));
        }
    });

    io.on('connection', (socket) => {
        logger.info('WebSocket connected', {
            userId: socket.userId,
            socketId: socket.id
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
