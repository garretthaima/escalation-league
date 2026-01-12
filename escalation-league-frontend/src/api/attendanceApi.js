import axiosInstance from './axiosConfig';

// Get or create today's session for a league
export const getTodaySession = async (leagueId) => {
    const response = await axiosInstance.get(`/attendance/leagues/${leagueId}/today`);
    return response.data;
};

// Get all sessions for a league
export const getLeagueSessions = async (leagueId) => {
    const response = await axiosInstance.get(`/attendance/leagues/${leagueId}/sessions`);
    return response.data;
};

// Get a specific session with attendance
export const getSession = async (sessionId) => {
    const response = await axiosInstance.get(`/attendance/sessions/${sessionId}`);
    return response.data;
};

// Create a new session
export const createSession = async (data) => {
    const response = await axiosInstance.post('/attendance/sessions', data);
    return response.data;
};

// Update session status
export const updateSessionStatus = async (sessionId, status) => {
    const response = await axiosInstance.patch(`/attendance/sessions/${sessionId}/status`, { status });
    return response.data;
};

// User check-in
export const checkIn = async (sessionId) => {
    const response = await axiosInstance.post(`/attendance/sessions/${sessionId}/check-in`);
    return response.data;
};

// User check-out
export const checkOut = async (sessionId) => {
    const response = await axiosInstance.post(`/attendance/sessions/${sessionId}/check-out`);
    return response.data;
};

// Admin check-in a user
export const adminCheckIn = async (sessionId, userId) => {
    const response = await axiosInstance.post(`/attendance/sessions/${sessionId}/admin/check-in`, { user_id: userId });
    return response.data;
};

// Admin check-out a user
export const adminCheckOut = async (sessionId, userId) => {
    const response = await axiosInstance.post(`/attendance/sessions/${sessionId}/admin/check-out`, { user_id: userId });
    return response.data;
};

// Get active attendees
export const getActiveAttendees = async (sessionId) => {
    const response = await axiosInstance.get(`/attendance/sessions/${sessionId}/active`);
    return response.data;
};

// Get pod suggestions
export const getPodSuggestions = async (sessionId, podSize = 4) => {
    const response = await axiosInstance.get(`/attendance/sessions/${sessionId}/suggest-pods?pod_size=${podSize}`);
    return response.data;
};

// Get matchup matrix for a league
export const getMatchupMatrix = async (leagueId) => {
    const response = await axiosInstance.get(`/attendance/leagues/${leagueId}/matchup-matrix`);
    return response.data;
};

// Get participant matchups (nemesis/victim)
export const getParticipantMatchups = async (leagueId, userId) => {
    const response = await axiosInstance.get(`/user-leagues/${leagueId}/participants/${userId}/matchups`);
    return response.data;
};
