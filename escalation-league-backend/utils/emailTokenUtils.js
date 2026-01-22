/**
 * Email Token Utilities
 * Handles generation and validation of email verification and password reset tokens
 */

const crypto = require('crypto');
const db = require('../models/db');

// Token configuration
const VERIFICATION_TOKEN_EXPIRY_HOURS = 24;
const RESET_TOKEN_EXPIRY_HOURS = 1;

/**
 * Generate a secure random token
 * @returns {string} Random token (32 bytes hex = 64 characters)
 */
const generateToken = () => {
    return crypto.randomBytes(32).toString('hex');
};

/**
 * Hash a token for secure storage
 * @param {string} token - Plain token
 * @returns {string} SHA-256 hash of token
 */
const hashToken = (token) => {
    return crypto.createHash('sha256').update(token).digest('hex');
};

/**
 * Create an email verification token
 * @param {number} userId - User ID
 * @returns {Promise<string>} Plain token (to send in email)
 */
const createVerificationToken = async (userId) => {
    const token = generateToken();
    const tokenHash = hashToken(token);
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + VERIFICATION_TOKEN_EXPIRY_HOURS);

    // Invalidate any existing tokens for this user
    await db('email_verification_tokens')
        .where({ user_id: userId, is_used: false })
        .update({ is_used: true });

    // Insert new token
    await db('email_verification_tokens').insert({
        user_id: userId,
        token_hash: tokenHash,
        expires_at: expiresAt,
        is_used: false
    });

    return token;
};

/**
 * Validate and consume an email verification token
 * @param {string} token - Plain token from email link
 * @returns {Promise<{valid: boolean, userId?: number, error?: string}>}
 */
const validateVerificationToken = async (token) => {
    const tokenHash = hashToken(token);

    const record = await db('email_verification_tokens')
        .where({ token_hash: tokenHash })
        .first();

    if (!record) {
        return { valid: false, error: 'Invalid verification link' };
    }

    if (record.is_used) {
        return { valid: false, error: 'This verification link has already been used' };
    }

    if (new Date(record.expires_at) < new Date()) {
        return { valid: false, error: 'This verification link has expired' };
    }

    // Mark token as used
    await db('email_verification_tokens')
        .where({ id: record.id })
        .update({ is_used: true });

    return { valid: true, userId: record.user_id };
};

/**
 * Create a password reset token
 * @param {number} userId - User ID
 * @returns {Promise<string>} Plain token (to send in email)
 */
const createResetToken = async (userId) => {
    const token = generateToken();
    const tokenHash = hashToken(token);
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + RESET_TOKEN_EXPIRY_HOURS);

    // Invalidate any existing tokens for this user
    await db('password_reset_tokens')
        .where({ user_id: userId, is_used: false })
        .update({ is_used: true });

    // Insert new token
    await db('password_reset_tokens').insert({
        user_id: userId,
        token_hash: tokenHash,
        expires_at: expiresAt,
        is_used: false
    });

    return token;
};

/**
 * Validate and consume a password reset token
 * @param {string} token - Plain token from email link
 * @returns {Promise<{valid: boolean, userId?: number, error?: string}>}
 */
const validateResetToken = async (token) => {
    const tokenHash = hashToken(token);

    const record = await db('password_reset_tokens')
        .where({ token_hash: tokenHash })
        .first();

    if (!record) {
        return { valid: false, error: 'Invalid reset link' };
    }

    if (record.is_used) {
        return { valid: false, error: 'This reset link has already been used' };
    }

    if (new Date(record.expires_at) < new Date()) {
        return { valid: false, error: 'This reset link has expired' };
    }

    // Mark token as used
    await db('password_reset_tokens')
        .where({ id: record.id })
        .update({ is_used: true });

    return { valid: true, userId: record.user_id };
};

/**
 * Clean up expired tokens (can be run periodically)
 * @returns {Promise<{verificationDeleted: number, resetDeleted: number}>}
 */
const cleanupExpiredTokens = async () => {
    const now = new Date();

    const verificationDeleted = await db('email_verification_tokens')
        .where('expires_at', '<', now)
        .orWhere('is_used', true)
        .delete();

    const resetDeleted = await db('password_reset_tokens')
        .where('expires_at', '<', now)
        .orWhere('is_used', true)
        .delete();

    return { verificationDeleted, resetDeleted };
};

module.exports = {
    createVerificationToken,
    validateVerificationToken,
    createResetToken,
    validateResetToken,
    cleanupExpiredTokens,
    VERIFICATION_TOKEN_EXPIRY_HOURS,
    RESET_TOKEN_EXPIRY_HOURS
};
