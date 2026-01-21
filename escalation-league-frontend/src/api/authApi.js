import axiosInstance from './axiosConfig';

// Register a new user
export const registerUser = async (userData) => {
    const response = await axiosInstance.post('/auth/register', userData);
    return response.data;
};

// Login a user
export const loginUser = async (credentials) => {
    const response = await axiosInstance.post('/auth/login', credentials);
    const { token, refreshToken } = response.data;

    // Store both tokens in local storage
    localStorage.setItem('token', token);
    if (refreshToken) {
        localStorage.setItem('refreshToken', refreshToken);
    }

    return response.data;
};

// Google Authentication
export const googleAuth = async (token) => {
    const response = await axiosInstance.post('/auth/google-auth', { token });
    const { token: jwtToken, refreshToken } = response.data;

    // Store both tokens in local storage
    localStorage.setItem('token', jwtToken);
    if (refreshToken) {
        localStorage.setItem('refreshToken', refreshToken);
    }

    return response.data;
};

// Refresh access token using refresh token
export const refreshAccessToken = async () => {
    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) {
        throw new Error('No refresh token available');
    }

    const response = await axiosInstance.post('/auth/refresh', { refreshToken });
    const { token, refreshToken: newRefreshToken } = response.data;

    // Update both tokens
    localStorage.setItem('token', token);
    if (newRefreshToken) {
        localStorage.setItem('refreshToken', newRefreshToken);
    }

    return response.data;
};

// Logout - revoke refresh token on server and clear local storage
export const logoutUser = async () => {
    const refreshToken = localStorage.getItem('refreshToken');

    if (refreshToken) {
        try {
            await axiosInstance.post('/auth/logout', { refreshToken });
        } catch (err) {
            // Continue with local cleanup even if API call fails
            console.warn('Logout API call failed:', err);
        }
    }

    // Clear local storage
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
};

// Logout from all devices
export const logoutAllDevices = async () => {
    await axiosInstance.post('/auth/logout-all');

    // Clear local storage
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
};

// Check authorization for specific permissions
export const checkAuthorization = async (requiredPermissions) => {
    const response = await axiosInstance.post('/auth/authorize', { requiredPermissions });
    return response.data.authorized; // Returns true if authorized
};
