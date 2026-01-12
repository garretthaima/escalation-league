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

// Fetch a specific user setting by key_name
export const getUserSetting = async (key_name) => {
    try {
        const response = await axiosInstance.get('/users/settings', {
            params: { key_name }, // Pass key_name as a query parameter
        });
        return response.data; // Return the setting data
    } catch (error) {
        console.error(`Error fetching user setting "${key_name}":`, error);
        throw error; // Re-throw the error to be handled by the calling code
    }
};

// Update a specific user setting by key_name
export const updateUserSetting = async (key_name, value) => {
    try {
        const response = await axiosInstance.put('/users/settings', {
            key_name, // Include key_name in the request body
            value,    // Include value in the request body
        });
        return response.data; // Return the success message
    } catch (error) {
        console.error(`Error updating user setting "${key_name}":`, error);
        throw error; // Re-throw the error to be handled by the calling code
    }
};

// Discord Integration APIs

// Get Discord OAuth URL for linking account
export const getDiscordAuthUrl = async () => {
    try {
        const response = await axiosInstance.get('/auth/discord/url');
        return response.data; // Returns { url: 'discord oauth url' }
    } catch (error) {
        console.error('Error getting Discord auth URL:', error);
        throw error;
    }
};

// Get Discord link status
export const getDiscordStatus = async () => {
    try {
        const response = await axiosInstance.get('/auth/discord/status');
        return response.data; // Returns { linked, discord_username, discord_avatar }
    } catch (error) {
        console.error('Error getting Discord status:', error);
        throw error;
    }
};

// Unlink Discord account
export const unlinkDiscord = async () => {
    try {
        const response = await axiosInstance.delete('/auth/discord/unlink');
        return response.data; // Returns { success, message }
    } catch (error) {
        console.error('Error unlinking Discord:', error);
        throw error;
    }
};