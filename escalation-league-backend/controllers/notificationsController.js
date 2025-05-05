const db = require('../models/db');

const getNotifications = async (req, res) => {
    const userId = req.user.id;

    try {
        const notifications = await db('notifications')
            .where({ user_id: userId })
            .orderBy('created_at', 'desc');

        res.status(200).json(notifications);
    } catch (err) {
        console.error('Error fetching notifications:', err.message);
        res.status(500).json({ error: 'Failed to fetch notifications.' });
    }
};

module.exports = { getNotifications };