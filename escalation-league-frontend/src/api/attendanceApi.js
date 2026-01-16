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

// Create a new session (admin)
export const createSession = async (data) => {
    const response = await axiosInstance.post('/admin/attendance/sessions', data);
    return response.data;
};

// Update session status (admin)
export const updateSessionStatus = async (sessionId, status) => {
    const response = await axiosInstance.patch(`/admin/attendance/sessions/${sessionId}/status`, { status });
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
    const response = await axiosInstance.post(`/admin/attendance/sessions/${sessionId}/check-in`, { user_id: userId });
    return response.data;
};

// Admin check-out a user
export const adminCheckOut = async (sessionId, userId) => {
    const response = await axiosInstance.post(`/admin/attendance/sessions/${sessionId}/check-out`, { user_id: userId });
    return response.data;
};

// Get active attendees
export const getActiveAttendees = async (sessionId) => {
    const response = await axiosInstance.get(`/attendance/sessions/${sessionId}/active`);
    return response.data;
};

// Get pod suggestions (admin)
export const getPodSuggestions = async (sessionId, podSize = 4) => {
    const response = await axiosInstance.get(`/admin/attendance/sessions/${sessionId}/suggest-pods?pod_size=${podSize}`);
    return response.data;
};

// Get matchup matrix for a league (admin)
export const getMatchupMatrix = async (leagueId) => {
    const response = await axiosInstance.get(`/admin/attendance/leagues/${leagueId}/matchup-matrix`);
    return response.data;
};

// Post Discord attendance poll (admin)
export const postDiscordPoll = async (sessionId, customMessage = null) => {
    const response = await axiosInstance.post(`/admin/attendance/sessions/${sessionId}/discord-poll`, {
        custom_message: customMessage
    });
    return response.data;
};

// Close Discord attendance poll (admin) - also locks session
export const closeDiscordPoll = async (sessionId) => {
    const response = await axiosInstance.delete(`/admin/attendance/sessions/${sessionId}/discord-poll`);
    return response.data;
};

// Lock a session (admin)
export const lockSession = async (sessionId) => {
    const response = await axiosInstance.post(`/admin/attendance/sessions/${sessionId}/lock`);
    return response.data;
};

// Reopen a locked session (admin)
export const reopenSession = async (sessionId) => {
    const response = await axiosInstance.post(`/admin/attendance/sessions/${sessionId}/reopen`);
    return response.data;
};

// Create a pod with specified players (admin)
export const createPodWithPlayers = async (sessionId, playerIds) => {
    const response = await axiosInstance.post(`/admin/attendance/sessions/${sessionId}/pods`, { player_ids: playerIds });
    return response.data;
};

// Get participant matchups (nemesis/victim)
export const getParticipantMatchups = async (leagueId, userId) => {
    const response = await axiosInstance.get(`/user-leagues/${leagueId}/participants/${userId}/matchups`);
    return response.data;
};

// Get the active poll session for a league (one poll per league at a time)
export const getActivePollSession = async (leagueId) => {
    const response = await axiosInstance.get(`/attendance/leagues/${leagueId}/active-poll`);
    return response.data;
};

// Post session recap to Discord and complete session (admin)
export const postSessionRecap = async (sessionId) => {
    const response = await axiosInstance.post(`/admin/attendance/sessions/${sessionId}/recap`);
    return response.data;
};
