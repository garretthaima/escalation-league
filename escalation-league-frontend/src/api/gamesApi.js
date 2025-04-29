import axios from 'axios';

const API_BASE_URL = `${process.env.REACT_APP_BACKEND_URL}/games`;

// Fetch participants for a game
export const getGameParticipants = async (gameId) => {
    const response = await axios.get(`${API_BASE_URL}/${gameId}/participants`, {
        headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
    });
    return response.data;
};

// Confirm game participation
export const confirmGame = async (gameId) => {
    const response = await axios.put(`${API_BASE_URL}/${gameId}/confirm`, {}, {
        headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
    });
    return response.data;
};

// Get game history for the current user
export const getGameHistory = async () => {
    const response = await axios.get(`${API_BASE_URL}/history`, {
        headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
    });
    return response.data;
};

// Get details of a specific game
export const getGameDetails = async (gameId) => {
    const response = await axios.get(`${API_BASE_URL}/${gameId}`, {
        headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
    });
    return response.data;
};

// Update details of a specific game
export const updateGameDetails = async (gameId, gameData) => {
    const response = await axios.put(`${API_BASE_URL}/${gameId}`, gameData, {
        headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
    });
    return response.data;
};

// Delete a game (soft delete)
export const deleteGame = async (gameId) => {
    const response = await axios.delete(`${API_BASE_URL}/${gameId}`, {
        headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
    });
    return response.data;
};

// Get all games in a specific league
export const getGamesInLeague = async (leagueId) => {
    const response = await axios.get(`${API_BASE_URL}/league/${leagueId}`, {
        headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
    });
    return response.data;
};