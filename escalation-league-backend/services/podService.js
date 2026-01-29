/**
 * Pod Service - Centralized business logic for pod/game management
 *
 * This service consolidates duplicated logic from podsController.js and
 * podsAdminController.js for stats updates, ELO calculations, and reversals.
 */

const db = require('../models/db');
const { calculateEloChanges } = require('../utils/eloCalculator');
const logger = require('../utils/logger');

/**
 * Get a pod by ID
 * @param {number} podId - Pod ID
 * @returns {Promise<Object|undefined>} Pod record or undefined
 */
const getById = async (podId) => {
    return db('game_pods').where({ id: podId }).first();
};

/**
 * Get participants for a pod (without user details)
 * @param {number} podId - Pod ID
 * @param {boolean} includeDeleted - Whether to include soft-deleted participants
 * @returns {Promise<Array>} Array of game_players records
 */
const getParticipants = async (podId, includeDeleted = false) => {
    let query = db('game_players').where({ pod_id: podId });
    if (!includeDeleted) {
        query = query.whereNull('deleted_at');
    }
    return query;
};

/**
 * Get participants with user details
 * @param {number} podId - Pod ID
 * @returns {Promise<Array>} Array of participants with user info
 */
const getParticipantsWithUsers = async (podId) => {
    return db('game_players as gp')
        .join('users as u', 'gp.player_id', 'u.id')
        .where('gp.pod_id', podId)
        .whereNull('gp.deleted_at')
        .select(
            'u.id as player_id',
            'u.firstname',
            'u.lastname',
            'u.email',
            'gp.result',
            'gp.confirmed',
            'gp.turn_order',
            'gp.confirmation_time',
            'gp.elo_change',
            'gp.elo_before'
        )
        .orderBy('gp.turn_order', 'asc');
};

/**
 * Get league point settings (including tournament settings)
 * @param {number} leagueId - League ID
 * @returns {Promise<Object>} Points settings including tournament points
 */
const getLeaguePointSettings = async (leagueId) => {
    return db('leagues')
        .where({ id: leagueId })
        .select(
            'points_per_win', 'points_per_loss', 'points_per_draw',
            'tournament_win_points', 'tournament_non_win_points', 'tournament_dq_points'
        )
        .first();
};

/**
 * Calculate points for a result based on league settings
 * @param {string} result - Result type: 'win', 'loss', 'draw', 'disqualified'
 * @param {Object} league - League settings with points_per_*
 * @returns {number} Points to award
 */
const calculatePoints = (result, league) => {
    if (result === 'win') return league.points_per_win || 4;
    if (result === 'loss') return league.points_per_loss || 1;
    if (result === 'draw') return league.points_per_draw || 1;
    return 0;
};

/**
 * Apply game stats for completed pods
 * Updates both global user stats and league-specific stats
 * Also handles tournament stats if isTournamentGame is true
 *
 * @param {Array} participants - Array of participant records with player_id, result
 * @param {number} leagueId - League ID for league stats
 * @param {boolean} isTournamentGame - Whether this is a tournament game (optional)
 * @returns {Promise<void>}
 */
const applyGameStats = async (participants, leagueId, isTournamentGame = false) => {
    const league = await getLeaguePointSettings(leagueId);

    if (!league) {
        logger.warn('League not found for stats application', { leagueId });
        return;
    }

    for (const p of participants) {
        // DQ'd players get a loss on their record but 0 points
        const isDq = p.result === 'disqualified';
        const wins = p.result === 'win' ? 1 : 0;
        const losses = (p.result === 'loss' || isDq) ? 1 : 0;
        const draws = p.result === 'draw' ? 1 : 0;
        const points = isDq ? 0 : calculatePoints(p.result, league);

        // Update global user stats
        await db('users')
            .where({ id: p.player_id })
            .increment({
                wins,
                losses,
                draws
            });

        // Update league-specific stats
        await db('user_leagues')
            .where({ user_id: p.player_id, league_id: leagueId })
            .increment({
                league_wins: wins,
                league_losses: losses,
                league_draws: draws,
                total_points: points
            });

        // Apply tournament stats if this is a tournament game
        if (isTournamentGame) {
            let tPoints = 0;
            let tWins = 0;
            let tNonWins = 0;
            let tDqs = 0;

            if (isDq) {
                tPoints = league.tournament_dq_points || 0;
                tDqs = 1;
            } else if (p.result === 'win') {
                tPoints = league.tournament_win_points || 4;
                tWins = 1;
            } else {
                // loss or draw both count as non-win
                tPoints = league.tournament_non_win_points || 1;
                tNonWins = 1;
            }

            await db('user_leagues')
                .where({ user_id: p.player_id, league_id: leagueId })
                .increment({
                    tournament_points: tPoints,
                    tournament_wins: tWins,
                    tournament_non_wins: tNonWins,
                    tournament_dqs: tDqs
                });
        }
    }

    logger.debug('Game stats applied', {
        leagueId,
        participantCount: participants.length,
        isTournamentGame
    });
};

