import axios from 'axios';

const API_BASE_URL = `${process.env.REACT_APP_BACKEND_URL}/notifications`; // Append 'notifications/' to the base URL

// Fetch notifications for the current user
export const getNotifications = async () => {
    try {
        const response = await axios.get(`${API_BASE_URL}/`, {
            headers: {
                Authorization: `Bearer ${localStorage.getItem('token')}`,
            },
        });
        return response.data;
    } catch (error) {
        console.error('Error fetching notifications:', error);
        throw error;
    }
};