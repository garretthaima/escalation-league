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