/**
 * Reverse game stats for a pod (used when editing/deleting completed pods)
 * Reverses both global user stats and league-specific stats
 * Also reverses tournament stats if isTournamentGame is true
 *
 * @param {Array} participants - Array of participant records with player_id, result, elo_change
 * @param {number} leagueId - League ID for league stats
 * @param {boolean} isTournamentGame - Whether this was a tournament game (optional)
 * @returns {Promise<void>}
 */
const reverseGameStats = async (participants, leagueId, isTournamentGame = false) => {
    const league = await getLeaguePointSettings(leagueId);

    if (!league) {
        logger.warn('League not found for stats reversal', { leagueId });
        return;
    }

    for (const p of participants) {
        // DQ'd players had a loss recorded but 0 points
        const isDq = p.result === 'disqualified';
        const wins = p.result === 'win' ? -1 : 0;
        const losses = (p.result === 'loss' || isDq) ? -1 : 0;
        const draws = p.result === 'draw' ? -1 : 0;
        const points = isDq ? 0 : -calculatePoints(p.result, league);

        // Reverse global user stats
        await db('users')
            .where({ id: p.player_id })
            .increment({
                wins,
                losses,
                draws
            });

        // Reverse league stats
        await db('user_leagues')
            .where({ user_id: p.player_id, league_id: leagueId })
            .increment({
                league_wins: wins,
                league_losses: losses,
                league_draws: draws,
                total_points: points
            });

        // Reverse ELO using stored elo_change
        if (p.elo_change && p.elo_change !== 0) {
            await db('users')
                .where({ id: p.player_id })
                .decrement('elo_rating', p.elo_change);

            await db('user_leagues')
                .where({ user_id: p.player_id, league_id: leagueId })
                .decrement('elo_rating', p.elo_change);
        }

        // Reverse tournament stats if this was a tournament game
        if (isTournamentGame) {
            let tPoints = 0;
            let tWins = 0;
            let tNonWins = 0;
            let tDqs = 0;

            if (isDq) {
                tPoints = -(league.tournament_dq_points || 0);
                tDqs = -1;
            } else if (p.result === 'win') {
                tPoints = -(league.tournament_win_points || 4);
                tWins = -1;
            } else {
                tPoints = -(league.tournament_non_win_points || 1);
                tNonWins = -1;
            }

            await db('user_leagues')
                .where({ user_id: p.player_id, league_id: leagueId })
                .increment({
                    tournament_points: tPoints,
                    tournament_wins: tWins,
                    tournament_non_wins: tNonWins,
                    tournament_dqs: tDqs
                });
        }
    }

    logger.debug('Game stats reversed', {
        leagueId,
        participantCount: participants.length,
        isTournamentGame
    });
};

/**
 * Apply ELO changes for a completed pod
 * Updates both global and league ELO, and stores history in game_players
 *
 * @param {Array} participants - Array of participant records with player_id, result, turn_order
 * @param {number} podId - Pod ID for storing ELO history
 * @param {number} leagueId - League ID for league ELO
 * @returns {Promise<Array>} Array of ELO changes { playerId, eloChange, eloBefore }
 */
const applyEloChanges = async (participants, podId, leagueId) => {
    // Batch fetch current ELO ratings (avoid N+1 queries)
    const playerIds = participants.map(p => p.player_id);

    const [users, userLeagues] = await Promise.all([
        db('users')
            .whereIn('id', playerIds)
            .select('id', 'elo_rating', 'wins', 'losses', 'draws'),
        db('user_leagues')
            .whereIn('user_id', playerIds)
            .where('league_id', leagueId)
            .select('user_id', 'elo_rating')
    ]);

    // Create lookup maps for O(1) access
    const usersMap = new Map(users.map(u => [u.id, u]));
    const leagueEloMap = new Map(userLeagues.map(ul => [ul.user_id, ul.elo_rating]));

    // Build player data for ELO calculation
    const playersWithElo = participants.map(p => {
        const user = usersMap.get(p.player_id);
        const gamesPlayed = (user?.wins || 0) + (user?.losses || 0) + (user?.draws || 0);

        return {
            playerId: p.player_id,
            currentElo: user?.elo_rating || 1500,
            currentLeagueElo: leagueEloMap.get(p.player_id) || 1500,
            result: p.result,
            turnOrder: p.turn_order,
            gamesPlayed
        };
    });

    // Calculate ELO changes using the calculator utility
    const eloChanges = calculateEloChanges(playersWithElo);

    // Apply ELO changes and store history
    for (const change of eloChanges) {
        const player = playersWithElo.find(p => p.playerId === change.playerId);

        if (change.eloChange !== 0) {
            // Update global ELO
            await db('users')
                .where({ id: change.playerId })
                .update({ elo_rating: player.currentElo + change.eloChange });

            // Update league ELO
            await db('user_leagues')
                .where({ user_id: change.playerId, league_id: leagueId })
                .update({ elo_rating: player.currentLeagueElo + change.eloChange });
        }

        // Store ELO change in game_players for history/audit
        await db('game_players')
            .where({ pod_id: podId, player_id: change.playerId })
            .update({
                elo_change: change.eloChange,
                elo_before: change.eloBefore
            });
    }

    logger.debug('ELO changes applied', {
        podId,
        leagueId,
        changes: eloChanges.map(c => ({ playerId: c.playerId, change: c.eloChange }))
    });

    return eloChanges;
};

