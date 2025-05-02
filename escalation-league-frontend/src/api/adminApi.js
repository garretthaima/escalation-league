import axiosInstance from './axiosConfig';

// Fetch all users
export const getAllUsers = async () => {
    const response = await axiosInstance.get('/user/all');
    return response.data;
};

// Deactivate a user
export const deactivateUser = async (userId) => {
    const response = await axiosInstance.put(`/user/deactivate/${userId}`);
    return response.data;
};

// Activate a user
export const activateUser = async (userId) => {
    const response = await axiosInstance.put(`/user/activate/${userId}`);
    return response.data;
};

// Ban a user
export const banUser = async (userId, banReason) => {
    const response = await axiosInstance.put(`/user/ban/${userId}`, { ban_reason: banReason });
    return response.data;
};

// Unban a user
export const unbanUser = async (userId) => {
    const response = await axiosInstance.put(`/user/unban/${userId}`);
    return response.data;
};

// Get user details
export const getUserDetails = async (userId) => {
    const response = await axiosInstance.get(`/user/${userId}`);
    return response.data;
};

// Reset user password
export const resetUserPassword = async (userId, newPassword) => {
    const response = await axiosInstance.put(`/user/reset-password/${userId}`, { newPassword });
    return response.data;
};

// Get league report
export const getLeagueReport = async () => {
    const response = await axiosInstance.get('/reports/leagues');
    return response.data;
};

// Get pending role requests
export const getPendingRoleRequests = async () => {
    const response = await axiosInstance.get('/admin/role-requests');
    return response.data;
};

// Review role request
export const reviewRoleRequest = async (requestId, status, adminComment = '') => {
    const response = await axiosInstance.post('/admin/role-requests/review', {
        requestId,
        status,
        adminComment,
    });
    return response.data;
};