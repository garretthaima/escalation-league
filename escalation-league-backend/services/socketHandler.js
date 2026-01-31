const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');

// Rate limiting for WebSocket events
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 100; // 100 events per minute

const isRateLimited = (socketId) => {
    const now = Date.now();
    let record = rateLimitMap.get(socketId);

    if (!record || now > record.resetAt) {
        // Start new window
        record = { count: 1, resetAt: now + RATE_LIMIT_WINDOW };
        rateLimitMap.set(socketId, record);
        return false;
    }

    record.count++;
    if (record.count > RATE_LIMIT_MAX_REQUESTS) {
        logger.warn('WebSocket rate limit exceeded', { socketId, count: record.count });
        return true;
    }
    return false;
};

// Cleanup rate limit entries periodically (every 5 minutes)
// Use unref() so this timer doesn't prevent the process from exiting (important for tests)
const cleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [socketId, record] of rateLimitMap.entries()) {
        if (now > record.resetAt) {
            rateLimitMap.delete(socketId);
        }
    }
}, 5 * 60 * 1000);
cleanupInterval.unref();

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

            // JWT_SECRET must be set in environment
            const jwtSecret = process.env.JWT_SECRET;
            if (!jwtSecret) {
                logger.error('JWT_SECRET environment variable is not set');
                return next(new Error('Server configuration error'));
            }

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

        // Helper to validate room IDs (prevent injection)
        const isValidRoomId = (id) => {
            return id !== undefined && id !== null &&
                   (typeof id === 'number' || (typeof id === 'string' && /^\d+$/.test(id)));
        };

        // Join league room when requested (with membership verification)
        socket.on('join:league', async (leagueId) => {
            // Rate limiting check
            if (isRateLimited(socket.id)) {
                socket.emit('error', { message: 'Rate limit exceeded. Please slow down.' });
                return;
            }

            if (!isValidRoomId(leagueId)) return;

            // Verify user is a member of this league
            try {
                // Lazy load db to avoid Redis connection during test module loading
                const db = require('../models/db');
                const membership = await db('user_leagues')
                    .where({ user_id: socket.userId, league_id: leagueId, is_active: true })
                    .first();

                if (!membership) {
                    socket.emit('error', { message: 'Access denied. You are not a member of this league.' });
                    logger.warn('Unauthorized league room access attempt', {
                        userId: socket.userId,
                        leagueId,
                        socketId: socket.id
                    });
                    return;
                }

                socket.join(`league:${leagueId}`);
                logger.info('User joined league room', {
                    userId: socket.userId,
                    leagueId,
                    socketId: socket.id
                });
            } catch (err) {
                logger.error('Error verifying league membership for WebSocket', {
                    userId: socket.userId,
                    leagueId,
                    error: err.message
                });
                socket.emit('error', { message: 'Failed to join league room.' });
            }
        });

        // Leave league room when requested
        socket.on('leave:league', (leagueId) => {
            if (isRateLimited(socket.id)) return;
            if (!isValidRoomId(leagueId)) return;
            socket.leave(`league:${leagueId}`);
            logger.info('User left league room', {
                userId: socket.userId,
                leagueId,
                socketId: socket.id
            });
        });

        // Join pod room when viewing/participating
        socket.on('join:pod', (podId) => {
            if (isRateLimited(socket.id)) return;
            if (!isValidRoomId(podId)) return;
            socket.join(`pod:${podId}`);
            logger.info('User joined pod room', {
                userId: socket.userId,
                podId,
                socketId: socket.id
            });
        });

        // Leave pod room
        socket.on('leave:pod', (podId) => {
            if (isRateLimited(socket.id)) return;
            if (!isValidRoomId(podId)) return;
            socket.leave(`pod:${podId}`);
            logger.info('User left pod room', {
                userId: socket.userId,
                podId,
                socketId: socket.id
            });
        });

        // Join session room for attendance updates
        socket.on('join:session', (sessionId) => {
            if (isRateLimited(socket.id)) return;
            if (!isValidRoomId(sessionId)) return;
            socket.join(`session:${sessionId}`);
            logger.info('User joined session room', {
                userId: socket.userId,
                sessionId,
                socketId: socket.id
            });
        });

        // Leave session room
        socket.on('leave:session', (sessionId) => {
            if (isRateLimited(socket.id)) return;
            if (!isValidRoomId(sessionId)) return;
            socket.leave(`session:${sessionId}`);
            logger.info('User left session room', {
                userId: socket.userId,
                sessionId,
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
