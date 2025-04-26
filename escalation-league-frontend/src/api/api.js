// filepath: frontend/src/api/api.js
import axios from 'axios';

const API_BASE_URL = 'http://localhost:3000'; // Replace with your backend URL

export const getPlayers = async () => {
    const response = await axios.get(`${API_BASE_URL}/players`);
    return response.data;
};

export const getGames = async () => {
    const response = await axios.get(`${API_BASE_URL}/games`);
    return response.data;
};

export const logGame = async (gameData) => {
    try {
        const response = await axios.post(`${API_BASE_URL}/games`, gameData);
        return response.data;
    } catch (error) {
        console.error('Error logging game:', error);
        throw error;
    }
};

export const getLeaderboard = async () => {
    try {
        const response = await axios.get(`${API_BASE_URL}/leaderboard`);
        return response.data; // Ensure this matches the backend response structure
    } catch (error) {
        console.error('Error fetching leaderboard:', error);
        return [];
    }
};

export const createLeague = async (leagueData) => {
    try {
        const response = await axios.post(`${API_BASE_URL}/leagues/create`, leagueData);
        return response.data;
    } catch (error) {
        console.error('Error creating league:', error);
        throw error;
    }
};

export const setActiveLeague = async (leagueData) => {
    try {
        const response = await axios.post(`${API_BASE_URL}/leagues/set-active`, leagueData);
        return response.data;
    } catch (error) {
        console.error('Error setting active league:', error);
        throw error;
    }
};

export const getLeagues = async () => {
    try {
        const response = await axios.get(`${API_BASE_URL}/leagues/all`);
        return response.data;
    } catch (error) {
        console.error('Error fetching leagues:', error);
        throw error;
    }
};

export const updateCurrentWeek = async (data) => {
    try {
        const response = await axios.post(`${API_BASE_URL}/leagues/update-week`, data);
        return response.data;
    } catch (error) {
        console.error('Error updating current week:', error);
        throw error;
    }
};

export const getActiveLeague = async () => {
    try {
        const response = await axios.get(`${API_BASE_URL}/leagues/active`);
        return response.data;
    } catch (error) {
        console.error('Error fetching active league:', error);
        throw error;
    }
};

export const getLeagueDetails = async (leagueId) => {
    try {
        const response = await axios.get(`${API_BASE_URL}/leagues/${leagueId}`);
        return response.data;
    } catch (error) {
        console.error('Error fetching league details:', error);
        throw error;
    }
};

export const getLeagueLeaderboard = async (leagueId) => {
    try {
        const response = await axios.get(`${API_BASE_URL}/leagues/${leagueId}/leaderboard`);
        return response.data;
    } catch (error) {
        console.error('Error fetching league leaderboard:', error);
        throw error;
    }
};