import axios from 'axios';

// Use env vars, with auto-detect fallback for local dev
let API_BASE_URL = process.env.REACT_APP_API_URL || process.env.REACT_APP_BACKEND_URL;

if (!API_BASE_URL) {
    // Local development fallback when running npm start without env vars
    const hostname = window.location.hostname;
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
        API_BASE_URL = 'http://localhost:4000/api';
    } else {
        console.warn('No API URL configured and not on localhost. Requests may fail.');
        API_BASE_URL = '/api'; // Relative path fallback
    }
}

const axiosInstance = axios.create({
    baseURL: API_BASE_URL, // Set the base URL for all API calls
});

let isRedirecting = false; // Flag to prevent multiple redirects

// Add a request interceptor to include the Authorization header
axiosInstance.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
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
            console.warn('Session expired. Redirecting to sign-in...');

            // Clear the token and redirect to the sign-in page
            localStorage.removeItem('token');
            localStorage.removeItem('refreshToken');
            if (!isRedirecting) {
                isRedirecting = true;
                // Use setTimeout to allow any pending UI updates to complete
                setTimeout(() => {
                    window.location.href = '/signin';
                }, 100);
            }
        }
        return Promise.reject(error); // Pass the error back to the calling code
    }
);

export default axiosInstance;