/**
 * Handle DQ toggle for a player in a completed pod
 *
 * When toggling to DQ (from loss, draw, or win):
 *   - Remove the old result's stats (win/loss/draw count and points)
 *   - Add a loss with 0 points
 *
 * When toggling from DQ back to loss:
 *   - The loss count stays the same
 *   - Add loss points back
 *
 * @param {number} playerId - Player ID
 * @param {number} leagueId - League ID
 * @param {boolean} isDq - True if player is now DQ'd, false if reinstated
 * @param {string} previousResult - The result before the toggle ('win', 'loss', 'draw', or 'disqualified')
 * @returns {Promise<void>}
 */
const handleDqToggle = async (playerId, leagueId, isDq, previousResult) => {
    const league = await getLeaguePointSettings(leagueId);
    const lossPoints = league?.points_per_loss || 1;
    const drawPoints = league?.points_per_draw || 1;
    const winPoints = league?.points_per_win || 4;

    if (isDq) {
        // Player is now DQ'd - need to adjust from their previous result
        if (previousResult === 'loss') {
            // Was a loss: loss count stays, remove loss points
            await db('user_leagues')
                .where({ user_id: playerId, league_id: leagueId })
                .increment({ total_points: -lossPoints });
        } else if (previousResult === 'draw') {
            // Was a draw: remove draw, add loss, remove draw points
            await db('users')
                .where({ id: playerId })
                .increment({ draws: -1, losses: 1 });

            await db('user_leagues')
                .where({ user_id: playerId, league_id: leagueId })
                .increment({
                    league_draws: -1,
                    league_losses: 1,
                    total_points: -drawPoints
                });
        } else if (previousResult === 'win') {
            // Was a win: remove win, add loss, remove win points
            await db('users')
                .where({ id: playerId })
                .increment({ wins: -1, losses: 1 });

            await db('user_leagues')
                .where({ user_id: playerId, league_id: leagueId })
                .increment({
                    league_wins: -1,
                    league_losses: 1,
                    total_points: -winPoints
                });
        }
        // If previousResult was already 'disqualified', no change needed
    } else {
        // Player is no longer DQ'd (going back to loss) - just restore loss points
        // The loss count stays the same since DQ counted as a loss
        await db('user_leagues')
            .where({ user_id: playerId, league_id: leagueId })
            .increment({ total_points: lossPoints });
    }

    logger.debug('DQ toggle handled', { playerId, leagueId, isDq, previousResult });
};

/**
 * Complete a pod - full workflow for marking a pod as complete
 * Applies stats, calculates ELO, updates pod status
 *
 * @param {number} podId - Pod ID
 * @param {number} leagueId - League ID
 * @param {string} result - Pod result: 'win' or 'draw'
 * @returns {Promise<Object>} Updated pod with participants
 */
const completePod = async (podId, leagueId, result) => {
    const participants = await getParticipants(podId);

    // Apply stats
    await applyGameStats(participants, leagueId);

    // Apply ELO changes
    await applyEloChanges(participants, podId, leagueId);

    // Update pod status
    await db('game_pods')
        .where({ id: podId })
        .update({
            confirmation_status: 'complete',
            result
        });

    logger.info('Pod completed', { podId, leagueId, result });

    // Return updated pod
    const pod = await getById(podId);
    const participantsWithUsers = await getParticipantsWithUsers(podId);

    return { ...pod, participants: participantsWithUsers };
};

module.exports = {
    getById,
    getParticipants,
    getParticipantsWithUsers,
    getLeaguePointSettings,
    calculatePoints,
    applyGameStats,
    reverseGameStats,
    applyEloChanges,
    handleDqToggle,
    completePod
};
