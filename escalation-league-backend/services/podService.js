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
 * Get league point settings
 * @param {number} leagueId - League ID
 * @returns {Promise<Object>} Points settings { points_per_win, points_per_loss, points_per_draw }
 */
const getLeaguePointSettings = async (leagueId) => {
    return db('leagues')
        .where({ id: leagueId })
        .select('points_per_win', 'points_per_loss', 'points_per_draw')
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
 *
 * @param {Array} participants - Array of participant records with player_id, result
 * @param {number} leagueId - League ID for league stats
 * @returns {Promise<void>}
 */
const applyGameStats = async (participants, leagueId) => {
    const league = await getLeaguePointSettings(leagueId);

    if (!league) {
        logger.warn('League not found for stats application', { leagueId });
        return;
    }

    for (const p of participants) {
        // DQ'd players get 0 for everything
        if (p.result === 'disqualified') {
            continue;
        }

        const wins = p.result === 'win' ? 1 : 0;
        const losses = p.result === 'loss' ? 1 : 0;
        const draws = p.result === 'draw' ? 1 : 0;
        const points = calculatePoints(p.result, league);

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
    }

    logger.debug('Game stats applied', {
        leagueId,
        participantCount: participants.length
    });
};

/**
 * Reverse game stats for a pod (used when editing/deleting completed pods)
 * Reverses both global user stats and league-specific stats
 *
 * @param {Array} participants - Array of participant records with player_id, result, elo_change
 * @param {number} leagueId - League ID for league stats
 * @returns {Promise<void>}
 */
const reverseGameStats = async (participants, leagueId) => {
    const league = await getLeaguePointSettings(leagueId);

    if (!league) {
        logger.warn('League not found for stats reversal', { leagueId });
        return;
    }

    for (const p of participants) {
        // Skip DQ'd players - they never got stats in the first place
        if (p.result === 'disqualified') {
            continue;
        }

        const wins = p.result === 'win' ? -1 : 0;
        const losses = p.result === 'loss' ? -1 : 0;
        const draws = p.result === 'draw' ? -1 : 0;
        const points = -calculatePoints(p.result, league);

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
    }

    logger.debug('Game stats reversed', {
        leagueId,
        participantCount: participants.length
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
    // Fetch current ELO ratings and prepare player data for calculation
    const playersWithElo = await Promise.all(
        participants.map(async (p) => {
            const user = await db('users')
                .where({ id: p.player_id })
                .select('elo_rating', 'wins', 'losses', 'draws')
                .first();

            const userLeague = await db('user_leagues')
                .where({ user_id: p.player_id, league_id: leagueId })
                .select('elo_rating')
                .first();

            // Total games for K-factor calculation
            const gamesPlayed = (user?.wins || 0) + (user?.losses || 0) + (user?.draws || 0);

            return {
                playerId: p.player_id,
                currentElo: user?.elo_rating || 1500,
                currentLeagueElo: userLeague?.elo_rating || 1500,
                result: p.result,
                turnOrder: p.turn_order,
                gamesPlayed
            };
        })
    );

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
 * Adjusts stats based on whether player is being DQ'd or reinstated
 *
 * @param {number} playerId - Player ID
 * @param {number} leagueId - League ID
 * @param {boolean} isDq - True if player is now DQ'd, false if reinstated
 * @returns {Promise<void>}
 */
const handleDqToggle = async (playerId, leagueId, isDq) => {
    const league = await getLeaguePointSettings(leagueId);
    const lossPoints = league?.points_per_loss || 1;

    if (isDq) {
        // Player is now DQ'd - remove their loss stats (they had loss stats before)
        await db('users')
            .where({ id: playerId })
            .increment({ losses: -1 });

        await db('user_leagues')
            .where({ user_id: playerId, league_id: leagueId })
            .increment({
                league_losses: -1,
                total_points: -lossPoints
            });
    } else {
        // Player is no longer DQ'd - add loss stats back
        await db('users')
            .where({ id: playerId })
            .increment({ losses: 1 });

        await db('user_leagues')
            .where({ user_id: playerId, league_id: leagueId })
            .increment({
                league_losses: 1,
                total_points: lossPoints
            });
    }

    logger.debug('DQ toggle handled', { playerId, leagueId, isDq });
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
