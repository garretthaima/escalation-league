import axiosInstance from './axiosConfig';

// Update a pod
export const updatePod = async (podId, updates) => {
    const response = await axiosInstance.put(`/admin/pods/${podId}`, updates);
    return response.data;
};

// Remove a participant from a pod
export const removeParticipant = async (podId, playerId) => {
    const response = await axiosInstance.delete(`/admin/pods/${podId}/participants/${playerId}`);
    return response.data;
};

// Update a participant's result in a pod
export const updateParticipantResult = async (podId, playerId, result) => {
    const response = await axiosInstance.put(`/admin/pods/${podId}/participants/${playerId}`, { result });
    return response.data;
};

// Delete a pod
export const deletePod = async (podId) => {
    const response = await axiosInstance.delete(`/admin/pods/${podId}`);
    return response.data;
};