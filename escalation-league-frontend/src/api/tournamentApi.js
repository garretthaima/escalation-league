import axiosInstance from './axiosConfig';

/**
 * Tournament API
 * Issue #76: Finals Tournament System
 */

// ============================================
// Read endpoints
// ============================================

/**
 * Get tournament status overview
 */
export const getTournamentStatus = async (leagueId) => {
    const response = await axiosInstance.get(`/leagues/${leagueId}/tournament`);
    return response.data;
};

/**
 * Get tournament standings/leaderboard
 */
export const getTournamentStandings = async (leagueId) => {
    const response = await axiosInstance.get(`/leagues/${leagueId}/tournament/standings`);
    return response.data;
};

/**
 * Get tournament pods (optionally filtered by round)
 * @param {number} leagueId
 * @param {number|null} round - Optional round number to filter by
 */
export const getTournamentPods = async (leagueId, round = null) => {
    const params = round ? { round } : {};
    const response = await axiosInstance.get(`/leagues/${leagueId}/tournament/pods`, { params });
    return response.data;
};

/**
 * Get championship qualifiers (top 4 after qualifying rounds)
 */
export const getChampionshipQualifiers = async (leagueId) => {
    const response = await axiosInstance.get(`/leagues/${leagueId}/tournament/championship-qualifiers`);
    return response.data;
};

// ============================================
// Admin endpoints
// ============================================

/**
 * End regular season and start tournament phase
 * Qualifies top 75% of players and assigns seeds
 */
export const endRegularSeason = async (leagueId) => {
    const response = await axiosInstance.post(`/leagues/${leagueId}/tournament/end-regular-season`);
    return response.data;
};

/**
 * Generate all qualifying pods
 * Creates N pods where each qualified player plays exactly 4 games
 */
export const generateTournamentPods = async (leagueId) => {
    const response = await axiosInstance.post(`/leagues/${leagueId}/tournament/generate-pods`);
    return response.data;
};

/**
 * Start championship game
 * Creates the final pod with top 4 players
 */
export const startChampionship = async (leagueId) => {
    const response = await axiosInstance.post(`/leagues/${leagueId}/tournament/start-championship`);
    return response.data;
};

/**
 * Complete tournament and record champion
 * Marks the championship winner as league champion
 */
export const completeTournament = async (leagueId) => {
    const response = await axiosInstance.post(`/leagues/${leagueId}/tournament/complete`);
    return response.data;
};

/**
 * Reset tournament (admin only)
 * Deletes all tournament data and returns league to regular_season phase
 */
export const resetTournament = async (leagueId) => {
    const response = await axiosInstance.post(`/leagues/${leagueId}/tournament/reset`, {
        confirmReset: 'RESET_TOURNAMENT'
    });
    return response.data;
};
