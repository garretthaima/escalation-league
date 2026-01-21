const db = require('../models/db');
const redis = require('../utils/redisClient');
const { generateAccessToken, generateRefreshToken, hashRefreshToken } = require('../utils/tokenUtils');
const logger = require('../utils/logger');

const REDIS_PREFIX = 'refresh_token:';
const REDIS_TTL = 300; // 5 minutes cache

/**
 * Create a new refresh token for a user
 * @param {number} userId - The user's ID
 * @param {string|null} deviceInfo - User agent or device identifier
 * @param {string|null} ipAddress - Client IP address
 * @returns {Promise<string>} - The raw refresh token (to be sent to client)
 */
const createRefreshToken = async (userId, deviceInfo = null, ipAddress = null) => {
    const { token, tokenHash, expiresAt } = await generateRefreshToken();

    // Store in database
    await db('refresh_tokens').insert({
        user_id: userId,
        token_hash: tokenHash,
        device_info: deviceInfo ? deviceInfo.substring(0, 255) : null,
        ip_address: ipAddress,
        expires_at: expiresAt,
    });

    // Cache in Redis for fast validation (non-critical, fails gracefully)
    try {
        await redis.setex(
            `${REDIS_PREFIX}${tokenHash}`,
            REDIS_TTL,
            JSON.stringify({ userId, expiresAt: expiresAt.toISOString() })
        );
    } catch (err) {
        // Redis cache is optional - log and continue
        logger.warn('Failed to cache refresh token in Redis', { error: err.message });
    }

    logger.info('Refresh token created', { userId, expiresAt });
    return token;
};

/**
 * Validate and refresh tokens (with token rotation)
 * @param {string} oldRefreshToken - The current refresh token
 * @param {string|null} deviceInfo - User agent or device identifier
 * @param {string|null} ipAddress - Client IP address
 * @returns {Promise<Object|null>} - { accessToken, refreshToken } or null if invalid
 */
const refreshTokens = async (oldRefreshToken, deviceInfo = null, ipAddress = null) => {
    const tokenHash = hashRefreshToken(oldRefreshToken);

    // Check Redis cache first for speed (fails gracefully)
    let tokenData = null;
    let cached = null;
    try {
        cached = await redis.get(`${REDIS_PREFIX}${tokenHash}`);
    } catch (err) {
        // Redis unavailable - fall through to database
        logger.warn('Redis unavailable for token lookup', { error: err.message });
    }

    if (cached) {
        tokenData = JSON.parse(cached);
    } else {
        // Fallback to database
        const dbToken = await db('refresh_tokens')
            .where({ token_hash: tokenHash, is_revoked: false })
            .where('expires_at', '>', new Date())
            .first();

        if (!dbToken) {
            logger.warn('Invalid refresh token attempt', { tokenHashPrefix: tokenHash.substring(0, 8) });
            return null;
        }

        tokenData = { userId: dbToken.user_id, expiresAt: dbToken.expires_at };
    }

    // Verify expiration (double-check even if from cache)
    if (new Date(tokenData.expiresAt) <= new Date()) {
        await revokeRefreshToken(oldRefreshToken);
        return null;
    }

    // Get user data for new access token
    const user = await db('users')
        .leftJoin('roles', 'users.role_id', 'roles.id')
        .select('users.id', 'users.role_id', 'roles.name as role_name', 'users.is_active', 'users.is_banned')
        .where({ 'users.id': tokenData.userId })
        .first();

    if (!user || !user.is_active || user.is_banned) {
        // User is inactive or banned - revoke all their tokens
        await revokeRefreshTokensByUser(tokenData.userId);
        logger.warn('Token refresh denied - user inactive/banned', { userId: tokenData.userId });
        return null;
    }

    // Token rotation: revoke old token, create new one
    await db('refresh_tokens')
        .where({ token_hash: tokenHash })
        .update({ is_revoked: true, last_used_at: new Date() });

    try {
        await redis.del(`${REDIS_PREFIX}${tokenHash}`);
    } catch (err) {
        // Redis unavailable - log and continue
        logger.warn('Failed to delete token from Redis cache', { error: err.message });
    }

    // Generate new tokens
    const newAccessToken = await generateAccessToken(user);
    const newRefreshToken = await createRefreshToken(tokenData.userId, deviceInfo, ipAddress);

    logger.info('Tokens refreshed successfully', { userId: tokenData.userId });
    return { accessToken: newAccessToken, refreshToken: newRefreshToken };
};

/**
 * Revoke a specific refresh token
 * @param {string} token - The raw refresh token to revoke
 */
const revokeRefreshToken = async (token) => {
    const tokenHash = hashRefreshToken(token);

    await db('refresh_tokens')
        .where({ token_hash: tokenHash })
        .update({ is_revoked: true });

    try {
        await redis.del(`${REDIS_PREFIX}${tokenHash}`);
    } catch (err) {
        logger.warn('Failed to delete token from Redis cache', { error: err.message });
    }
    logger.info('Refresh token revoked', { tokenHashPrefix: tokenHash.substring(0, 8) });
};

/**
 * Revoke all refresh tokens for a user (logout all devices)
 * @param {number} userId - The user's ID
 */
const revokeRefreshTokensByUser = async (userId) => {
    // Get all active tokens for Redis cleanup
    const tokens = await db('refresh_tokens')
        .where({ user_id: userId, is_revoked: false })
        .select('token_hash');

    // Revoke in database
    await db('refresh_tokens')
        .where({ user_id: userId })
        .update({ is_revoked: true });

    // Clear from Redis using pipeline for efficiency
    if (tokens.length > 0) {
        try {
            const pipeline = redis.pipeline();
            tokens.forEach(t => pipeline.del(`${REDIS_PREFIX}${t.token_hash}`));
            await pipeline.exec();
        } catch (err) {
            logger.warn('Failed to clear tokens from Redis cache', { error: err.message });
        }
    }

    logger.info('All refresh tokens revoked for user', { userId, count: tokens.length });
};

/**
 * Cleanup expired and revoked tokens from the database
 * Should be run periodically (e.g., hourly)
 * @returns {Promise<number>} - Number of tokens deleted
 */
const cleanupExpiredTokens = async () => {
    const deleted = await db('refresh_tokens')
        .where('expires_at', '<', new Date())
        .orWhere('is_revoked', true)
        .del();

    if (deleted > 0) {
        logger.info('Cleaned up expired/revoked tokens', { count: deleted });
    }
    return deleted;
};

/**
 * Get active sessions for a user (for security/account management UI)
 * @param {number} userId - The user's ID
 * @returns {Promise<Array>} - Array of active sessions
 */
const getActiveSessions = async (userId) => {
    const sessions = await db('refresh_tokens')
        .where({ user_id: userId, is_revoked: false })
        .where('expires_at', '>', new Date())
        .select('id', 'device_info', 'ip_address', 'created_at', 'last_used_at')
        .orderBy('last_used_at', 'desc');

    return sessions;
};

module.exports = {
    createRefreshToken,
    refreshTokens,
    revokeRefreshToken,
    revokeRefreshTokensByUser,
    cleanupExpiredTokens,
    getActiveSessions,
};
