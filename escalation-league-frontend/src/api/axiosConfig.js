import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_BACKEND_URL;

const axiosInstance = axios.create({
    baseURL: API_BASE_URL, // Set the base URL for all API calls
});

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
        if (error.response && error.response.status === 403) {
            console.warn('403 Forbidden response intercepted:', error.response);
            // Do not redirect automatically; let the component handle it
        }
        return Promise.reject(error); // Pass the error back to the calling code
    }
);

export default axiosInstance;