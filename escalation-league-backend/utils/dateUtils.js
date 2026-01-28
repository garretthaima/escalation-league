/**
 * Date utilities with timezone support
 * Uses the default_timezone setting from the database for consistent date handling
 */
const { getSetting } = require('./settingsUtils');

// Cache the timezone to avoid repeated database calls
let cachedTimezone = null;
let cacheExpiry = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Get the application's default timezone from settings
 * @returns {Promise<string>} IANA timezone identifier (e.g., 'America/Chicago')
 */
async function getTimezone() {
    const now = Date.now();
    if (cachedTimezone && cacheExpiry > now) {
        return cachedTimezone;
    }

    try {
        cachedTimezone = await getSetting('default_timezone');
        cacheExpiry = now + CACHE_TTL;
        return cachedTimezone;
    } catch (err) {
        // Fallback to America/Chicago if setting not found
        return 'America/Chicago';
    }
}

/**
 * Get the timezone synchronously (uses cached value or fallback)
 * Use this only when async is not possible
 * @returns {string} IANA timezone identifier
 */
function getTimezoneSync() {
    if (cachedTimezone && cacheExpiry > Date.now()) {
        return cachedTimezone;
    }
    return 'America/Chicago';
}

/**
 * Clear the timezone cache (call when setting is updated)
 */
function clearTimezoneCache() {
    cachedTimezone = null;
    cacheExpiry = 0;
}

/**
 * Format a date as YYYY-MM-DD in the application timezone
 * @param {Date|string} date - Date to format
 * @param {string} [timezone] - Override timezone (defaults to app timezone)
 * @returns {string} Date string in YYYY-MM-DD format
 */
function formatDateForDB(date, timezone = null) {
    const d = new Date(date);
    const tz = timezone || getTimezoneSync();

    // Use Intl to get date parts in the specified timezone
    const formatter = new Intl.DateTimeFormat('en-CA', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        timeZone: tz
    });

    return formatter.format(d);
}

/**
 * Format a date for display (e.g., "Jan 15, 2025")
 * @param {Date|string} date - Date to format
 * @param {string} [timezone] - Override timezone
 * @param {Object} [options] - Intl.DateTimeFormat options
 * @returns {string} Formatted date string
 */
function formatDateDisplay(date, timezone = null, options = {}) {
    const d = new Date(date);
    const tz = timezone || getTimezoneSync();

    const defaultOptions = {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        timeZone: tz
    };

    const formatter = new Intl.DateTimeFormat('en-US', { ...defaultOptions, ...options });
    return formatter.format(d);
}

/**
 * Format a date and time for display (e.g., "Jan 15, 2025, 6:00 PM")
 * @param {Date|string} date - Date to format
 * @param {string} [timezone] - Override timezone
 * @returns {string} Formatted datetime string
 */
function formatDateTimeDisplay(date, timezone = null) {
    const d = new Date(date);
    const tz = timezone || getTimezoneSync();

    const formatter = new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        timeZone: tz
    });

    return formatter.format(d);
}

/**
 * Format a date as ISO string (for API responses)
 * @param {Date|string} date - Date to format
 * @returns {string} ISO date string
 */
function formatDateISO(date) {
    return new Date(date).toISOString();
}

/**
 * Parse a date string and create a Date object
 * Handles various input formats consistently
 * @param {string|Date} dateString - Date string to parse
 * @returns {Date} Parsed Date object
 */
function parseDate(dateString) {
    if (dateString instanceof Date) {
        return dateString;
    }

    // Handle YYYY-MM-DD format (treat as local date, not UTC)
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
        const [year, month, day] = dateString.split('-').map(Number);
        return new Date(year, month - 1, day);
    }

    return new Date(dateString);
}

/**
 * Get the current date/time in the application timezone
 * @param {string} [timezone] - Override timezone
 * @returns {Date} Current date adjusted for timezone display
 */
function getNow(timezone = null) {
    return new Date();
}

/**
 * Get today's date as YYYY-MM-DD in the application timezone
 * @param {string} [timezone] - Override timezone
 * @returns {string} Today's date in YYYY-MM-DD format
 */
function getTodayDate(timezone = null) {
    return formatDateForDB(new Date(), timezone);
}

/**
 * Get the day of week (0=Sunday, 6=Saturday) in the application timezone
 * @param {Date|string} date - Date to check
 * @param {string} [timezone] - Override timezone
 * @returns {number} Day of week (0-6)
 */
function getDayOfWeek(date, timezone = null) {
    const d = new Date(date);
    const tz = timezone || getTimezoneSync();

    // Get the day of week in the specified timezone
    const formatter = new Intl.DateTimeFormat('en-US', {
        weekday: 'short',
        timeZone: tz
    });

    const dayName = formatter.format(d);
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return days.indexOf(dayName);
}

/**
 * Check if a given date is Thursday in the application timezone
 * @param {Date|string} date - Date to check
 * @param {string} [timezone] - Override timezone
 * @returns {boolean} True if the date is Thursday
 */
function isThursday(date, timezone = null) {
    return getDayOfWeek(date, timezone) === 4;
}

/**
 * Get the hour in the application timezone (0-23)
 * @param {Date|string} date - Date to check
 * @param {string} [timezone] - Override timezone
 * @returns {number} Hour (0-23)
 */
function getHourInTimezone(date, timezone = null) {
    const d = new Date(date);
    const tz = timezone || getTimezoneSync();

    const formatter = new Intl.DateTimeFormat('en-US', {
        hour: 'numeric',
        hour12: false,
        timeZone: tz
    });

    return parseInt(formatter.format(d), 10);
}

module.exports = {
    getTimezone,
    getTimezoneSync,
    clearTimezoneCache,
    formatDateForDB,
    formatDateDisplay,
    formatDateTimeDisplay,
    formatDateISO,
    parseDate,
    getNow,
    getTodayDate,
    getDayOfWeek,
    isThursday,
    getHourInTimezone
};
