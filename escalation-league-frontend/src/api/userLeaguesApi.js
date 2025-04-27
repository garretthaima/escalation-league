import axios from 'axios';

const API_BASE_URL = `${process.env.REACT_APP_BACKEND_URL}/user-leagues`; // Append 'user-leagues/' to the base URL

// Sign up for a league
export const signUpForLeague = async (leagueId) => {
    try {
        const response = await axios.post(`${API_BASE_URL}/signup`, { league_id: leagueId }, {
            headers: {
                Authorization: `Bearer ${localStorage.getItem('token')}`,
            },
        });
        return response.data;
    } catch (error) {
        console.error('Error signing up for league:', error);
        throw error;
    }
};

// Get user's league-specific stats
export const getUserLeagueStats = async (leagueId) => {
    try {
        const response = await axios.get(`${API_BASE_URL}/${leagueId}`, {
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

// Update user's league-specific data
export const updateUserLeagueData = async (leagueId, updates) => {
    try {
        const response = await axios.put(`${API_BASE_URL}/${leagueId}`, updates, {
            headers: {
                Authorization: `Bearer ${localStorage.getItem('token')}`,
            },
        });
        return response.data;
    } catch (error) {
        console.error(`Error updating league data for league ID ${leagueId}:`, error);
        throw error;
    }
};

// Leave a league
export const leaveLeague = async (leagueId) => {
    try {
        const response = await axios.delete(`${API_BASE_URL}/${leagueId}`, {
            headers: {
                Authorization: `Bearer ${localStorage.getItem('token')}`,
            },
        });
        return response.data;
    } catch (error) {
        console.error(`Error leaving league ID ${leagueId}:`, error);
        throw error;
    }
};

// Get all participants in a league (league_admin only)
export const getLeagueParticipants = async (leagueId) => {
    try {
        const response = await axios.get(`${API_BASE_URL}/${leagueId}/participants`, {
            headers: {
                Authorization: `Bearer ${localStorage.getItem('token')}`,
            },
        });
        return response.data;
    } catch (error) {
        console.error(`Error fetching participants for league ID ${leagueId}:`, error);
        throw error;
    }
};