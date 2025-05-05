import axiosInstance from './axiosConfig';

// Fetch the authenticated user's profile
export const getUserProfile = async () => {
    try {
        const response = await axiosInstance.get('/users/profile');
        return response.data; // Return the user's profile data
    } catch (error) {
        console.error('Error fetching user profile:', error);
        throw error; // Re-throw the error to be handled by the calling code
    }
};

// Update the authenticated user's profile
export const updateUserProfile = async (profileData) => {
    try {
        const response = await axiosInstance.put('/users/update', profileData);
        return response.data; // Return the updated profile data
    } catch (error) {
        console.error('Error updating user profile:', error);
        throw error; // Re-throw the error to be handled by the calling code
    }
};

// Delete the authenticated user's account
export const deleteUserAccount = async () => {
    try {
        const response = await axiosInstance.delete('/users/delete');
        return response.data; // Return the success message
    } catch (error) {
        console.error('Error deleting user account:', error);
        throw error; // Re-throw the error to be handled by the calling code
    }
};

// Change the authenticated user's password
export const changePassword = async (passwordData) => {
    try {
        const response = await axiosInstance.put('/users/change-password', passwordData);
        return response.data; // Return the success message
    } catch (error) {
        console.error('Error changing password:', error);
        throw error; // Re-throw the error to be handled by the calling code
    }
};

// Update the authenticated user's stats
export const updateUserStats = async (statsData) => {
    try {
        const response = await axiosInstance.put('/users/update-stats', statsData);
        return response.data; // Return the updated stats data
    } catch (error) {
        console.error('Error updating user stats:', error);
        throw error; // Re-throw the error to be handled by the calling code
    }
};

// Fetch the authenticated user's permissions
export const getUserPermissions = async () => {
    try {
        const response = await axiosInstance.get('/users/permissions');
        return response.data; // Return the user's permissions
    } catch (error) {
        console.error('Error fetching user permissions:', error);
        throw error; // Re-throw the error to be handled by the calling code
    }
};

// Fetch basic information about a specific user by ID
export const getUserSummary = async (userId) => {
    try {
        const response = await axiosInstance.get(`/users/profile/${userId}`);
        return response.data; // Return the user's basic information
    } catch (error) {
        console.error(`Error fetching user summary for user ID ${userId}:`, error);
        throw error; // Re-throw the error to be handled by the calling code
    }
};