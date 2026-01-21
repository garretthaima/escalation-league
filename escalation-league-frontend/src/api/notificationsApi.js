import axiosInstance from './axiosConfig';

/**
 * Get paginated notifications for the current user
 * @param {number} limit - Max notifications to return (default 20)
 * @param {number} offset - Offset for pagination (default 0)
 * @returns {Promise<{notifications: Array, total: number, limit: number, offset: number}>}
 */
export const getNotifications = async (limit = 20, offset = 0) => {
    const response = await axiosInstance.get(`/notifications?limit=${limit}&offset=${offset}`);
    return response.data;
};

/**
 * Get unread notification count for badge display
 * @returns {Promise<{count: number}>}
 */
export const getUnreadCount = async () => {
    const response = await axiosInstance.get('/notifications/unread-count');
    return response.data;
};

/**
 * Mark a single notification as read
 * @param {number} id - Notification ID
 * @returns {Promise<{message: string}>}
 */
export const markAsRead = async (id) => {
    const response = await axiosInstance.put(`/notifications/${id}/read`);
    return response.data;
};

/**
 * Mark all notifications as read
 * @returns {Promise<{message: string, count: number}>}
 */
export const markAllAsRead = async () => {
    const response = await axiosInstance.put('/notifications/read-all');
    return response.data;
};

/**
 * Delete a notification
 * @param {number} id - Notification ID
 * @returns {Promise<{message: string}>}
 */
export const deleteNotification = async (id) => {
    const response = await axiosInstance.delete(`/notifications/${id}`);
    return response.data;
};