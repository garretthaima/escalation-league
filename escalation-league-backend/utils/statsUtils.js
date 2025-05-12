const db = require('../models/db');

/**
 * Updates stats in a given table dynamically.
 * @param {string} tableName - The name of the table to update.
 * @param {object} conditions - The WHERE conditions for the update query.
 * @param {object} stats - The stats to update (e.g., wins, losses, draws).
 * @returns {Promise<void>}
 */
const updateStats = async (tableName, conditions, stats) => {
    if (!tableName || !conditions || !stats) {
        throw new Error('Table name, conditions, and stats are required.');
    }

    // Build the updates object dynamically
    const updates = {};
    for (const [key, value] of Object.entries(stats)) {
        if (value !== undefined) {
            updates[key] = db.raw(`${key} + ?`, [value]);
        }
    }

    if (Object.keys(updates).length === 0) {
        throw new Error('No valid stats provided for update.');
    }

    // Perform the update query
    const result = await db(tableName).where(conditions).update(updates);

    if (result === 0) {
        throw new Error('No rows were updated. Check the conditions.');
    }
};

module.exports = {
    updateStats,
};