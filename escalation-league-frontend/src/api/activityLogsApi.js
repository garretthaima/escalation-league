import axiosInstance from './axiosConfig';

/**
 * Fetch all activity logs (admin only)
 * @param {Object} params - Query parameters for filtering and pagination
 * @param {number} [params.page=1] - Page number
 * @param {number} [params.limit=50] - Items per page
 * @param {string} [params.action] - Filter by action type
 * @param {number} [params.userId] - Filter by user ID
 * @param {string} [params.startDate] - Filter by start date
 * @param {string} [params.endDate] - Filter by end date
 * @returns {Promise<Object>} - Paginated activity logs
 */
export const getActivityLogs = async (params = {}) => {
    try {
        const response = await axiosInstance.get('/activity-logs', { params });
        return response.data;
    } catch (error) {
        console.error('Error fetching activity logs:', error);
        throw error;
    }
};

/**
 * Fetch the current user's own activity logs
 * @param {Object} params - Query parameters for pagination
 * @param {number} [params.page=1] - Page number
 * @param {number} [params.limit=20] - Items per page
 * @returns {Promise<Object>} - Paginated activity logs
 */
export const getMyActivityLogs = async (params = {}) => {
    try {
        const response = await axiosInstance.get('/activity-logs/me', { params });
        return response.data;
    } catch (error) {
        console.error('Error fetching user activity logs:', error);
        throw error;
    }
};

/**
 * Fetch activity logs for a specific user (admin only)
 * @param {number} userId - The user ID to fetch logs for
 * @param {Object} params - Query parameters for pagination
 * @param {number} [params.page=1] - Page number
 * @param {number} [params.limit=50] - Items per page
 * @returns {Promise<Object>} - Paginated activity logs with user info
 */
export const getUserActivityLogs = async (userId, params = {}) => {
    try {
        const response = await axiosInstance.get(`/activity-logs/user/${userId}`, { params });
        return response.data;
    } catch (error) {
        console.error('Error fetching user activity logs:', error);
        throw error;
    }
};

/**
 * Fetch distinct action types for filtering
 * @returns {Promise<Object>} - List of action types
 */
export const getActionTypes = async () => {
    try {
        const response = await axiosInstance.get('/activity-logs/action-types');
        return response.data;
    } catch (error) {
        console.error('Error fetching action types:', error);
        throw error;
    }
};
