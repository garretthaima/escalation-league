import axios from 'axios';

const API_BASE_URL = `${process.env.REACT_APP_BACKEND_URL}/auth`; // Append 'auth/' to the base URL

// Register a new user
export const registerUser = async (userData) => {
    try {
        const response = await axios.post(`${API_BASE_URL}/register`, userData);
        return response.data;
    } catch (error) {
        console.error('Error registering user:', error);
        throw error;
    }
};

// Login a user
export const loginUser = async (credentials) => {
    try {
        const response = await axios.post(`${API_BASE_URL}/login`, credentials);
        return response.data;
    } catch (error) {
        console.error('Error logging in user:', error);
        throw error;
    }
};

// Google Authentication
export const googleAuth = async (token) => {
    try {
        const response = await axios.post(`${API_BASE_URL}/google-auth`, { token });
        return response.data;
    } catch (error) {
        console.error('Error with Google authentication:', error);
        throw error;
    }
};

// Verify Google Token
export const verifyGoogleToken = async (token) => {
    try {
        const response = await axios.post(`${API_BASE_URL}/verify-google-token`, { token });
        return response.data;
    } catch (error) {
        console.error('Error verifying Google token:', error);
        throw error;
    }
};

// Fetch user profile
export const getUserProfile = async () => {
    try {
        const response = await axios.get(`${API_BASE_URL}/profile`, {
            headers: {
                Authorization: `Bearer ${localStorage.getItem('token')}`,
            },
        });
        return response.data;
    } catch (error) {
        console.error('Error fetching user profile:', error);
        throw error;
    }
};

// Update user profile
export const updateUserProfile = async (profileData) => {
    try {
        const response = await axios.put(`${API_BASE_URL}/update`, profileData, {
            headers: {
                Authorization: `Bearer ${localStorage.getItem('token')}`,
            },
        });
        return response.data;
    } catch (error) {
        console.error('Error updating user profile:', error);
        throw error;
    }
};

// Delete user account
export const deleteUserAccount = async () => {
    try {
        const response = await axios.delete(`${API_BASE_URL}/delete`, {
            headers: {
                Authorization: `Bearer ${localStorage.getItem('token')}`,
            },
        });
        return response.data;
    } catch (error) {
        console.error('Error deleting user account:', error);
        throw error;
    }
};

// Change user password
export const changePassword = async (passwordData) => {
    try {
        const response = await axios.put(`${API_BASE_URL}/change-password`, passwordData, {
            headers: {
                Authorization: `Bearer ${localStorage.getItem('token')}`,
            },
        });
        return response.data;
    } catch (error) {
        console.error('Error changing password:', error);
        throw error;
    }
};