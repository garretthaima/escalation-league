/**
 * Settings Admin Controller
 * Handles API endpoints for managing application settings
 */

const db = require('../models/db');
const { clearCache } = require('../utils/settingsUtils');
const {
    logSettingUpdated,
    logSettingCreated,
    logSettingDeleted
} = require('../services/activityLogService');

/**
 * Get all settings
 */
const getAllSettings = async (req, res) => {
    try {
        const settings = await db('settings')
            .select('id', 'key_name', 'value', 'description')
            .orderBy('key_name', 'asc');

        res.status(200).json({ settings });
    } catch (err) {
        console.error('Error fetching settings:', err.message);
        res.status(500).json({ error: 'Failed to fetch settings.' });
    }
};

/**
 * Get a single setting by key
 */
const getSetting = async (req, res) => {
    const { key } = req.params;

    try {
        const setting = await db('settings')
            .where({ key_name: key })
            .first();

        if (!setting) {
            return res.status(404).json({ error: 'Setting not found.' });
        }

        res.status(200).json({ setting });
    } catch (err) {
        console.error('Error fetching setting:', err.message);
        res.status(500).json({ error: 'Failed to fetch setting.' });
    }
};

/**
 * Update a setting
 */
const updateSetting = async (req, res) => {
    const { key } = req.params;
    const { value } = req.body;
    const adminId = req.user.id;

    if (value === undefined) {
        return res.status(400).json({ error: 'Value is required.' });
    }

    try {
        // Get the current setting for logging
        const currentSetting = await db('settings')
            .where({ key_name: key })
            .first();

        if (!currentSetting) {
            return res.status(404).json({ error: 'Setting not found.' });
        }

        const oldValue = currentSetting.value;

        // Update the setting
        await db('settings')
            .where({ key_name: key })
            .update({ value });

        // Clear the cache for this setting
        clearCache(key);

        // Log the change
        await logSettingUpdated(adminId, key, oldValue, value);

        res.status(200).json({
            message: 'Setting updated successfully.',
            setting: {
                key_name: key,
                value,
                description: currentSetting.description
            }
        });
    } catch (err) {
        console.error('Error updating setting:', err.message);
        res.status(500).json({ error: 'Failed to update setting.' });
    }
};

/**
 * Create a new setting
 */
const createSetting = async (req, res) => {
    const { key_name, value, description } = req.body;
    const adminId = req.user.id;

    if (!key_name || value === undefined) {
        return res.status(400).json({ error: 'Key name and value are required.' });
    }

    try {
        // Check if setting already exists
        const existingSetting = await db('settings')
            .where({ key_name })
            .first();

        if (existingSetting) {
            return res.status(400).json({ error: 'Setting with this key already exists.' });
        }

        // Create the setting
        const [id] = await db('settings').insert({
            key_name,
            value,
            description: description || null
        });

        // Log the creation
        await logSettingCreated(adminId, key_name);

        res.status(201).json({
            message: 'Setting created successfully.',
            setting: {
                id,
                key_name,
                value,
                description
            }
        });
    } catch (err) {
        console.error('Error creating setting:', err.message);
        res.status(500).json({ error: 'Failed to create setting.' });
    }
};

/**
 * Delete a setting
 */
const deleteSetting = async (req, res) => {
    const { key } = req.params;
    const adminId = req.user.id;

    try {
        const setting = await db('settings')
            .where({ key_name: key })
            .first();

        if (!setting) {
            return res.status(404).json({ error: 'Setting not found.' });
        }

        // Delete the setting
        await db('settings')
            .where({ key_name: key })
            .del();

        // Clear the cache for this setting
        clearCache(key);

        // Log the deletion
        await logSettingDeleted(adminId, key);

        res.status(200).json({ message: 'Setting deleted successfully.' });
    } catch (err) {
        console.error('Error deleting setting:', err.message);
        res.status(500).json({ error: 'Failed to delete setting.' });
    }
};

module.exports = {
    getAllSettings,
    getSetting,
    updateSetting,
    createSetting,
    deleteSetting
};
