/**
 * League Service - Centralized business logic for league management
 *
 * This service consolidates common league queries and operations used
 * across multiple controllers.
 */

const db = require('../models/db');

/**
 * Get a league by ID
 * @param {number} leagueId - League ID
 * @returns {Promise<Object|undefined>} League record or undefined
 */
const getById = async (leagueId) => {
    return db('leagues').where({ id: leagueId }).first();
};

/**
 * Get the currently active league
 * @returns {Promise<Object|undefined>} Active league or undefined
 */
const getActive = async () => {
    return db('leagues').where({ is_active: true }).first();
};

/**
 * Get point settings for a league
 * @param {number} leagueId - League ID
 * @returns {Promise<Object>} Points settings { points_per_win, points_per_loss, points_per_draw }
 */
const getPointSettings = async (leagueId) => {
    return db('leagues')
        .where({ id: leagueId })
        .select('points_per_win', 'points_per_loss', 'points_per_draw')
        .first();
};

/**
 * Get a user's league enrollment record
 * @param {number} userId - User ID
 * @param {number} leagueId - League ID
 * @returns {Promise<Object|undefined>} User league record or undefined
 */
const getUserLeague = async (userId, leagueId) => {
    return db('user_leagues')
        .where({ user_id: userId, league_id: leagueId })
        .first();
};

/**
 * Get all participants for a league
 * @param {number} leagueId - League ID
 * @param {boolean} includeInactive - Whether to include inactive users
 * @returns {Promise<Array>} Array of league participants with user details
 */
const getLeagueParticipants = async (leagueId, includeInactive = false) => {
    let query = db('user_leagues as ul')
        .join('users as u', 'ul.user_id', 'u.id')
        .where('ul.league_id', leagueId);

    if (!includeInactive) {
        query = query.where('ul.is_active', true);
    }

    return query.select(
        'u.id as user_id',
        'u.firstname',
        'u.lastname',
        'u.email',
        'ul.league_wins',
        'ul.league_losses',
        'ul.league_draws',
        'ul.total_points',
        'ul.elo_rating',
        'ul.is_active',
        'ul.disqualified',
        'ul.joined_at',
        'ul.current_commander'
    );
};

/**
 * Get league leaderboard with rankings
 * @param {number} leagueId - League ID
 * @returns {Promise<Array>} Sorted leaderboard with ranks
 */
const getLeaderboard = async (leagueId) => {
    const participants = await db('user_leagues as ul')
        .join('users as u', 'ul.user_id', 'u.id')
        .where('ul.league_id', leagueId)
        .where('ul.is_active', true)
        .select(
            'u.id as player_id',
            'u.firstname',
            'u.lastname',
            'ul.league_wins as wins',
            'ul.league_losses as losses',
            'ul.league_draws as draws',
            'ul.total_points',
            'ul.elo_rating',
            db.raw('ul.league_wins + ul.league_losses + ul.league_draws AS total_games'),
            db.raw(`
                ROUND(
                    (ul.league_wins / NULLIF(ul.league_wins + ul.league_losses + ul.league_draws, 0)) * 100, 2
                ) AS win_rate
            `)
        )
        .orderBy('ul.total_points', 'desc')
        .orderBy('ul.league_wins', 'desc')
        .orderBy('ul.elo_rating', 'desc');

    // Add ranks
    participants.forEach((player, index) => {
        player.rank = index + 1;
    });

    return participants;
};

/**
 * Check if a user is enrolled in a league
 * @param {number} userId - User ID
 * @param {number} leagueId - League ID
 * @returns {Promise<boolean>} True if user is enrolled
 */
const isUserEnrolled = async (userId, leagueId) => {
    const enrollment = await getUserLeague(userId, leagueId);
    return !!enrollment;
};

/**
 * Get all active leagues
 * @returns {Promise<Array>} Array of active leagues
 */
const getAllActive = async () => {
    return db('leagues').where({ is_active: true });
};

/**
 * Get league enrollment count
 * @param {number} leagueId - League ID
 * @returns {Promise<number>} Count of active enrollments
 */
const getEnrollmentCount = async (leagueId) => {
    const result = await db('user_leagues')
        .where({ league_id: leagueId, is_active: true })
        .count('* as count')
        .first();
    return result?.count || 0;
};

module.exports = {
    getById,
    getActive,
    getPointSettings,
    getUserLeague,
    getLeagueParticipants,
    getLeaderboard,
    isUserEnrolled,
    getAllActive,
    getEnrollmentCount
};
