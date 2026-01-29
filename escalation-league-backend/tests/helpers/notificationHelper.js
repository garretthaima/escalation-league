const db = require('./testDb');

async function createTestNotification(userId, overrides = {}) {
    const [notificationId] = await db('notifications').insert({
        user_id: userId,
        title: overrides.title || 'Test Notification',
        message: overrides.message || 'This is a test notification',
        type: overrides.type || 'info',
        is_read: overrides.is_read !== undefined ? overrides.is_read : 0,
        read_at: overrides.read_at || null,
        created_at: overrides.created_at || db.fn.now(),
        ...overrides
    });

    return notificationId;
}

async function markNotificationRead(notificationId) {
    return await db('notifications')
        .where('id', notificationId)
        .update({
            is_read: 1,
            read_at: db.fn.now()
        });
}

async function getUserNotifications(userId, filters = {}) {
    let query = db('notifications').where('user_id', userId);

    if (filters.is_read !== undefined) {
        query = query.where('is_read', filters.is_read);
    }

    if (filters.type) {
        query = query.where('type', filters.type);
    }

    return await query.select('*').orderBy('created_at', 'desc');
}

async function deleteNotification(notificationId) {
    return await db('notifications')
        .where('id', notificationId)
        .del();
}

async function getUnreadCount(userId) {
    const result = await db('notifications')
        .where({ user_id: userId, is_read: 0 })
        .count('* as count')
        .first();

    return result.count;
}

module.exports = {
    createTestNotification,
    markNotificationRead,
    getUserNotifications,
    deleteNotification,
    getUnreadCount
};