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

/**
 * Get the matchup matrix for all players in a league
 * Returns how many times each pair of players has faced each other
 * @param {number} leagueId - The league ID
 * @returns {Object} Matrix of player matchups
 */
const getLeagueMatchupMatrix = async (leagueId) => {
    // Get all completed pods in this league
    const pods = await db('game_pods')
        .where('league_id', leagueId)
        .where('confirmation_status', 'complete')
        .whereNull('deleted_at')
        .select('id');

    if (pods.length === 0) {
        return { players: [], matrix: {} };
    }

    const podIds = pods.map(p => p.id);

    // Get all players who participated in these pods
    const allPlayers = await db('game_players as gp')
        .join('users as u', 'gp.player_id', 'u.id')
        .whereIn('gp.pod_id', podIds)
        .select('gp.player_id', 'u.firstname', 'u.lastname')
        .groupBy('gp.player_id', 'u.firstname', 'u.lastname');

    // Build matchup counts
    const matrix = {};
    for (const p of allPlayers) {
        matrix[p.player_id] = {};
    }

    // For each pod, increment matchup count for all pairs
    for (const pod of pods) {
        const players = await db('game_players')
            .where('pod_id', pod.id)
            .select('player_id');

        const playerIds = players.map(p => p.player_id);

        // For each pair in this pod
        for (let i = 0; i < playerIds.length; i++) {
            for (let j = i + 1; j < playerIds.length; j++) {
                const p1 = playerIds[i];
                const p2 = playerIds[j];

                if (!matrix[p1]) matrix[p1] = {};
                if (!matrix[p2]) matrix[p2] = {};

                matrix[p1][p2] = (matrix[p1][p2] || 0) + 1;
                matrix[p2][p1] = (matrix[p2][p1] || 0) + 1;
            }
        }
    }

    return {
        players: allPlayers.map(p => ({
            id: p.player_id,
            firstname: p.firstname,
            lastname: p.lastname
        })),
        matrix
    };
};

/**
 * Calculate optimal distribution of pod sizes to minimize leftover players
 * Pods can be 3 or 4 players (Commander format)
 * @param {number} totalPlayers - Total number of players
 * @returns {Object} { podsOf4, podsOf3, leftover }
 */
const calculatePodDistribution = (totalPlayers) => {
    // Try to minimize leftover players using combinations of 3 and 4 player pods
    // Priority: prefer 4-player pods when possible, fall back to 3-player pods
    let bestDistribution = { podsOf4: 0, podsOf3: 0, leftover: totalPlayers };

    // Maximum possible pods of 4
    const maxPodsOf4 = Math.floor(totalPlayers / 4);

    for (let podsOf4 = maxPodsOf4; podsOf4 >= 0; podsOf4--) {
        const remainingAfter4s = totalPlayers - (podsOf4 * 4);
        const podsOf3 = Math.floor(remainingAfter4s / 3);
        const leftover = remainingAfter4s - (podsOf3 * 3);

        if (leftover < bestDistribution.leftover) {
            bestDistribution = { podsOf4, podsOf3, leftover };
        }

        // Perfect fit found (0 leftover)
        if (leftover === 0) break;
    }

    return bestDistribution;
};

/**
 * Suggest optimal pod compositions based on who hasn't played each other
 * Supports flexible pod sizes (3-4 players) to minimize leftover players
 * @param {Array} attendeeIds - Array of user IDs who are checked in
 * @param {number} leagueId - The league ID
 * @returns {Array} Suggested pod groupings
 */
const suggestPods = async (attendeeIds, leagueId) => {
    const totalPlayers = attendeeIds.length;

    if (totalPlayers < 3) {
        return {
            pods: [],
            leftover: attendeeIds,
            message: `Not enough players for a pod (need at least 3, have ${totalPlayers})`
        };
    }

    // Calculate optimal pod distribution
    const distribution = calculatePodDistribution(totalPlayers);
    const podSizes = [
        ...Array(distribution.podsOf4).fill(4),
        ...Array(distribution.podsOf3).fill(3)
    ];

    // Get matchup matrix for the league
    const { matrix } = await getLeagueMatchupMatrix(leagueId);

    // Get player info
    const players = await db('users')
        .whereIn('id', attendeeIds)
        .select('id', 'firstname', 'lastname');

    const playerMap = {};
    players.forEach(p => { playerMap[p.id] = p; });

    // Calculate "freshness" score for each pair (lower = played more often)
    const getPairScore = (p1, p2) => {
        const games = (matrix[p1] && matrix[p1][p2]) || 0;
        return games;
    };

    // Calculate pod score (sum of all pair matchups - lower is better/fresher)
    const getPodScore = (podPlayerIds) => {
        let score = 0;
        for (let i = 0; i < podPlayerIds.length; i++) {
            for (let j = i + 1; j < podPlayerIds.length; j++) {
                score += getPairScore(podPlayerIds[i], podPlayerIds[j]);
            }
        }
        return score;
    };

    // Greedy algorithm: build pods by minimizing matchup overlap
    const remaining = [...attendeeIds];
    const suggestedPods = [];

    // Build each pod with its designated size
    for (const targetSize of podSizes) {
        if (remaining.length < targetSize) break;

        let bestPod = null;
        let bestScore = Infinity;

        // Try different combinations to find the best pod
        // For efficiency, use a greedy approach starting with least-played pairs
        const pairs = [];
        for (let i = 0; i < remaining.length; i++) {
            for (let j = i + 1; j < remaining.length; j++) {
                pairs.push({
                    players: [remaining[i], remaining[j]],
                    score: getPairScore(remaining[i], remaining[j])
                });
            }
        }
        pairs.sort((a, b) => a.score - b.score);

        // Start with the freshest pair and build a pod
        for (const startPair of pairs.slice(0, Math.min(10, pairs.length))) {
            const pod = [...startPair.players];
            const available = remaining.filter(id => !pod.includes(id));

            // Add players that minimize the pod score
            while (pod.length < targetSize && available.length > 0) {
                let bestAddition = null;
                let bestAdditionScore = Infinity;

                for (const candidate of available) {
                    const testPod = [...pod, candidate];
                    const score = getPodScore(testPod);
                    if (score < bestAdditionScore) {
                        bestAdditionScore = score;
                        bestAddition = candidate;
                    }
                }

                if (bestAddition !== null) {
                    pod.push(bestAddition);
                    available.splice(available.indexOf(bestAddition), 1);
                }
            }

            const podScore = getPodScore(pod);
            if (podScore < bestScore) {
                bestScore = podScore;
                bestPod = pod;
            }
        }

        if (bestPod) {
            suggestedPods.push({
                players: bestPod.map(id => ({
                    id,
                    ...playerMap[id]
                })),
                size: targetSize,
                score: bestScore,
                pairings: bestPod.flatMap((p1, i) =>
                    bestPod.slice(i + 1).map(p2 => ({
                        player1: p1,
                        player2: p2,
                        previousGames: getPairScore(p1, p2)
                    }))
                )
            });

            // Remove these players from remaining
            for (const id of bestPod) {
                remaining.splice(remaining.indexOf(id), 1);
            }
        } else {
            break;
        }
    }

    return {
        pods: suggestedPods,
        leftover: remaining.map(id => ({
            id,
            ...playerMap[id]
        })),
        totalPlayers,
        distribution: {
            podsOf4: distribution.podsOf4,
            podsOf3: distribution.podsOf3,
            expectedLeftover: distribution.leftover
        }
    };
};

module.exports = {
    getById,
    getParticipants,
    updateById,
    deleteById,
    getOpponentMatchups,
    getLeagueMatchupMatrix,
    suggestPods,
};