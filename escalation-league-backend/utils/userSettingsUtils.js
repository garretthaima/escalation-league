const db = require('../models/db');

/**
 * Fetch a specific setting for a user
 * @param {number} userId - The ID of the user
 * @param {string} key - The key of the setting to fetch
 * @returns {Promise<string|null>} - The value of the setting, or null if not found
 */
const getUserSetting = async (userId, key) => {
    const setting = await db('user_settings').where({ user_id: userId, key_name: key }).first();
    return setting ? setting.value : null;
};

/**
 * Update or insert a setting for a user
 * @param {number} userId - The ID of the user
 * @param {string} key - The key of the setting to update
 * @param {string} value - The new value for the setting
 * @returns {Promise<void>}
 */
const upsertUserSetting = async (userId, key, value) => {
    const existingSetting = await db('user_settings').where({ user_id: userId, key_name: key }).first();

    if (existingSetting) {
        // Update the existing setting
        await db('user_settings').where({ user_id: userId, key_name: key }).update({ value });
    } else {
        // Insert a new setting
        await db('user_settings').insert({ user_id: userId, key_name: key, value });
    }
};

/**
 * Fetch all settings for a user
 * @param {number} userId - The ID of the user
 * @returns {Promise<Object>} - An object containing all settings as key-value pairs
 */
const getAllUserSettings = async (userId) => {
    const settings = await db('user_settings').where({ user_id: userId });
    return settings.reduce((acc, setting) => {
        acc[setting.key_name] = setting.value;
        return acc;
    }, {});
};

module.exports = { getUserSetting, upsertUserSetting, getAllUserSettings };