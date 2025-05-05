import axiosInstance from './axiosConfig';

// Create a pod
export const createPod = async (data) => {
    const response = await axiosInstance.post('/pods', data);
    return response.data;
};

// Get in-progress pods
export const getInProgressPods = async () => {
    const response = await axiosInstance.get('/pods/in-progress');
    return response.data;
};

// Get completed pods
export const getCompletedPods = async () => {
    const response = await axiosInstance.get('/pods/completed-pods');
    return response.data;
};

// Get pods waiting for confirmation
export const getPendingPods = async () => {
    const response = await axiosInstance.get('/pods/pending');
    return response.data;
};

// Get completed games
export const getCompletedGames = async () => {
    const response = await axiosInstance.get('/pods/completed-games');
    return response.data;
};

// Get pod details
export const getPodDetails = async (podId) => {
    const response = await axiosInstance.get(`/pods/${podId}`);
    return response.data;
};

// Join a pod
export const joinPod = async (podId) => {
    const response = await axiosInstance.post(`/pods/${podId}/join`);
    return response.data;
};

// Log pod result
export const logPodResult = async (podId, data) => {
    const response = await axiosInstance.post(`/pods/${podId}/log`, data);
    return response.data;
};

// Get participants for a pod
export const getPodParticipants = async (podId) => {
    const response = await axiosInstance.get(`/pods/${podId}/participants`);
    return response.data;
};

// Delete a pod
export const deletePod = async (podId) => {
    const response = await axiosInstance.delete(`/pods/${podId}`);
    return response.data;
};

// Get open pods
export const getOpenPods = async () => {
    const response = await axiosInstance.get('/pods/open');
    return response.data;
};