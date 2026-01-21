const { getSetting } = require('./settingsUtils');
const { getUserSetting } = require('./userSettingsUtils');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

/**
 * Utility function to generate a JWT token
 * @param {Object} user - The user object containing user details (e.g., id, email, role_id, role_name)
 * @param {Object} options - Additional options for token generation
 * @param {string} [options.expiresIn] - Custom expiration time (e.g., '1h', '12h', '7d')
 * @param {Object} [options.customClaims] - Additional claims to include in the token payload
 * @returns {Promise<string>} - The generated JWT token
 */
const generateToken = async (user, options = {}) => {
    try {
        const { customClaims = {}, expiresIn } = options;

        // Fetch the user's preferred expiration time
        const userExpiration = await getUserSetting(user.id, 'token_expiration');

        // Fetch the default and maximum allowed expiration times from settings
        const defaultExpiration = await getSetting('token_expiration') || '1h';
        const maxExpiration = await getSetting('max_token_expiration') || '12h';

        // Determine the expiration time
        const requestedExpiration = expiresIn || userExpiration || defaultExpiration;
        const validatedExpiration = Math.min(parseDuration(requestedExpiration), parseDuration(maxExpiration)) + 'ms';

        // Build the token payload
        const payload = {
            id: user.id,
            role_id: user.role_id,
            role_name: user.role_name,
            ...customClaims, // Include any additional claims dynamically
        };

        // Sign and return the token
        const secretKey = await getSetting('secret_key');
        return jwt.sign(payload, secretKey, { expiresIn: validatedExpiration });
    } catch (error) {
        console.error('Error generating token:', error.message);
        throw new Error('Failed to generate token');
    }
};

/**
 * Helper function to parse duration strings (e.g., '1h', '12h') into milliseconds
 * @param {string} duration - Duration string
 * @returns {number} - Duration in milliseconds
 */
const parseDuration = (duration) => {
    const match = duration.match(/^(\d+)([smhd])$/);
    if (!match) throw new Error(`Invalid duration format: ${duration}`);
    const value = parseInt(match[1], 10);
    const unit = match[2];
    switch (unit) {
        case 's': return value * 1000; // Seconds
        case 'm': return value * 60 * 1000; // Minutes
        case 'h': return value * 60 * 60 * 1000; // Hours
        case 'd': return value * 24 * 60 * 60 * 1000; // Days
        default: throw new Error(`Unsupported duration unit: ${unit}`);
    }
};

/**
 * Generate a short-lived access token for API requests
 * Uses the system access_token_expiration setting (default 15m)
 * @param {Object} user - The user object containing user details
 * @param {Object} options - Additional options for token generation
 * @returns {Promise<string>} - The generated JWT access token
 */
const generateAccessToken = async (user, options = {}) => {
    try {
        const { customClaims = {} } = options;

        // Use access_token_expiration setting for short-lived access tokens
        const accessExpiration = await getSetting('access_token_expiration') || '15m';

        // Build the token payload
        const payload = {
            id: user.id,
            role_id: user.role_id,
            role_name: user.role_name,
            type: 'access', // Distinguish from other token types
            ...customClaims,
        };

        // Sign and return the token
        const secretKey = await getSetting('secret_key');
        return jwt.sign(payload, secretKey, { expiresIn: accessExpiration });
    } catch (error) {
        console.error('Error generating access token:', error.message);
        throw new Error('Failed to generate access token');
    }
};

/**
 * Generate an opaque refresh token
 * @returns {Promise<Object>} - Object containing { token, tokenHash, expiresAt }
 */
const generateRefreshToken = async () => {
    const refreshExpiration = await getSetting('refresh_token_expiration') || '30d';
    const expiresInMs = parseDuration(refreshExpiration);

    // Generate cryptographically secure random token
    const token = crypto.randomBytes(32).toString('base64url');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const expiresAt = new Date(Date.now() + expiresInMs);

    return { token, tokenHash, expiresAt };
};

/**
 * Hash a refresh token for comparison/storage
 * @param {string} token - The raw refresh token
 * @returns {string} - SHA-256 hash of the token
 */
const hashRefreshToken = (token) => {
    return crypto.createHash('sha256').update(token).digest('hex');
};

module.exports = {
    generateToken, // Keep for backward compatibility
    generateAccessToken,
    generateRefreshToken,
    hashRefreshToken,
    parseDuration
};