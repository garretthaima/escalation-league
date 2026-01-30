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

// ============================================
// Draft Pod Management (admin only)
// ============================================

/**
 * Get draft tournament pods for preview (admin only)
 * Returns unpublished tournament pods that haven't been shown to players yet
 */
export const getDraftTournamentPods = async (leagueId) => {
    const response = await axiosInstance.get(`/leagues/${leagueId}/tournament/draft-pods`);
    return response.data;
};

/**
 * Publish all draft tournament pods (admin only)
 * Makes pods visible to players and sends notifications
 */
export const publishTournamentPods = async (leagueId) => {
    const response = await axiosInstance.post(`/leagues/${leagueId}/tournament/publish-pods`);
    return response.data;
};

/**
 * Swap players between draft pods (admin only)
 * Allows admin to adjust pod compositions before publishing
 */
export const swapTournamentPlayers = async (leagueId, player1Id, pod1Id, player2Id, pod2Id) => {
    const response = await axiosInstance.post(`/leagues/${leagueId}/tournament/swap-players`, {
        player1_id: player1Id,
        pod1_id: pod1Id,
        player2_id: player2Id,
        pod2_id: pod2Id
    });
    return response.data;
};

/**
 * Delete draft tournament pods (admin only)
 * Allows regenerating pods by deleting existing drafts
 * @param {number} leagueId
 * @param {boolean} championshipOnly - If true, only delete championship draft
 */
export const deleteDraftTournamentPods = async (leagueId, championshipOnly = false) => {
    const response = await axiosInstance.delete(`/leagues/${leagueId}/tournament/draft-pods`, {
        params: { championship_only: championshipOnly }
    });
    return response.data;
};
