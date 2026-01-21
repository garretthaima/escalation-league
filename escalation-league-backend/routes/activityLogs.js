const express = require('express');
const router = express.Router();
const {
    getActivityLogs,
    getMyActivityLogs,
    getUserActivityLogs,
    getActionTypes
} = require('../controllers/activityLogsController');
const authenticateToken = require('../middlewares/authentication');
const authorizePermission = require('../middlewares/authorizePermission');

// Get current user's own activity logs
router.get(
    '/me',
    authenticateToken,
    authorizePermission(['activity_logs_read_own']),
    getMyActivityLogs
);

// Get all activity logs (admin only)
router.get(
    '/',
    authenticateToken,
    authorizePermission(['activity_logs_read_all']),
    getActivityLogs
);

// Get distinct action types for filtering (admin only)
router.get(
    '/action-types',
    authenticateToken,
    authorizePermission(['activity_logs_read_all']),
    getActionTypes
);

// Get activity logs for a specific user (admin only)
router.get(
    '/user/:id',
    authenticateToken,
    authorizePermission(['activity_logs_read_all']),
    getUserActivityLogs
);

module.exports = router;
