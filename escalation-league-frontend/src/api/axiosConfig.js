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
    baseURL: API_BASE_URL,
});

// State for token refresh handling
let isRefreshing = false;
let failedQueue = [];
let isRedirecting = false;

// Process queued requests after token refresh
const processQueue = (error, token = null) => {
    failedQueue.forEach(prom => {
        if (error) {
            prom.reject(error);
        } else {
            prom.resolve(token);
        }
    });
    failedQueue = [];
};

// Handle auth failure - clear tokens and redirect
const handleAuthFailure = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');

    if (!isRedirecting) {
        isRedirecting = true;
        console.warn('Session expired. Redirecting to sign-in...');
        setTimeout(() => {
            window.location.href = '/signin';
        }, 100);
    }

    return Promise.reject(new Error('Session expired'));
};

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

// Add a response interceptor with automatic token refresh
axiosInstance.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        // Check if this is a 401 error and we haven't already retried
        if (error.response?.status === 401 && !originalRequest._retry) {
            // Don't retry the refresh endpoint itself
            if (originalRequest.url?.includes('/auth/refresh')) {
                return handleAuthFailure();
            }

            // If already refreshing, queue this request
            if (isRefreshing) {
                return new Promise((resolve, reject) => {
                    failedQueue.push({ resolve, reject });
                }).then(token => {
                    originalRequest.headers.Authorization = `Bearer ${token}`;
                    return axiosInstance(originalRequest);
                }).catch(err => {
                    return Promise.reject(err);
                });
            }

            originalRequest._retry = true;
            isRefreshing = true;

            const refreshToken = localStorage.getItem('refreshToken');
            if (!refreshToken) {
                isRefreshing = false;
                return handleAuthFailure();
            }

            try {
                // Call refresh endpoint directly (bypass interceptors to avoid loops)
                const response = await axios.post(
                    `${API_BASE_URL}/auth/refresh`,
                    { refreshToken }
                );

                const { token, refreshToken: newRefreshToken } = response.data;

                // Store new tokens
                localStorage.setItem('token', token);
                if (newRefreshToken) {
                    localStorage.setItem('refreshToken', newRefreshToken);
                }

                // Update the authorization header for this and future requests
                axiosInstance.defaults.headers.common['Authorization'] = `Bearer ${token}`;
                originalRequest.headers.Authorization = `Bearer ${token}`;

                // Process any queued requests
                processQueue(null, token);

                // Dispatch event for WebSocket and other components to update their token
                window.dispatchEvent(new CustomEvent('tokenRefreshed', {
                    detail: { token }
                }));

                // Retry the original request
                return axiosInstance(originalRequest);
            } catch (refreshError) {
                processQueue(refreshError, null);
                return handleAuthFailure();
            } finally {
                isRefreshing = false;
            }
        }

        return Promise.reject(error);
    }
);

// Export the base URL for components that need direct access (like WebSocket)
export { API_BASE_URL };
export default axiosInstance;
