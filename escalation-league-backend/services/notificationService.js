/**
 * Notification Service
 * Centralized service for creating and managing notifications
 * with automatic WebSocket emission
 */

const db = require('../models/db');
const { emitNotification } = require('../utils/socketEmitter');

/**
 * Create a notification and emit it via WebSocket
 * @param {object} app - Express app instance (for WebSocket)
 * @param {number} userId - Target user ID
 * @param {object} options - Notification options
 * @param {string} options.title - Notification title
 * @param {string} options.message - Notification message (optional)
 * @param {string} options.type - Type: 'info', 'success', 'warning', 'error'
 * @param {string} options.link - URL to navigate to when clicked (optional)
 * @returns {Promise<object>} Created notification
 */
const createNotification = async (app, userId, { title, message = null, type = 'info', link = null }) => {
    const [id] = await db('notifications').insert({
        user_id: userId,
        title,
        message,
        type,
        link,
        is_read: false,
        created_at: db.fn.now()
    });

    const notification = await db('notifications').where({ id }).first();

    // Emit via WebSocket for real-time delivery
    emitNotification(app, userId, notification);

    return notification;
};

/**
 * Create notifications for multiple users
 * @param {object} app - Express app instance
 * @param {number[]} userIds - Array of user IDs
 * @param {object} options - Notification options (same as createNotification)
 * @returns {Promise<object[]>} Created notifications
 */
const createBulkNotifications = async (app, userIds, options) => {
    const notifications = [];
    for (const userId of userIds) {
        const notification = await createNotification(app, userId, options);
        notifications.push(notification);
    }
    return notifications;
};

// ============================================================================
// Pre-built notification types for common events
// ============================================================================

/**
 * Notify user that their league signup was approved
 */
const notifySignupApproved = async (app, userId, leagueName, leagueId) => {
    return createNotification(app, userId, {
        title: `Welcome to ${leagueName}!`,
        message: 'Your signup request has been approved.',
        type: 'success',
        link: `/leagues`
    });
};

/**
 * Notify user that their league signup was rejected
 */
const notifySignupRejected = async (app, userId, leagueName) => {
    return createNotification(app, userId, {
        title: 'Signup Update',
        message: `Your signup request for ${leagueName} was not approved.`,
        type: 'warning',
        link: '/leagues'
    });
};

/**
 * Notify user they've been assigned to a pod
 */
const notifyPodAssigned = async (app, userId, podId, leagueId) => {
    return createNotification(app, userId, {
        title: 'Pod Assigned',
        message: 'You\'ve been assigned to a new pod. Good luck!',
        type: 'info',
        link: `/pods`
    });
};

/**
 * Notify user to confirm game results
 */
const notifyConfirmGame = async (app, userId, podId) => {
    return createNotification(app, userId, {
        title: 'Confirm Your Game',
        message: 'A game result needs your confirmation.',
        type: 'warning',
        link: `/pods`
    });
};

/**
 * Notify user that a game was fully confirmed
 */
const notifyGameComplete = async (app, userId, podId) => {
    return createNotification(app, userId, {
        title: 'Game Complete',
        message: 'Your game has been confirmed by all players.',
        type: 'success',
        link: `/pods/history`
    });
};

/**
 * Get all admin user IDs (super_admin and league_admin)
 * @returns {Promise<number[]>} Array of admin user IDs
 */
const getAdminUserIds = async () => {
    const admins = await db('users')
        .whereIn('role_id', [1, 2]) // super_admin = 1, league_admin = 2
        .select('id');
    return admins.map(a => a.id);
};

/**
 * Notify all admins about an event
 * @param {object} app - Express app instance
 * @param {object} options - Notification options
 * @returns {Promise<object[]>} Created notifications
 */
const notifyAdmins = async (app, options) => {
    const adminIds = await getAdminUserIds();
    return createBulkNotifications(app, adminIds, options);
};

// ============================================================================
// Notification type templates (for quick use with createNotification)
// ============================================================================
const notificationTypes = {
    signupApproved: (leagueName) => ({
        title: `Welcome to ${leagueName}!`,
        message: 'Your signup request has been approved.',
        type: 'success',
        link: '/leagues'
    }),
    signupRejected: (leagueName) => ({
        title: 'Signup Update',
        message: `Your signup request for ${leagueName} was not approved.`,
        type: 'warning',
        link: '/leagues'
    }),
    newSignupRequest: (userName, leagueName) => ({
        title: 'New Signup Request',
        message: `${userName} has requested to join ${leagueName}.`,
        type: 'info',
        link: '/admin'
    }),
    podAssigned: (podId, link) => ({
        title: 'Pod Assigned',
        message: `You've been assigned to Pod #${podId}. Good luck!`,
        type: 'info',
        link: link || '/pods'
    }),
    confirmGame: (podId) => ({
        title: 'Confirm Your Game',
        message: 'A game result needs your confirmation.',
        type: 'warning',
        link: `/pods?podId=${podId}`
    }),
    gameComplete: (podId, result) => ({
        title: 'Game Complete',
        message: `Pod #${podId} is complete. You ${result}!`,
        type: result === 'won' ? 'success' : 'info',
        link: `/pods?podId=${podId}`
    })
};

module.exports = {
    createNotification,
    createBulkNotifications,
    getAdminUserIds,
    notifyAdmins,
    notifySignupApproved,
    notifySignupRejected,
    notifyPodAssigned,
    notifyConfirmGame,
    notifyGameComplete,
    notificationTypes
};
