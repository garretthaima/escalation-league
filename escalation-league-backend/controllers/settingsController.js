/**
 * @fileoverview Controller for public app settings
 */

const { getSetting } = require('../utils/settingsUtils');
const logger = require('../utils/logger');

/**
 * Get public app settings (timezone, etc.)
 * These settings are safe to expose to unauthenticated users
 */
const getPublicSettings = async (req, res) => {
    try {
        // List of settings that are safe to expose publicly
        const publicSettingKeys = ['default_timezone'];

        const settings = {};
        for (const key of publicSettingKeys) {
            try {
                settings[key] = await getSetting(key);
            } catch (err) {
                // Setting not found, use default
                if (key === 'default_timezone') {
                    settings[key] = 'America/Chicago';
                }
            }
        }

        res.json(settings);
    } catch (err) {
        logger.error('Error fetching public settings', err);
        res.status(500).json({ error: 'Failed to fetch settings' });
    }
};

module.exports = {
    getPublicSettings
};
