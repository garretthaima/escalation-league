import axiosInstance from './axiosConfig';

// Fetch pods with optional filtering
export const getPods = async (filter = {}) => {
    const queryParams = new URLSearchParams(filter).toString(); // Convert filter object to query string
    const response = await axiosInstance.get(`/pods?${queryParams}`);
    return response.data;
};

// Create a pod
export const createPod = async (data) => {
    const response = await axiosInstance.post('/pods', data);
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

// Update a pod
export const updatePod = async (podId, updates) => {
    const response = await axiosInstance.put(`/pods/${podId}`, updates);
    return response.data;
};

// Override a pod to active status
export const overridePod = async (podId) => {
    const response = await axiosInstance.post(`/pods/${podId}/override`);
    return response.data;
};

// Get life tracker state for a pod
export const getLifeTrackerState = async (podId) => {
    const response = await axiosInstance.get(`/pods/${podId}/life-tracker`);
    return response.data;
};

// Update life tracker state for a pod
export const updateLifeTrackerState = async (podId, state) => {
    const response = await axiosInstance.put(`/pods/${podId}/life-tracker`, { state });
    return response.data;
};