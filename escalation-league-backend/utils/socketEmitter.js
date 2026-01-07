/**
 * Helper functions to emit WebSocket events from controllers
 * Usage: const { emitPodCreated } = require('../utils/socketEmitter');
 *        emitPodCreated(req.app, leagueId, podData);
 */

const logger = require('./logger');

/**
 * Emit pod created event to league room
 */
const emitPodCreated = (app, leagueId, podData) => {
    try {
        const io = app.get('io');
        if (io) {
            io.to(`league:${leagueId}`).emit('pod:created', podData);
            logger.info('WebSocket emitted pod:created', { leagueId, podId: podData.id });
        }
    } catch (err) {
        logger.error('Failed to emit pod:created', { error: err.message });
    }
};

/**
 * Emit player joined pod event
 */
const emitPlayerJoined = (app, leagueId, podId, playerData) => {
    try {
        const io = app.get('io');
        if (io) {
            io.to(`league:${leagueId}`).emit('pod:player_joined', {
                podId,
                player: playerData
            });
            io.to(`pod:${podId}`).emit('pod:player_joined', {
                podId,
                player: playerData
            });
            logger.info('WebSocket emitted pod:player_joined', { leagueId, podId });
        }
    } catch (err) {
        logger.error('Failed to emit pod:player_joined', { error: err.message });
    }
};

/**
 * Emit pod activated event (moved from open to active)
 */
const emitPodActivated = (app, leagueId, podId) => {
    try {
        const io = app.get('io');
        if (io) {
            io.to(`league:${leagueId}`).emit('pod:activated', { podId });
            io.to(`pod:${podId}`).emit('pod:activated', { podId });
            logger.info('WebSocket emitted pod:activated', { leagueId, podId });
        }
    } catch (err) {
        logger.error('Failed to emit pod:activated', { error: err.message });
    }
};

/**
 * Emit winner declared event (pod moved to pending)
 */
const emitWinnerDeclared = (app, leagueId, podId, winnerId) => {
    try {
        const io = app.get('io');
        if (io) {
            io.to(`league:${leagueId}`).emit('pod:winner_declared', {
                podId,
                winnerId
            });
            io.to(`pod:${podId}`).emit('pod:winner_declared', {
                podId,
                winnerId
            });
            logger.info('WebSocket emitted pod:winner_declared', { leagueId, podId, winnerId });
        }
    } catch (err) {
        logger.error('Failed to emit pod:winner_declared', { error: err.message });
    }
};

/**
 * Emit game confirmed event (player confirmed result)
 */
const emitGameConfirmed = (app, leagueId, podId, playerId, isComplete) => {
    try {
        const io = app.get('io');
        if (io) {
            const eventData = {
                podId,
                playerId,
                isComplete // true if all players confirmed
            };

            io.to(`league:${leagueId}`).emit('pod:confirmed', eventData);
            io.to(`pod:${podId}`).emit('pod:confirmed', eventData);

            logger.info('WebSocket emitted pod:confirmed', {
                leagueId,
                podId,
                playerId,
                isComplete
            });
        }
    } catch (err) {
        logger.error('Failed to emit pod:confirmed', { error: err.message });
    }
};

/**
 * Emit league signup request created
 */
const emitSignupRequest = (app, leagueId, requestData) => {
    try {
        const io = app.get('io');
        if (io) {
            io.to(`league:${leagueId}`).emit('league:signup_request', requestData);
            logger.info('WebSocket emitted league:signup_request', { leagueId });
        }
    } catch (err) {
        logger.error('Failed to emit league:signup_request', { error: err.message });
    }
};

/**
 * Emit signup request approved/rejected
 */
const emitSignupResponse = (app, userId, status, leagueId) => {
    try {
        const io = app.get('io');
        if (io) {
            io.to(`user:${userId}`).emit('league:signup_response', {
                status,
                leagueId
            });
            logger.info('WebSocket emitted league:signup_response', { userId, status });
        }
    } catch (err) {
        logger.error('Failed to emit league:signup_response', { error: err.message });
    }
};

module.exports = {
    emitPodCreated,
    emitPlayerJoined,
    emitPodActivated,
    emitWinnerDeclared,
    emitGameConfirmed,
    emitSignupRequest,
    emitSignupResponse
};
