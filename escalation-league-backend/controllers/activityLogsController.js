/**
 * Activity Logs Controller
 * Handles API endpoints for viewing activity logs
 */

const db = require('../models/db');

/**
 * Safely parse metadata - handles both string and object formats
 */
const parseMetadata = (metadata) => {
    if (!metadata) return null;
    if (typeof metadata === 'object') return metadata;
    try {
        return JSON.parse(metadata);
    } catch {
        return metadata;
    }
};

/**
 * Get all activity logs (admin only)
 * Supports pagination and filtering
 */
const getActivityLogs = async (req, res) => {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 50));
    const offset = (page - 1) * limit;
    const { action, userId, startDate, endDate } = req.query;

    try {
        let query = db('activity_logs')
            .join('users', 'activity_logs.user_id', 'users.id')
            .select(
                'activity_logs.id',
                'activity_logs.user_id',
                'activity_logs.action',
                'activity_logs.timestamp',
                'activity_logs.metadata',
                'users.firstname',
                'users.lastname',
                'users.email'
            );

        // Apply filters
        if (action) {
            query = query.where('activity_logs.action', 'like', `%${action}%`);
        }
        if (userId) {
            query = query.where('activity_logs.user_id', userId);
        }
        if (startDate) {
            query = query.where('activity_logs.timestamp', '>=', startDate);
        }
        if (endDate) {
            query = query.where('activity_logs.timestamp', '<=', endDate);
        }

        // Get total count for pagination (with same filters)
        let countQuery = db('activity_logs');
        if (action) countQuery = countQuery.where('action', 'like', `%${action}%`);
        if (userId) countQuery = countQuery.where('user_id', userId);
        if (startDate) countQuery = countQuery.where('timestamp', '>=', startDate);
        if (endDate) countQuery = countQuery.where('timestamp', '<=', endDate);

        const totalResult = await countQuery.count('* as count').first();
        const total = parseInt(totalResult.count);

        // Get paginated results
        const logs = await query
            .orderBy('activity_logs.timestamp', 'desc')
            .limit(limit)
            .offset(offset);

        // Parse metadata JSON
        const parsedLogs = logs.map(log => ({
            ...log,
            metadata: parseMetadata(log.metadata)
        }));

        res.status(200).json({
            logs: parsedLogs,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        });
    } catch (err) {
        console.error('Error fetching activity logs:', err.message);
        res.status(500).json({ error: 'Failed to fetch activity logs.' });
    }
};

/**
 * Get current user's own activity logs
 */
const getMyActivityLogs = async (req, res) => {
    const userId = req.user.id;
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;

    try {
        const totalResult = await db('activity_logs')
            .where({ user_id: userId })
            .count('* as count')
            .first();
        const total = parseInt(totalResult.count);

        const logs = await db('activity_logs')
            .where({ user_id: userId })
            .select('id', 'action', 'timestamp', 'metadata')
            .orderBy('timestamp', 'desc')
            .limit(limit)
            .offset(offset);

        // Parse metadata JSON
        const parsedLogs = logs.map(log => ({
            ...log,
            metadata: parseMetadata(log.metadata)
        }));

        res.status(200).json({
            logs: parsedLogs,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        });
    } catch (err) {
        console.error('Error fetching user activity logs:', err.message);
        res.status(500).json({ error: 'Failed to fetch activity logs.' });
    }
};

/**
 * Get activity logs for a specific user (admin only)
 */
const getUserActivityLogs = async (req, res) => {
    const { id } = req.params;
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 50));
    const offset = (page - 1) * limit;

    try {
        // Verify user exists
        const user = await db('users').where({ id }).first();
        if (!user) {
            return res.status(404).json({ error: 'User not found.' });
        }

        const totalResult = await db('activity_logs')
            .where({ user_id: id })
            .count('* as count')
            .first();
        const total = parseInt(totalResult.count);

        const logs = await db('activity_logs')
            .where({ user_id: id })
            .select('id', 'action', 'timestamp', 'metadata')
            .orderBy('timestamp', 'desc')
            .limit(limit)
            .offset(offset);

        // Parse metadata JSON
        const parsedLogs = logs.map(log => ({
            ...log,
            metadata: parseMetadata(log.metadata)
        }));

        res.status(200).json({
            user: {
                id: user.id,
                firstname: user.firstname,
                lastname: user.lastname,
                email: user.email
            },
            logs: parsedLogs,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        });
    } catch (err) {
        console.error('Error fetching user activity logs:', err.message);
        res.status(500).json({ error: 'Failed to fetch activity logs.' });
    }
};

/**
 * Get distinct action types for filtering
 */
const getActionTypes = async (req, res) => {
    try {
        const actions = await db('activity_logs')
            .distinct('action')
            .orderBy('action', 'asc');

        res.status(200).json({
            actions: actions.map(a => a.action)
        });
    } catch (err) {
        console.error('Error fetching action types:', err.message);
        res.status(500).json({ error: 'Failed to fetch action types.' });
    }
};

module.exports = {
    getActivityLogs,
    getMyActivityLogs,
    getUserActivityLogs,
    getActionTypes
};
