const db = require('../models/db'); // Knex instance
const settingsCache = {}; // In-memory cache for settings with TTL

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes in milliseconds

/**
 * Fetch a setting from the database or cache
 * @param {string} key - The key of the setting to fetch
 * @returns {Promise<string>} - The value of the setting
 */
const getSetting = async (key) => {
    const now = Date.now();
    const cached = settingsCache[key];

    // Return cached value if it exists and hasn't expired
    if (cached && cached.expiresAt > now) {
        return cached.value;
    }

    const setting = await db('settings').where({ key_name: key }).first();
    if (!setting) {
        throw new Error(`Setting "${key}" not found in the database.`);
    }

    // Cache the value with expiration time
    settingsCache[key] = {
        value: setting.value,
        expiresAt: now + CACHE_TTL
    };

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

    // Update the cache with new expiration time
    settingsCache[key] = {
        value: value,
        expiresAt: Date.now() + CACHE_TTL
    };
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