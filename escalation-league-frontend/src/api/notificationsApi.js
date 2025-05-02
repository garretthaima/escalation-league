import axiosInstance from './axiosConfig';

// Fetch notifications for the current user
export const getNotifications = async () => {
    const response = await axiosInstance.get('/notifications');
    return response.data;
};