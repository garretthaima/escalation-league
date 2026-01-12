const db = require('../models/db');

// Fetch a game or pod by ID
const getById = async (table, id) => {
    return db(table).where({ id }).first();
};

// Fetch participants for a game or pod
const getParticipants = async (table, id) => {
    return db('game_players as gp')
        .join('users as u', 'gp.player_id', 'u.id')
        .select('u.id as player_id', 'u.username')
        .where(`gp.${table}_id`, id);
};

// Update a game or pod
const updateById = async (table, id, updates) => {
    return db(table).where({ id }).update(updates);
};

// Soft delete a game or pod
const deleteById = async (table, id) => {
    return db(table).where({ id }).update({ deleted_at: db.fn.now() });
};

/**
 * Get opponent matchup stats for a player in a league
 * Returns head-to-head record against all opponents they've played
 * @param {number} playerId - The player's user ID
 * @param {number} leagueId - The league ID
 * @returns {Object} Object with nemesis (beats them most), victim (they beat most), and all matchups
 */
const getOpponentMatchups = async (playerId, leagueId) => {
    // Get all completed pods where this player participated in this league
    const playerPods = await db('game_players as gp')
        .join('game_pods as pod', 'gp.pod_id', 'pod.id')
        .where('gp.player_id', playerId)
        .where('pod.league_id', leagueId)
        .where('pod.confirmation_status', 'complete')
        .whereNull('pod.deleted_at')
        .select('gp.pod_id', 'gp.result as player_result');

    if (playerPods.length === 0) {
        return { nemesis: null, victim: null, matchups: [] };
    }

    const podIds = playerPods.map(p => p.pod_id);
    const playerResultsByPod = {};
    playerPods.forEach(p => {
        playerResultsByPod[p.pod_id] = p.player_result;
    });

    // Get all opponents in those pods
    const opponents = await db('game_players as gp')
        .join('users as u', 'gp.player_id', 'u.id')
        .whereIn('gp.pod_id', podIds)
        .whereNot('gp.player_id', playerId)
        .select('gp.pod_id', 'gp.player_id as opponent_id', 'gp.result as opponent_result', 'u.firstname', 'u.lastname');

    // Calculate head-to-head records
    const matchupMap = {};

    for (const opp of opponents) {
        const oppId = opp.opponent_id;
        const playerResult = playerResultsByPod[opp.pod_id];

        if (!matchupMap[oppId]) {
            matchupMap[oppId] = {
                opponent_id: oppId,
                firstname: opp.firstname,
                lastname: opp.lastname,
                games_played: 0,
                wins_against: 0,    // times this player beat opponent
                losses_against: 0,  // times opponent beat this player
                draws: 0
            };
        }

        matchupMap[oppId].games_played++;

        // Determine outcome: who won this pod?
        if (playerResult === 'win') {
            matchupMap[oppId].wins_against++;
        } else if (opp.opponent_result === 'win') {
            matchupMap[oppId].losses_against++;
        } else if (playerResult === 'draw') {
            matchupMap[oppId].draws++;
        }
    }

    const matchups = Object.values(matchupMap);

    // Find nemesis (opponent who beats them most)
    let nemesis = null;
    let maxLosses = 0;
    for (const m of matchups) {
        if (m.losses_against > maxLosses) {
            maxLosses = m.losses_against;
            nemesis = m;
        }
    }

    // Find victim (opponent they beat most)
    let victim = null;
    let maxWins = 0;
    for (const m of matchups) {
        if (m.wins_against > maxWins) {
            maxWins = m.wins_against;
            victim = m;
        }
    }

    return {
        nemesis: nemesis ? {
            opponent_id: nemesis.opponent_id,
            firstname: nemesis.firstname,
            lastname: nemesis.lastname,
            losses_against: nemesis.losses_against,
            games_played: nemesis.games_played
        } : null,
        victim: victim ? {
            opponent_id: victim.opponent_id,
            firstname: victim.firstname,
            lastname: victim.lastname,
            wins_against: victim.wins_against,
            games_played: victim.games_played
        } : null,
        matchups
    };
};

module.exports = {
    getById,
    getParticipants,
    updateById,
    deleteById,
    getOpponentMatchups,
};