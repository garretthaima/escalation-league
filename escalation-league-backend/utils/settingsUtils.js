const db = require('../models/db'); // Knex instance
const settingsCache = {}; // In-memory cache for settings

/**
 * Fetch a setting from the database or cache
 * @param {string} key - The key of the setting to fetch
 * @returns {Promise<string>} - The value of the setting
 */
const getSetting = async (key) => {
    if (settingsCache[key]) {
        return settingsCache[key]; // Return cached value if available
    }

    const setting = await db('settings').where({ key_name: key }).first();
    if (!setting) {
        throw new Error(`Setting "${key}" not found in the database.`);
    }

    settingsCache[key] = setting.value; // Cache the value
    return setting.value;
};

/**
 * Update a setting in the database and cache
 * @param {string} key - The key of the setting to update
 * @param {string} value - The new value for the setting
 * @returns {Promise<void>}
 */
const updateSetting = async (key, value) => {
    const updatedRows = await db('settings').where({ key_name: key }).update({ value });
    if (updatedRows === 0) {
        throw new Error(`Setting "${key}" not found in the database.`);
    }
    settingsCache[key] = value; // Update the cache
};

/**
 * Clear the in-memory cache for settings
 * @param {string} [key] - The key of the setting to clear (optional). If not provided, clears the entire cache.
 */
const clearCache = (key) => {
    if (key) {
        delete settingsCache[key];
    } else {
        Object.keys(settingsCache).forEach((key) => delete settingsCache[key]);
    }
};

module.exports = { getSetting, updateSetting, clearCache };