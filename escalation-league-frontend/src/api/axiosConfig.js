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
let refreshPromise = null; // Shared promise for concurrent refresh requests
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

/**
 * Check if access token is expired by decoding JWT
 * @returns {boolean} true if token is expired or invalid
 */
const isTokenExpired = () => {
    const token = localStorage.getItem('token');
    if (!token) return true;

    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        // Add 10 second buffer to account for clock skew
        return payload.exp * 1000 < Date.now() + 10000;
    } catch {
        return true;
    }
};

/**
 * Centralized token refresh function - ensures only one refresh happens at a time
 * Can be called by axios interceptor, WebSocket, or proactively on app init
 * @returns {Promise<string|null>} new access token or null if refresh failed
 */
const performTokenRefresh = async () => {
    // If already refreshing, return the existing promise
    if (isRefreshing && refreshPromise) {
        return refreshPromise;
    }

    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) {
        return null;
    }

    isRefreshing = true;

    refreshPromise = (async () => {
        try {
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

            // Update axios default header
            axiosInstance.defaults.headers.common['Authorization'] = `Bearer ${token}`;

            // Dispatch event for WebSocket and other components
            window.dispatchEvent(new CustomEvent('tokenRefreshed', {
                detail: { token }
            }));

            return token;
        } catch (err) {
            console.error('Token refresh failed:', err.message);
            return null;
        } finally {
            isRefreshing = false;
            refreshPromise = null;
        }
    })();

    return refreshPromise;
};

/**
 * Proactively check and refresh token on app initialization
 * Call this early in app startup to ensure valid session
 * @returns {Promise<boolean>} true if session is valid, false if login required
 */
const initializeAuth = async () => {
    const token = localStorage.getItem('token');
    const refreshToken = localStorage.getItem('refreshToken');

    // No tokens at all - user needs to login
    if (!token && !refreshToken) {
        return false;
    }

    // Have refresh token but access token is expired or missing - try to refresh
    if (refreshToken && (!token || isTokenExpired())) {
        const newToken = await performTokenRefresh();
        if (!newToken) {
            // Refresh failed - clear everything and require login
            localStorage.removeItem('token');
            localStorage.removeItem('refreshToken');
            return false;
        }
        return true;
    }

    // Access token exists and is not expired
    if (token && !isTokenExpired()) {
        axiosInstance.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        return true;
    }

    return false;
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
            // Don't retry auth endpoints - they're expected to return 401 on bad credentials
            if (originalRequest.url?.includes('/auth/')) {
                return Promise.reject(error);
            }

            // If already refreshing, queue this request to wait for the result
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

            // Use centralized refresh function
            const newToken = await performTokenRefresh();

            if (!newToken) {
                processQueue(new Error('Token refresh failed'), null);
                // Dispatch failure event so providers can react (stop loading, clear state, etc.)
                window.dispatchEvent(new CustomEvent('tokenRefreshFailed'));
                return handleAuthFailure();
            }

            // Update the authorization header for this request
            originalRequest.headers.Authorization = `Bearer ${newToken}`;

            // Process any queued requests
            processQueue(null, newToken);

            // Retry the original request
            return axiosInstance(originalRequest);
        }

        return Promise.reject(error);
    }
);

// Export the base URL and auth utilities for components that need direct access
export { API_BASE_URL, initializeAuth, performTokenRefresh, isTokenExpired };
export default axiosInstance;
