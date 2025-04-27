import axios from 'axios';

const API_BASE_URL = `${process.env.REACT_APP_BACKEND_URL}/games`; // Append 'games/' to the base URL

// Log a game
export const logGame = async (gameData) => {
    try {
        const response = await axios.post(`${API_BASE_URL}/`, gameData, {
            headers: {
                Authorization: `Bearer ${localStorage.getItem('token')}`,
            },
        });
        return response.data;
    } catch (error) {
        console.error('Error logging game:', error);
        throw error;
    }
};

// Confirm a game
export const confirmGame = async (gameId) => {
    try {
        const response = await axios.put(`${API_BASE_URL}/confirm`, { gameId }, {
            headers: {
                Authorization: `Bearer ${localStorage.getItem('token')}`,
            },
        });
        return response.data;
    } catch (error) {
        console.error('Error confirming game:', error);
        throw error;
    }
};

// Get game history for the current user
export const getGameHistory = async () => {
    try {
        const response = await axios.get(`${API_BASE_URL}/history`, {
            headers: {
                Authorization: `Bearer ${localStorage.getItem('token')}`,
            },
        });
        return response.data;
    } catch (error) {
        console.error('Error fetching game history:', error);
        throw error;
    }
};

// Get details of a specific game
export const getGameDetails = async (gameId) => {
    try {
        const response = await axios.get(`${API_BASE_URL}/${gameId}`, {
            headers: {
                Authorization: `Bearer ${localStorage.getItem('token')}`,
            },
        });
        return response.data;
    } catch (error) {
        console.error(`Error fetching details for game ID ${gameId}:`, error);
        throw error;
    }
};

// Update details of a specific game
export const updateGameDetails = async (gameId, gameData) => {
    try {
        const response = await axios.put(`${API_BASE_URL}/${gameId}`, gameData, {
            headers: {
                Authorization: `Bearer ${localStorage.getItem('token')}`,
            },
        });
        return response.data;
    } catch (error) {
        console.error(`Error updating details for game ID ${gameId}:`, error);
        throw error;
    }
};

// Delete a game (soft delete)
export const deleteGame = async (gameId) => {
    try {
        const response = await axios.delete(`${API_BASE_URL}/${gameId}`, {
            headers: {
                Authorization: `Bearer ${localStorage.getItem('token')}`,
            },
        });
        return response.data;
    } catch (error) {
        console.error(`Error deleting game ID ${gameId}:`, error);
        throw error;
    }
};

// Get all games in a specific league
export const getGamesInLeague = async (leagueId) => {
    try {
        const response = await axios.get(`${API_BASE_URL}/league/${leagueId}`, {
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