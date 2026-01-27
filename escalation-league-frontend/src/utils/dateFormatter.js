/**
 * Date formatting utilities for consistent timezone-aware date display
 * Timezone is initialized at app startup via setTimezoneLoader
 */

// Cache the timezone to avoid repeated API calls
let cachedTimezone = null;
let cachePromise = null;

// Timezone loader function - set during app initialization
let timezoneLoader = null;

/**
 * Set the timezone loader function
 * Call this early in app startup to provide the API function
 * @param {Function} loader - Async function that returns the timezone string
 */
export const setTimezoneLoader = (loader) => {
    timezoneLoader = loader;
};

/**
 * Initialize and cache the timezone setting
 * Call this early in app startup (e.g., in App.js or AuthContext)
 * @returns {Promise<string>} The timezone
 */
export const initTimezone = async () => {
    if (cachedTimezone) return cachedTimezone;

    if (!cachePromise) {
        if (timezoneLoader) {
            cachePromise = timezoneLoader()
                .then(tz => {
                    cachedTimezone = tz;
                    return tz;
                })
                .catch(() => {
                    cachedTimezone = 'America/Chicago';
                    return cachedTimezone;
                });
        } else {
            // No loader set, use default
            cachedTimezone = 'America/Chicago';
            return cachedTimezone;
        }
    }

    return cachePromise;
};

/**
 * Set the timezone directly (useful for testing or manual override)
 * @param {string} timezone - IANA timezone identifier
 */
export const setTimezone = (timezone) => {
    cachedTimezone = timezone;
};

/**
 * Get the cached timezone (sync)
 * Returns fallback if not yet initialized
 * @returns {string} IANA timezone identifier
 */
export const getTimezone = () => {
    return cachedTimezone || 'America/Chicago';
};

/**
 * Format a date for display (e.g., "Jan 15, 2025")
 * @param {Date|string} date - Date to format
 * @param {Object} [options] - Additional Intl.DateTimeFormat options
 * @returns {string} Formatted date string
 */
export const formatDate = (date, options = {}) => {
    if (!date) return '';

    const d = new Date(date);
    if (isNaN(d.getTime())) return '';

    const defaultOptions = {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        timeZone: getTimezone()
    };

    return d.toLocaleDateString('en-US', { ...defaultOptions, ...options });
};

/**
 * Format a date with full month name (e.g., "January 15, 2025")
 * @param {Date|string} date - Date to format
 * @returns {string} Formatted date string
 */
export const formatDateLong = (date) => {
    return formatDate(date, { month: 'long' });
};

/**
 * Format a date as short (e.g., "1/15/25")
 * @param {Date|string} date - Date to format
 * @returns {string} Formatted date string
 */
export const formatDateShort = (date) => {
    return formatDate(date, {
        year: '2-digit',
        month: 'numeric',
        day: 'numeric'
    });
};

/**
 * Format a date and time (e.g., "Jan 15, 2025, 6:00 PM")
 * @param {Date|string} date - Date to format
 * @param {Object} [options] - Additional Intl.DateTimeFormat options
 * @returns {string} Formatted datetime string
 */
export const formatDateTime = (date, options = {}) => {
    if (!date) return '';

    const d = new Date(date);
    if (isNaN(d.getTime())) return '';

    const defaultOptions = {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        timeZone: getTimezone()
    };

    return d.toLocaleString('en-US', { ...defaultOptions, ...options });
};

/**
 * Format just the time (e.g., "6:00 PM")
 * @param {Date|string} date - Date to format
 * @returns {string} Formatted time string
 */
export const formatTime = (date) => {
    if (!date) return '';

    const d = new Date(date);
    if (isNaN(d.getTime())) return '';

    return d.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        timeZone: getTimezone()
    });
};

/**
 * Format a date with weekday (e.g., "Thursday, January 15")
 * @param {Date|string} date - Date to format
 * @returns {string} Formatted date string with weekday
 */
export const formatDateWithWeekday = (date) => {
    return formatDate(date, {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: undefined
    });
};

/**
 * Format a date as ISO date string (YYYY-MM-DD) in the app timezone
 * Useful for API calls and form values
 * @param {Date|string} date - Date to format
 * @returns {string} Date in YYYY-MM-DD format
 */
export const formatDateISO = (date) => {
    if (!date) return '';

    const d = new Date(date);
    if (isNaN(d.getTime())) return '';

    // Use en-CA locale which formats as YYYY-MM-DD
    return d.toLocaleDateString('en-CA', { timeZone: getTimezone() });
};

/**
 * Parse a date string and return a Date object
 * Handles YYYY-MM-DD format as a local date (not UTC)
 * @param {string|Date} dateString - Date string to parse
 * @returns {Date} Parsed Date object
 */
export const parseDate = (dateString) => {
    if (dateString instanceof Date) return dateString;
    if (!dateString) return new Date(NaN);

    // Handle YYYY-MM-DD format - treat as local date
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
        const [year, month, day] = dateString.split('-').map(Number);
        return new Date(year, month - 1, day);
    }

    return new Date(dateString);
};

/**
 * Get relative time description (e.g., "2 hours ago", "in 3 days")
 * @param {Date|string} date - Date to compare
 * @returns {string} Relative time description
 */
export const formatRelativeTime = (date) => {
    if (!date) return '';

    const d = new Date(date);
    if (isNaN(d.getTime())) return '';

    const now = new Date();
    const diffMs = d.getTime() - now.getTime();
    const diffSec = Math.round(diffMs / 1000);
    const diffMin = Math.round(diffSec / 60);
    const diffHour = Math.round(diffMin / 60);
    const diffDay = Math.round(diffHour / 24);

    const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });

    if (Math.abs(diffSec) < 60) {
        return rtf.format(diffSec, 'second');
    } else if (Math.abs(diffMin) < 60) {
        return rtf.format(diffMin, 'minute');
    } else if (Math.abs(diffHour) < 24) {
        return rtf.format(diffHour, 'hour');
    } else if (Math.abs(diffDay) < 30) {
        return rtf.format(diffDay, 'day');
    }

    // Fall back to absolute date for older dates
    return formatDate(d);
};
