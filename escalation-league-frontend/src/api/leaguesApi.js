import axios from 'axios';

const API_BASE_URL = `${process.env.REACT_APP_BACKEND_URL}/leagues`; // Append 'leagues/' to the base URL

// Create a league
export const createLeague = async (leagueData) => {
    try {
        const response = await axios.post(`${API_BASE_URL}/`, leagueData, {
            headers: {
                Authorization: `Bearer ${localStorage.getItem('token')}`,
            },
        });
        return response.data;
    } catch (error) {
        console.error('Error creating league:', error);
        throw error;
    }
};

// Set active league
export const setActiveLeague = async (leagueId) => {
    try {
        const response = await axios.put(`${API_BASE_URL}/active`, { league_id: leagueId }, {
            headers: {
                Authorization: `Bearer ${localStorage.getItem('token')}`,
            },
        });
        return response.data;
    } catch (error) {
        console.error('Error setting active league:', error);
        throw error;
    }
};

// Update league details
export const updateLeague = async (leagueId, leagueData) => {
    try {
        const response = await axios.put(`${API_BASE_URL}/${leagueId}`, leagueData, {
            headers: {
                Authorization: `Bearer ${localStorage.getItem('token')}`,
            },
        });
        return response.data;
    } catch (error) {
        console.error(`Error updating league with ID ${leagueId}:`, error);
        throw error;
    }
};

// Get all leagues
export const getLeagues = async () => {
    try {
        const response = await axios.get(`${API_BASE_URL}/`, {
            headers: {
                Authorization: `Bearer ${localStorage.getItem('token')}`,
            },
        });
        return response.data;
    } catch (error) {
        console.error('Error fetching leagues:', error);
        throw error;
    }
};

// Get active league
export const getActiveLeague = async () => {
    try {
        const response = await axios.get(`${API_BASE_URL}/active`, {
            headers: {
                Authorization: `Bearer ${localStorage.getItem('token')}`,
            },
        });
        return response.data;
    } catch (error) {
        console.error('Error fetching active league:', error);
        throw error;
    }
};

// Get details of a specific league
export const getLeagueDetails = async (leagueId) => {
    try {
        const response = await axios.get(`${API_BASE_URL}/${leagueId}`, {
            headers: {
                Authorization: `Bearer ${localStorage.getItem('token')}`,
            },
        });
        return response.data;
    } catch (error) {
        console.error(`Error fetching details for league ID ${leagueId}:`, error);
        throw error;
    }
};

// Get games in a league
export const getLeagueGames = async (leagueId) => {
    try {
        const response = await axios.get(`${API_BASE_URL}/${leagueId}/games`, {
            headers: {
                Authorization: `Bearer ${localStorage.getItem('token')}`,
            },
        });
        return response.data;
    } catch (error) {
        console.error(`Error fetching games for league ID ${leagueId}:`, error);
        throw error;
    }
};

// Get leaderboard for a league
export const getLeagueLeaderboard = async (leagueId) => {
    try {
        const response = await axios.get(`${API_BASE_URL}/${leagueId}/leaderboard`, {
            headers: {
                Authorization: `Bearer ${localStorage.getItem('token')}`,
            },
        });
        return response.data;
    } catch (error) {
        console.error(`Error fetching leaderboard for league ID ${leagueId}:`, error);
        throw error;
    }
};

// Search leagues
export const searchLeagues = async (searchQuery) => {
    try {
        const response = await axios.get(`${API_BASE_URL}/search`, {
            headers: {
                Authorization: `Bearer ${localStorage.getItem('token')}`,
            },
            params: { query: searchQuery },
        });
        return response.data;
    } catch (error) {
        console.error('Error searching leagues:', error);
        throw error;
    }
};

// Invite user to a league
export const inviteToLeague = async (leagueId, userId) => {
    try {
        const response = await axios.post(`${API_BASE_URL}/${leagueId}/invite`, { userId }, {
            headers: {
                Authorization: `Bearer ${localStorage.getItem('token')}`,
            },
        });
        return response.data;
    } catch (error) {
        console.error(`Error inviting user to league ID ${leagueId}:`, error);
        throw error;
    }
};

// Get league stats
export const getLeagueStats = async (leagueId) => {
    try {
        const response = await axios.get(`${API_BASE_URL}/${leagueId}/stats`, {
            headers: {
                Authorization: `Bearer ${localStorage.getItem('token')}`,
            },
        });
        return response.data;
    } catch (error) {
        console.error(`Error fetching stats for league ID ${leagueId}:`, error);
        throw error;
    }
};