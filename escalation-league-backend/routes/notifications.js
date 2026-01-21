const express = require('express');
const router = express.Router();
const {
    getNotifications,
    getUnreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification
} = require('../controllers/notificationsController');
const authenticateToken = require('../middlewares/authentication');

// Get notifications (paginated)
router.get('/', authenticateToken, getNotifications);

// Get unread count for badge
router.get('/unread-count', authenticateToken, getUnreadCount);

// Mark single notification as read
router.put('/:id/read', authenticateToken, markAsRead);

// Mark all notifications as read
router.put('/read-all', authenticateToken, markAllAsRead);

// Delete a notification
router.delete('/:id', authenticateToken, deleteNotification);

module.exports = router;