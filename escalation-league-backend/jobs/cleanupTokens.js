const { cleanupExpiredTokens } = require('../services/refreshTokenService');
const logger = require('../utils/logger');

// Run cleanup every hour (in milliseconds)
const CLEANUP_INTERVAL = 60 * 60 * 1000;

let cleanupIntervalId = null;

/**
 * Start the periodic token cleanup job
 * Removes expired and revoked refresh tokens from the database
 */
const startCleanupJob = () => {
    // Run immediately on startup
    cleanupExpiredTokens()
        .then(count => {
            if (count > 0) {
                logger.info('Initial token cleanup completed', { deletedCount: count });
            }
        })
        .catch(err => {
            logger.error('Initial token cleanup failed', { error: err.message });
        });

    // Schedule periodic cleanup
    cleanupIntervalId = setInterval(async () => {
        try {
            const count = await cleanupExpiredTokens();
            if (count > 0) {
                logger.info('Periodic token cleanup completed', { deletedCount: count });
            }
        } catch (error) {
            logger.error('Periodic token cleanup failed', { error: error.message });
        }
    }, CLEANUP_INTERVAL);

    logger.info('Token cleanup job started', { intervalMs: CLEANUP_INTERVAL });
};

/**
 * Stop the cleanup job (for graceful shutdown)
 */
const stopCleanupJob = () => {
    if (cleanupIntervalId) {
        clearInterval(cleanupIntervalId);
        cleanupIntervalId = null;
        logger.info('Token cleanup job stopped');
    }
};

module.exports = { startCleanupJob, stopCleanupJob };
