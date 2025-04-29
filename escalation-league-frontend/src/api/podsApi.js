import axios from 'axios';

const API_BASE_URL = `${process.env.REACT_APP_BACKEND_URL}/pods`;

// Create a pod
export const createPod = async (data) => {
    const response = await axios.post(`${API_BASE_URL}`, data, {
        headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
    });
    return response.data;
};

// Get in-progress pods (renamed from getActivePods)
export const getInProgressPods = async () => {
    const response = await axios.get(`${API_BASE_URL}/in-progress`, {
        headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
    });
    return response.data;
};

// Get completed pods (unchanged)
export const getCompletedPods = async () => {
    const response = await axios.get(`${API_BASE_URL}/completed-pods`, {
        headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
    });
    return response.data;
};

// Get pods waiting for confirmation (renamed from getPodsWaitingConfirmation)
export const getPendingPods = async () => {
    const response = await axios.get(`${API_BASE_URL}/pending`, {
        headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
    });
    return response.data;
};

// Get completed games (unchanged)
export const getCompletedGames = async () => {
    const response = await axios.get(`${API_BASE_URL}/completed-games`, {
        headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
    });
    return response.data;
};

// Get pod details
export const getPodDetails = async (podId) => {
    const response = await axios.get(`${API_BASE_URL}/${podId}`, {
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

// Get participants for a pod
export const getPodParticipants = async (podId) => {
    const response = await axios.get(`${API_BASE_URL}/${podId}/participants`, {
        headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
    });
    return response.data;
};

// Delete a pod
export const deletePod = async (podId) => {
    const response = await axios.delete(`${API_BASE_URL}/${podId}`, {
        headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
    });
    return response.data;
};

// Get open pods
export const getOpenPods = async () => {
    const response = await axios.get(`${API_BASE_URL}/open`, {
        headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
    });
    return response.data;
};