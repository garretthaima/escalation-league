import axios from 'axios';

const API_BASE_URL = `${process.env.REACT_APP_BACKEND_URL}`; // Append 'admin/' to the base URL

// Fetch all users
export const getAllUsers = async () => {
    try {
        const response = await axios.get(`${API_BASE_URL}/user/all`);
        return response.data;
    } catch (error) {
        console.error('Error fetching all users:', error);
        throw error;
    }
};

// Deactivate a user
export const deactivateUser = async (userId) => {
    try {
        const response = await axios.put(`${API_BASE_URL}/user/deactivate/${userId}`);
        return response.data;
    } catch (error) {
        console.error(`Error deactivating user with ID ${userId}:`, error);
        throw error;
    }
};

// Activate a user
export const activateUser = async (userId) => {
    try {
        const response = await axios.put(`${API_BASE_URL}/user/activate/${userId}`);
        return response.data;
    } catch (error) {
        console.error(`Error activating user with ID ${userId}:`, error);
        throw error;
    }
};

// Ban a user
export const banUser = async (userId, banReason) => {
    try {
        const response = await axios.put(`${API_BASE_URL}/user/ban/${userId}`, { ban_reason: banReason });
        return response.data;
    } catch (error) {
        console.error(`Error banning user with ID ${userId}:`, error);
        throw error;
    }
};

// Unban a user
export const unbanUser = async (userId) => {
    try {
        const response = await axios.put(`${API_BASE_URL}/user/unban/${userId}`);
        return response.data;
    } catch (error) {
        console.error(`Error unbanning user with ID ${userId}:`, error);
        throw error;
    }
};

// Get user details
export const getUserDetails = async (userId) => {
    try {
        const response = await axios.get(`${API_BASE_URL}/user/${userId}`);
        return response.data;
    } catch (error) {
        console.error(`Error fetching details for user with ID ${userId}:`, error);
        throw error;
    }
};

// Reset user password
export const resetUserPassword = async (userId, newPassword) => {
    try {
        const response = await axios.put(`${API_BASE_URL}/user/reset-password/${userId}`, { newPassword });
        return response.data;
    } catch (error) {
        console.error(`Error resetting password for user with ID ${userId}:`, error);
        throw error;
    }
};

// Get league report
export const getLeagueReport = async () => {
    try {
        const response = await axios.get(`${API_BASE_URL}/reports/leagues`);
        return response.data;
    } catch (error) {
        console.error('Error fetching league report:', error);
        throw error;
    }
};