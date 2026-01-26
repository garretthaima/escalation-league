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

// Add a participant to a pod
export const addParticipant = async (podId, playerId) => {
    const response = await axiosInstance.post(`/admin/pods/${podId}/participants`, { playerId });
    return response.data;
};

// Update a participant's result in a pod
export const updateParticipantResult = async (podId, playerId, result) => {
    const response = await axiosInstance.put(`/admin/pods/${podId}/participants/${playerId}`, { result });
    return response.data;
};

// Toggle DQ status for a participant
export const toggleDQ = async (podId, playerId) => {
    const response = await axiosInstance.patch(`/admin/pods/${podId}/participants/${playerId}/dq`);
    return response.data;
};

// Delete a pod
export const deletePod = async (podId) => {
    const response = await axiosInstance.delete(`/admin/pods/${podId}`);
    return response.data;
};

// Set winner and complete a pod (for active/pending pods) - skips pending state
export const setWinner = async (podId, winnerId) => {
    const response = await axiosInstance.post(`/admin/pods/${podId}/set-winner`, { winnerId });
    return response.data;
};

// Declare winner and move to pending (active → pending)
export const declareWinner = async (podId, winnerId) => {
    const response = await axiosInstance.post(`/admin/pods/${podId}/declare-winner`, { winnerId });
    return response.data;
};

// Force complete a pending pod (pending → complete)
export const forceComplete = async (podId) => {
    const response = await axiosInstance.post(`/admin/pods/${podId}/force-complete`);
    return response.data;
};