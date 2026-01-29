import axios from './axiosConfig';

/**
 * Fetch public app settings (timezone, etc.)
 * @returns {Promise<Object>} Settings object with default_timezone
 */
export const getPublicSettings = async () => {
    const response = await axios.get('/settings/public');
    return response.data;
};

/**
 * Fetch just the timezone setting
 * @returns {Promise<string>} IANA timezone identifier
 */
export const getTimezone = async () => {
    const settings = await getPublicSettings();
    return settings.default_timezone || 'America/Chicago';
};
