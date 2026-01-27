/**
 * Middleware to require Discord account linking for certain features
 *
 * Usage:
 *   const requireDiscord = require('./middlewares/requireDiscord');
 *   router.post('/pods', requireDiscord('discord_required_for_game_creation'), createPod);
 */

const db = require('../models/db');
const { getSetting } = require('../utils/settingsUtils');

/**
 * Creates middleware that checks if Discord linking is required and enforced
 * @param {string} settingKey - The setting key from the database settings table
 * @returns {Function} Express middleware function
 */
const requireDiscord = (settingKey) => {
    return async (req, res, next) => {
        try {
            // Check if the feature flag is enabled from database settings
            const flagValue = await getSetting(settingKey);
            const isEnabled = flagValue === 'true' || flagValue === true;

            if (!isEnabled) {
                return next(); // Feature disabled, skip check
            }

            // Fetch user's discord_id from database
            const user = await db('users')
                .select('discord_id')
                .where('id', req.user.id)
                .first();

            if (!user) {
                return res.status(404).json({ error: 'User not found' });
            }

            if (!user.discord_id) {
                return res.status(403).json({
                    error: 'Discord account required',
                    code: 'DISCORD_REQUIRED',
                    message: 'Please link your Discord account in Settings to use this feature.'
                });
            }

            next();
        } catch (err) {
            // If setting doesn't exist, treat as disabled (safe default)
            if (err.message && err.message.includes('not found')) {
                return next();
            }
            console.error('Error checking Discord requirement:', err);
            return res.status(500).json({ error: 'Internal server error' });
        }
    };
};

module.exports = requireDiscord;
