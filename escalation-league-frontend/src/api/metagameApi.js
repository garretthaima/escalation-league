import axiosInstance from './axiosConfig';

/**
 * Get full metagame analysis for a league
 */
export const getMetagameAnalysis = async (leagueId) => {
    const response = await axiosInstance.get(`/leagues/${leagueId}/metagame/analysis`);
    return response.data;
};

/**
 * Get specific card statistics in the league
 */
export const getCardStats = async (leagueId, cardName) => {
    const response = await axiosInstance.get(`/leagues/${leagueId}/metagame/card/${encodeURIComponent(cardName)}`);
    return response.data;
};

/**
 * Get win rate statistics by turn order position
 */
export const getTurnOrderStats = async (leagueId) => {
    const response = await axiosInstance.get(`/leagues/${leagueId}/metagame/turn-order`);
    return response.data;
};

/**
 * Get cards for a specific category (ramp, removal, cardDraw, counterspells, boardWipes)
 */
export const getCategoryCards = async (leagueId, category) => {
    const response = await axiosInstance.get(`/leagues/${leagueId}/metagame/category/${category}`);
    return response.data;
};

/**
 * Get commander matchup statistics
 */
export const getCommanderMatchups = async (leagueId) => {
    const response = await axiosInstance.get(`/leagues/${leagueId}/metagame/commander-matchups`);
    return response.data;
};
