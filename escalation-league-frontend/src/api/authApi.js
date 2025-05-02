import axiosInstance from './axiosConfig';

// Register a new user
export const registerUser = async (userData) => {
    const response = await axiosInstance.post('/auth/register', userData);
    return response.data;
};

// Login a user
export const loginUser = async (credentials) => {
    const response = await axiosInstance.post('/auth/login', credentials);
    const { token } = response.data;

    // Store token in local storage
    localStorage.setItem('token', token);

    return response.data;
};

// Google Authentication
export const googleAuth = async (token) => {
    const response = await axiosInstance.post('/auth/google-auth', { token });
    const { token: jwtToken } = response.data;

    // Store token in local storage
    localStorage.setItem('token', jwtToken);

    return response.data;
};
// Fetch user profile
export const getUserProfile = async () => {
    try {
        const response = await axiosInstance.get('/auth/profile');
        return response.data;
    } catch (error) {
        console.error('Error fetching user profile:', error.response?.data || error.message); // Log the error response
        throw error;
    }
};

// Update user profile
export const updateUserProfile = async (profileData) => {
    const response = await axiosInstance.put('/auth/update', profileData);
    return response.data;
};

// Delete user account
export const deleteUserAccount = async () => {
    const response = await axiosInstance.delete('/auth/delete');
    return response.data;
};

// Change user password
export const changePassword = async (passwordData) => {
    const response = await axiosInstance.put('/auth/change-password', passwordData);
    return response.data;
};

// Fetch user permissions and role hierarchy
export const getUserPermissions = async () => {
    const response = await axiosInstance.get('/auth/permissions');
    return response.data; // { accessibleRoles: [...], permissions: [...] }
};

// Check authorization for specific permissions
export const checkAuthorization = async (requiredPermissions) => {
    console.log('Payload for /authorize:', { requiredPermissions }); // Debugging log

    const response = await axiosInstance.post('/auth/authorize', { requiredPermissions });
    return response.data.authorized; // Returns true if authorized
};

export const updateUserStats = async (statsData) => {
    const response = await axiosInstance.put('/auth/update-stats', statsData);
    return response.data;
};