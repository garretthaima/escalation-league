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

// Check authorization for specific permissions
export const checkAuthorization = async (requiredPermissions) => {
    console.log('Payload for /authorize:', { requiredPermissions }); // Debugging log

    const response = await axiosInstance.post('/auth/authorize', { requiredPermissions });
    return response.data.authorized; // Returns true if authorized
};

