const db = require('../models/db');

/**
 * Get paginated notifications for the current user
 */
const getNotifications = async (req, res) => {
    const userId = req.user.id;
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const offset = parseInt(req.query.offset) || 0;

    try {
        const notifications = await db('notifications')
            .where({ user_id: userId })
            .orderBy('created_at', 'desc')
            .limit(limit)
            .offset(offset);

        const totalResult = await db('notifications')
            .where({ user_id: userId })
            .count('* as count')
            .first();

        res.status(200).json({
            notifications,
            total: totalResult.count,
            limit,
            offset
        });
    } catch (err) {
        console.error('Error fetching notifications:', err.message);
        res.status(500).json({ error: 'Failed to fetch notifications.' });
    }
};

/**
 * Get unread notification count for badge
 */
const getUnreadCount = async (req, res) => {
    const userId = req.user.id;

    try {
        const result = await db('notifications')
            .where({ user_id: userId, is_read: false })
            .count('* as count')
            .first();

        res.status(200).json({ count: parseInt(result.count) || 0 });
    } catch (err) {
        console.error('Error fetching unread count:', err.message);
        res.status(500).json({ error: 'Failed to fetch unread count.' });
    }
};

/**
 * Mark a single notification as read
 */
const markAsRead = async (req, res) => {
    const userId = req.user.id;
    const { id } = req.params;

    try {
        const notification = await db('notifications')
            .where({ id, user_id: userId })
            .first();

        if (!notification) {
            return res.status(404).json({ error: 'Notification not found.' });
        }

        if (notification.is_read) {
            return res.status(200).json({ message: 'Already marked as read.' });
        }

        await db('notifications')
            .where({ id, user_id: userId })
            .update({
                is_read: true,
                read_at: db.fn.now()
            });

        res.status(200).json({ message: 'Notification marked as read.' });
    } catch (err) {
        console.error('Error marking notification as read:', err.message);
        res.status(500).json({ error: 'Failed to mark notification as read.' });
    }
};

/**
 * Mark all notifications as read for the current user
 */
const markAllAsRead = async (req, res) => {
    const userId = req.user.id;

    try {
        const updated = await db('notifications')
            .where({ user_id: userId, is_read: false })
            .update({
                is_read: true,
                read_at: db.fn.now()
            });

        res.status(200).json({
            message: 'All notifications marked as read.',
            count: updated
        });
    } catch (err) {
        console.error('Error marking all notifications as read:', err.message);
        res.status(500).json({ error: 'Failed to mark notifications as read.' });
    }
};

/**
 * Delete a single notification
 */
const deleteNotification = async (req, res) => {
    const userId = req.user.id;
    const { id } = req.params;

    try {
        const deleted = await db('notifications')
            .where({ id, user_id: userId })
            .del();

        if (!deleted) {
            return res.status(404).json({ error: 'Notification not found.' });
        }

        res.status(200).json({ message: 'Notification deleted.' });
    } catch (err) {
        console.error('Error deleting notification:', err.message);
        res.status(500).json({ error: 'Failed to delete notification.' });
    }
};

module.exports = {
    getNotifications,
    getUnreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification
};