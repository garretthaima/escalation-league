import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_BACKEND_URL;

const axiosInstance = axios.create({
    baseURL: API_BASE_URL, // Set the base URL for all API calls
});

let isRedirecting = false; // Flag to prevent multiple redirects

// Add a request interceptor to include the Authorization header
axiosInstance.interceptors.request.use(
    async (config) => {
        const token = localStorage.getItem('token');
        const refreshToken = localStorage.getItem('refreshToken'); // Store refresh token if applicable

        if (token) {
            const { exp } = JSON.parse(atob(token.split('.')[1])); // Decode JWT to get expiration
            if (Date.now() >= exp * 1000 && refreshToken) {
                // Token has expired, attempt to refresh it
                try {
                    const response = await axios.post(`${API_BASE_URL}/auth/refresh`, { refreshToken });
                    const newToken = response.data.token;
                    localStorage.setItem('token', newToken); // Update token in localStorage
                    config.headers.Authorization = `Bearer ${newToken}`;
                } catch (err) {
                    console.error('Failed to refresh token:', err);
                    localStorage.removeItem('token');
                    localStorage.removeItem('refreshToken');
                    if (!isRedirecting) {
                        isRedirecting = true;
                        window.location.href = '/signin'; // Redirect to sign-in page
                    }
                }
            } else {
                config.headers.Authorization = `Bearer ${token}`;
            }
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Add a response interceptor to handle errors globally
axiosInstance.interceptors.response.use(
    (response) => response, // Pass through successful responses
    (error) => {
        if (error.response && error.response.status === 401) {
            // Token is invalid or expired
            console.warn('401 Unauthorized response intercepted:', error.response);

            // Clear the token and redirect to the sign-in page
            localStorage.removeItem('token');
            localStorage.removeItem('refreshToken');
            if (!isRedirecting) {
                isRedirecting = true;
                window.location.href = '/signin'; // Redirect to sign-in page
            }
        }
        return Promise.reject(error); // Pass the error back to the calling code
    }
);

export default axiosInstance;