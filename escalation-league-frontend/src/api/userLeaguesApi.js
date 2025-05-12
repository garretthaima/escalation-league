import axiosInstance from './axiosConfig';

// Sign up for a league
export const signUpForLeague = async (leagueId) => {
    const response = await axiosInstance.post('/user-leagues/signup', { league_id: leagueId });
    return response.data;
};

// Get user's league-specific stats
export const getUserLeagueStats = async (leagueId) => {
    const response = await axiosInstance.get(`/user-leagues/${leagueId}`);
    return response.data;
};

// Update user's league-specific data
export const updateUserLeagueData = async (leagueId, updates) => {
    const response = await axiosInstance.put(`/user-leagues/${leagueId}`, updates);
    return response.data;
};

// Leave a league
export const leaveLeague = async (leagueId) => {
    const response = await axiosInstance.delete(`/user-leagues/${leagueId}`);
    return response.data;
};

// Get all participants in a league (league_admin only)
export const getLeagueParticipants = async (leagueId) => {
    const response = await axiosInstance.get(`/user-leagues/${leagueId}/participants`);
    return response.data;
};

// Get all participants in a league (league_admin only)
export const getLeagueParticipantsDetails = async (leagueId, userId) => {
    const response = await axiosInstance.get(`/user-leagues/${leagueId}/participants/${userId}`);
    return response.data;
};

// Update league stats
export const updateLeagueStats = async (data) => {
    const response = await axiosInstance.put('/user-leagues/update-league-stats', data);
    return response.data;
};

// Submit a signup request for a league
export const submitSignupRequest = async (leagueId) => {
    const response = await axiosInstance.post('/user-leagues/signup-request', { leagueId });
    return response.data;
};

export const getUserPendingSignupRequests = async () => {
    const response = await axiosInstance.get('/user-leagues/signup-request', {});
    return response.data;
};

// Check if the user is in a league
export const isUserInLeague = async () => {
    const response = await axiosInstance.get('/user-leagues/in-league');
    return response.data;
};

// Request signup for a league
export const requestSignupForLeague = async (data) => {
    const response = await axiosInstance.post('/user-leagues/signup-request', { data });
    return response.data;
};