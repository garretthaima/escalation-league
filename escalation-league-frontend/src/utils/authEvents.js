/**
 * Centralized auth events utility
 * Single source of truth for logout/redirect logic to prevent race conditions
 * between axios interceptor and WebSocketProvider
 */
const authEvents = {
    redirecting: false,

    /**
     * Force logout and redirect to sign-in page
     * Handles token cleanup and dispatches events for components to clean up
     */
    forceLogout: () => {
        if (authEvents.redirecting) return;
        authEvents.redirecting = true;

        // Clear tokens
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');

        // Dispatch event for components to clean up state
        window.dispatchEvent(new CustomEvent('authLogout'));

        // Redirect after short delay to allow cleanup
        setTimeout(() => {
            window.location.href = '/signin';
        }, 100);

        // Reset flag after 5s in case redirect fails (e.g., blocked navigation)
        setTimeout(() => { authEvents.redirecting = false; }, 5000);
    },

    /**
     * Check if a redirect is currently in progress
     */
    isRedirecting: () => authEvents.redirecting,
};

export default authEvents;
