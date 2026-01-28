import axiosInstance from './axiosConfig';

// Create a league
export const createLeague = async (leagueData) => {
    const response = await axiosInstance.post('/leagues', leagueData);
    return response.data;
};

// Set active league
export const setActiveLeague = async (leagueId) => {
    const response = await axiosInstance.put('/leagues/active', { league_id: leagueId });
    return response.data;
};

// Update league details
export const updateLeague = async (leagueId, leagueData) => {
    const response = await axiosInstance.put(`/leagues/${leagueId}`, leagueData);
    return response.data;
};

// Get all leagues
export const getLeagues = async () => {
    const response = await axiosInstance.get('/leagues');
    return response.data;
};

// Get active league
export const getActiveLeague = async () => {
    const response = await axiosInstance.get('/leagues/active');
    return response.data;
};

// Get details of a specific league
export const getLeagueDetails = async (leagueId) => {
    const response = await axiosInstance.get(`/leagues/${leagueId}`);
    return response.data;
};

// Get stats and leaderboard for a league
export const getLeagueStats = async (leagueId) => {
    const response = await axiosInstance.get(`/leagues/${leagueId}/stats`);
    return response.data;
};

// Fetch all pending signup requests
export const getSignupRequests = async () => {
    const response = await axiosInstance.get('/leagues/signup-requests');
    return response.data;
};

// Approve a signup request
export const approveSignupRequest = async (requestId) => {
    const response = await axiosInstance.put(`/leagues/signup-requests/${requestId}/approve`);
    return response.data;
};

// Reject a signup request
export const rejectSignupRequest = async (requestId) => {
    const response = await axiosInstance.put(`/leagues/signup-requests/${requestId}/reject`);
    return response.data;
};

