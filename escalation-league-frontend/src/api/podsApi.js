import axios from 'axios';
const API_BASE_URL = '/pods';

// Create a pod
export const createPod = async (data) => {
    const response = await axios.post(`${API_BASE_URL}`, data, {
        headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
    });
    return response.data;
};

// Get active pods
export const getActivePods = async () => {
    const response = await axios.get(`${API_BASE_URL}`, {
        headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
    });
    return response.data;
};

// Join a pod
export const joinPod = async (podId) => {
    const response = await axios.post(`${API_BASE_URL}/${podId}/join`, {}, {
        headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
    });
    return response.data;
};

// Log pod result
export const logPodResult = async (podId, data) => {
    const response = await axios.post(`${API_BASE_URL}/${podId}/log`, data, {
        headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
    });
    return response.data;
};