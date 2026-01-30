/**
 * Tournament Controller
 * Handles all tournament-related operations including phase transitions,
 * pod generation, and championship management.
 * Issue #76: Finals Tournament System
 */

const crypto = require('crypto');
const db = require('../models/db');
const logger = require('../utils/logger');
const { emitPodCreated } = require('../utils/socketEmitter');
const { cacheInvalidators } = require('../middlewares/cacheMiddleware');
const { createNotification } = require('../services/notificationService');

/**
 * Generate a cryptographically secure random number between 0 and 1
 * Uses crypto.randomBytes for better entropy than Math.random()
 */
function secureRandom() {
    // Generate 4 random bytes (32 bits)
    const buffer = crypto.randomBytes(4);
    // Convert to unsigned 32-bit integer
    const uint32 = buffer.readUInt32BE(0);
    // Normalize to [0, 1) range
    return uint32 / 0x100000000;
}

/**
 * Fisher-Yates shuffle using cryptographically secure randomness
 */
function secureShuffleArray(array) {
    const result = [...array];
    for (let i = result.length - 1; i > 0; i--) {
        // Generate secure random index from 0 to i (inclusive)
        const j = Math.floor(secureRandom() * (i + 1));
        [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
}

/**
 * End Regular Season - Lock stats and qualify players
 * POST /api/leagues/:id/tournament/end-regular-season
 */
const endRegularSeason = async (req, res) => {
    const { id: leagueId } = req.params;
    const adminId = req.user.id;

    try {
        // Verify league exists and is in regular_season phase
        const league = await db('leagues').where({ id: leagueId }).first();
        if (!league) {
            return res.status(404).json({ error: 'League not found.' });
        }
        if (league.league_phase !== 'regular_season') {
            return res.status(400).json({
                error: `League is already in ${league.league_phase} phase.`
            });
        }

        // Check for incomplete pods
        const incompletePods = await db('game_pods')
            .where({ league_id: leagueId })
            .whereIn('confirmation_status', ['open', 'active', 'pending'])
            .whereNull('deleted_at')
            .count('id as count')
            .first();

        if (incompletePods.count > 0) {
            return res.status(400).json({
                error: `Cannot end regular season. ${incompletePods.count} incomplete pod(s) exist.`,
                incompletePodCount: incompletePods.count
            });
        }

        // Get all active, non-DQ players sorted by points (tiebreakers: wins, then fewer losses)
        const players = await db('user_leagues')
            .where({ league_id: leagueId, is_active: true, disqualified: false })
            .orderBy([
                { column: 'total_points', order: 'desc' },
                { column: 'league_wins', order: 'desc' },
                { column: 'league_losses', order: 'asc' }
            ]);

        const totalPlayers = players.length;
        if (totalPlayers < 4) {
            return res.status(400).json({
                error: 'Need at least 4 players to start a tournament.'
            });
        }

        // Calculate qualifying spots (75% rounded to even number)
        const qualificationPercent = league.tournament_qualification_percent || 75;
        let qualifyingSpots = Math.ceil(totalPlayers * (qualificationPercent / 100));
        if (qualifyingSpots % 2 !== 0) {
            qualifyingSpots++; // Round up to even
        }
        qualifyingSpots = Math.min(qualifyingSpots, totalPlayers);

        // Ensure we have at least 4 qualified players
        if (qualifyingSpots < 4) {
            qualifyingSpots = 4;
        }

        // Start transaction
        await db.transaction(async (trx) => {
            // Update league phase
            await trx('leagues')
                .where({ id: leagueId })
                .update({
                    league_phase: 'tournament',
                    regular_season_locked_at: trx.fn.now()
                });

            // Qualify top players and assign seeds
            for (let i = 0; i < players.length; i++) {
                const isQualified = i < qualifyingSpots;
                await trx('user_leagues')
                    .where({ id: players[i].id })
                    .update({
                        finals_qualified: isQualified,
                        tournament_seed: isQualified ? i + 1 : null,
                        // Reset tournament stats
                        tournament_points: 0,
                        tournament_wins: 0,
                        tournament_non_wins: 0,
                        tournament_dqs: 0,
                        championship_qualified: false,
                        is_champion: false
                    });
            }
        });

        // Get qualified players for response
        const qualifiedPlayers = await db('user_leagues as ul')
            .join('users as u', 'ul.user_id', 'u.id')
            .where({ 'ul.league_id': leagueId, 'ul.finals_qualified': true })
            .orderBy('ul.tournament_seed', 'asc')
            .select(
                'u.id as player_id', 'u.firstname', 'u.lastname',
                'ul.tournament_seed', 'ul.total_points', 'ul.league_wins', 'ul.league_losses'
            );

        // Notify all qualified players
        for (const player of qualifiedPlayers) {
            await createNotification(req.app, player.player_id, {
                title: 'Tournament Qualified!',
                message: `You've qualified for the finals tournament as seed #${player.tournament_seed}!`,
                type: 'success',
                link: '/leagues/tournament'
            });
        }

        // Invalidate caches
        cacheInvalidators.leagueUpdated(leagueId);

        logger.info('Regular season ended', { leagueId, qualifyingSpots, totalPlayers, adminId });

        res.status(200).json({
            message: 'Regular season ended. Tournament phase started.',
            qualifiedCount: qualifyingSpots,
            totalPlayers,
            qualifiedPlayers
        });
    } catch (err) {
        logger.error('Error ending regular season', err, { leagueId });
        res.status(500).json({ error: 'Failed to end regular season.' });
    }
};

/**
 * Get Tournament Status
 * GET /api/leagues/:id/tournament
 */
const getTournamentStatus = async (req, res) => {
    const { id: leagueId } = req.params;

    try {
        const league = await db('leagues')
            .where({ id: leagueId })
            .select('*')
            .first();

        if (!league) {
            return res.status(404).json({ error: 'League not found.' });
        }

        // Get qualified players with their tournament stats
        const qualifiedPlayers = await db('user_leagues as ul')
            .join('users as u', 'ul.user_id', 'u.id')
            .where({ 'ul.league_id': leagueId, 'ul.finals_qualified': true })
            .orderBy('ul.tournament_seed', 'asc')
            .select(
                'u.id as player_id', 'u.firstname', 'u.lastname',
                'ul.tournament_seed', 'ul.tournament_points',
                'ul.tournament_wins', 'ul.tournament_non_wins', 'ul.tournament_dqs',
                'ul.championship_qualified', 'ul.is_champion',
                'ul.total_points as regular_season_points'
            );

        // Get tournament pod statistics
        const pods = await db('game_pods')
            .where({ league_id: leagueId, is_tournament_game: true })
            .whereNull('deleted_at')
            .select('id', 'tournament_round', 'confirmation_status', 'is_championship_game');

        const podStats = {
            totalPods: pods.length,
            completedPods: pods.filter(p => p.confirmation_status === 'complete').length,
            pendingPods: pods.filter(p => p.confirmation_status !== 'complete').length,
            qualifyingPods: pods.filter(p => !p.is_championship_game).length,
            championshipPod: pods.find(p => p.is_championship_game) || null
        };

        // Calculate games per player
        const playerGameCounts = await db('game_players as gp')
            .join('game_pods as pod', 'gp.pod_id', 'pod.id')
            .where({ 'pod.league_id': leagueId, 'pod.is_tournament_game': true })
            .whereNull('pod.deleted_at')
            .whereNull('gp.deleted_at')
            .groupBy('gp.player_id')
            .select('gp.player_id', db.raw('COUNT(*) as game_count'));

        const gameCountMap = {};
        playerGameCounts.forEach(pc => { gameCountMap[pc.player_id] = parseInt(pc.game_count); });

        res.status(200).json({
            league: {
                id: league.id,
                name: league.name,
                phase: league.league_phase,
                regular_season_locked_at: league.regular_season_locked_at,
                tournament_win_points: league.tournament_win_points,
                tournament_non_win_points: league.tournament_non_win_points,
                tournament_dq_points: league.tournament_dq_points
            },
            qualifiedPlayers: qualifiedPlayers.map(p => ({
                ...p,
                games_played: gameCountMap[p.player_id] || 0
            })),
            podStats
        });
    } catch (err) {
        logger.error('Error getting tournament status', err, { leagueId });
        res.status(500).json({ error: 'Failed to get tournament status.' });
    }
};

/**
 * Get Tournament Standings (Leaderboard)
 * GET /api/leagues/:id/tournament/standings
 */
const getTournamentStandings = async (req, res) => {
    const { id: leagueId } = req.params;

    try {
        const standings = await db('user_leagues as ul')
            .join('users as u', 'ul.user_id', 'u.id')
            .where({ 'ul.league_id': leagueId, 'ul.finals_qualified': true })
            .orderBy([
                { column: 'ul.tournament_points', order: 'desc' },
                { column: 'ul.tournament_wins', order: 'desc' },
                { column: 'ul.tournament_seed', order: 'asc' }
            ])
            .select(
                'u.id as player_id', 'u.firstname', 'u.lastname',
                'ul.tournament_seed', 'ul.tournament_points',
                'ul.tournament_wins', 'ul.tournament_non_wins', 'ul.tournament_dqs',
                'ul.championship_qualified', 'ul.is_champion',
                'ul.total_points as regular_season_points'
            );

        // Add tournament rank
        standings.forEach((player, index) => {
            player.tournament_rank = index + 1;
        });

        res.status(200).json({ standings });
    } catch (err) {
        logger.error('Error getting tournament standings', err, { leagueId });
        res.status(500).json({ error: 'Failed to get tournament standings.' });
    }
};

/**
 * Generate Tournament Pods
 * POST /api/leagues/:id/tournament/generate-pods
 *
 * Algorithm: Each player plays exactly 4 games in 4-player pods.
 * For N qualified players, we need N total pods (each player appears in 4 pods).
 */
const generateTournamentPods = async (req, res) => {
    const { id: leagueId } = req.params;
    const adminId = req.user.id;

    try {
        const league = await db('leagues').where({ id: leagueId }).first();
        if (!league || league.league_phase !== 'tournament') {
            return res.status(400).json({
                error: 'League must be in tournament phase to generate pods.'
            });
        }

        // Check if tournament pods already exist
        const existingPods = await db('game_pods')
            .where({ league_id: leagueId, is_tournament_game: true, is_championship_game: false })
            .whereNull('deleted_at')
            .count('id as count')
            .first();

        if (existingPods.count > 0) {
            return res.status(400).json({
                error: 'Tournament pods have already been generated.',
                existingPodCount: existingPods.count
            });
        }

        // Get qualified players
        const qualifiedPlayers = await db('user_leagues as ul')
            .join('users as u', 'ul.user_id', 'u.id')
            .where({ 'ul.league_id': leagueId, 'ul.finals_qualified': true })
            .orderBy('ul.tournament_seed', 'asc')
            .select('u.id as player_id', 'u.firstname', 'u.lastname', 'ul.tournament_seed');

        const n = qualifiedPlayers.length;
        if (n < 4) {
            return res.status(400).json({
                error: 'Need at least 4 qualified players.'
            });
        }

        // Generate pods using balanced round-robin algorithm
        const playerIds = qualifiedPlayers.map(p => p.player_id);
        const pods = generateBalancedPods(playerIds, 4, 4);

        // Validate: each player should appear in exactly 4 pods
        const playerCounts = {};
        for (const pod of pods) {
            for (const playerId of pod) {
                playerCounts[playerId] = (playerCounts[playerId] || 0) + 1;
            }
        }

        const invalidCounts = Object.entries(playerCounts).filter(([, count]) => count !== 4);
        if (invalidCounts.length > 0) {
            logger.warn('Pod generation produced uneven game counts', { invalidCounts });
        }

        // Create pods in database as unpublished drafts
        const createdPods = [];
        await db.transaction(async (trx) => {
            for (let i = 0; i < pods.length; i++) {
                const [podId] = await trx('game_pods').insert({
                    league_id: leagueId,
                    creator_id: adminId,
                    confirmation_status: 'open',
                    is_tournament_game: true,
                    tournament_round: Math.floor(i / Math.ceil(n / 4)) + 1,
                    is_championship_game: false,
                    published: false
                });

                // Randomly assign turn orders using cryptographically secure shuffle
                const shuffledPlayers = secureShuffleArray(pods[i]);

                const playerInserts = shuffledPlayers.map((playerId, index) => ({
                    pod_id: podId,
                    player_id: playerId,
                    turn_order: index + 1
                }));
                await trx('game_players').insert(playerInserts);

                createdPods.push({
                    id: podId,
                    round: Math.floor(i / Math.ceil(n / 4)) + 1,
                    players: shuffledPlayers
                });
            }
        });

        // Don't emit WebSocket events or notify players yet - pods are drafts
        // Events will be emitted when pods are published

        logger.info('Tournament draft pods generated', { leagueId, podCount: pods.length, adminId });

        res.status(201).json({
            message: 'Tournament draft pods generated. Review and publish when ready.',
            podCount: pods.length,
            gamesPerPlayer: 4,
            qualifiedPlayerCount: n,
            pods: createdPods,
            isDraft: true
        });
    } catch (err) {
        logger.error('Error generating tournament pods', err, { leagueId });
        res.status(500).json({ error: 'Failed to generate tournament pods.' });
    }
};

/**
 * Balanced pod generation algorithm
 * Ensures each player plays exactly `gamesPerPlayer` games in pods of `podSize` players.
 * Maximizes unique matchups.
 */
function generateBalancedPods(playerIds, podSize, gamesPerPlayer) {
    const n = playerIds.length;
    const totalSlots = n * gamesPerPlayer;
    const numPods = totalSlots / podSize;

    // Track how many games each player is assigned
    const playerGames = {};
    playerIds.forEach(id => { playerGames[id] = 0; });

    // Track pairings to minimize repeats
    const pairings = {};
    playerIds.forEach(p1 => {
        pairings[p1] = {};
        playerIds.forEach(p2 => {
            if (p1 !== p2) pairings[p1][p2] = 0;
        });
    });

    const pods = [];

    for (let i = 0; i < numPods; i++) {
        // Get players who still need games, sorted by how many they have
        const eligiblePlayers = playerIds
            .filter(id => playerGames[id] < gamesPerPlayer)
            .sort((a, b) => playerGames[a] - playerGames[b]);

        if (eligiblePlayers.length < podSize) {
            // Should not happen with correct math, but handle gracefully
            logger.warn('Not enough eligible players for pod', {
                podIndex: i,
                eligibleCount: eligiblePlayers.length,
                required: podSize
            });
            break;
        }

        // Select pod by minimizing pairing overlap
        const pod = selectBestPod(eligiblePlayers, podSize, pairings, playerGames);

        // Update tracking
        for (const playerId of pod) {
            playerGames[playerId]++;
        }
        for (let j = 0; j < pod.length; j++) {
            for (let k = j + 1; k < pod.length; k++) {
                pairings[pod[j]][pod[k]]++;
                pairings[pod[k]][pod[j]]++;
            }
        }

        pods.push(pod);
    }

    return pods;
}

/**
 * Select best pod from eligible players by minimizing pairing overlap
 * Uses cryptographically secure randomization for tie-breaking
 */
function selectBestPod(eligiblePlayers, podSize, pairings, playerGames) {
    const pod = [];

    // Start with a random player from those with fewest games (secure random)
    const minGames = playerGames[eligiblePlayers[0]];
    const minGamePlayers = eligiblePlayers.filter(p => playerGames[p] === minGames);
    const shuffledMinPlayers = secureShuffleArray(minGamePlayers);
    pod.push(shuffledMinPlayers[0]);

    while (pod.length < podSize) {
        let bestScore = Infinity;
        let bestCandidates = [];

        for (const candidate of eligiblePlayers) {
            if (pod.includes(candidate)) continue;

            // Calculate pairing score (sum of times played against current pod members)
            let score = 0;
            for (const member of pod) {
                score += pairings[candidate][member];
            }
            // Tie-breaker: prefer players with fewer games
            score += playerGames[candidate] * 0.1;

            if (score < bestScore) {
                bestScore = score;
                bestCandidates = [candidate];
            } else if (score === bestScore) {
                // Collect all candidates with same best score for random selection
                bestCandidates.push(candidate);
            }
        }

        if (bestCandidates.length > 0) {
            // Randomly select from tied candidates using secure random
            const shuffled = secureShuffleArray(bestCandidates);
            pod.push(shuffled[0]);
        } else {
            break;
        }
    }

    return pod;
}

/**
 * Assign turn orders using weighted randomization with cryptographically secure random
 * Players who have been in a position more often have lower weight for that position
 * This balances turn order distribution across all pods
 *
 * Uses exponential decay weighting: weight = e^(-k * count)
 * This provides stronger bias against repeated positions than linear 1/(count+1)
 */
function assignWeightedTurnOrder(podPlayers, turnOrderCounts) {
    const positions = [1, 2, 3, 4];
    const result = new Array(4);
    const remainingPlayers = [...podPlayers];

    // Decay constant - higher = stronger bias against repeated positions
    const decayConstant = 1.5;

    for (const position of positions) {
        if (remainingPlayers.length === 0) break;

        // Calculate weights using exponential decay
        // e^(-k * count): 0 times = 1.0, 1 time = 0.22, 2 times = 0.05
        const weights = remainingPlayers.map(playerId => {
            const count = turnOrderCounts[playerId][position];
            return Math.exp(-decayConstant * count);
        });

        // Normalize weights to probabilities
        const totalWeight = weights.reduce((sum, w) => sum + w, 0);
        const probabilities = weights.map(w => w / totalWeight);

        // Weighted random selection using cryptographically secure random
        const random = secureRandom();
        let cumulative = 0;
        let selectedIndex = remainingPlayers.length - 1; // Default to last if rounding issues

        for (let i = 0; i < probabilities.length; i++) {
            cumulative += probabilities[i];
            if (random < cumulative) {
                selectedIndex = i;
                break;
            }
        }

        // Assign selected player to this position
        const selectedPlayer = remainingPlayers[selectedIndex];
        result[position - 1] = selectedPlayer;
        remainingPlayers.splice(selectedIndex, 1);
    }

    return result;
}

/**
 * Get Tournament Pods (published only for regular users)
 * GET /api/leagues/:id/tournament/pods
 */
const getTournamentPods = async (req, res) => {
    const { id: leagueId } = req.params;
    const { round } = req.query;

    try {
        let query = db('game_pods as gp')
            .where({ 'gp.league_id': leagueId, 'gp.is_tournament_game': true })
            .whereNull('gp.deleted_at')
            // Only show published pods (or pods where published is null for backwards compat)
            .andWhere(function() {
                this.where('gp.published', true).orWhereNull('gp.published');
            });

        if (round) {
            query = query.where('gp.tournament_round', round);
        }

        const pods = await query
            .orderBy([
                { column: 'gp.tournament_round', order: 'asc' },
                { column: 'gp.id', order: 'asc' }
            ])
            .select('gp.*');

        // Fetch participants for each pod
        const podsWithParticipants = await Promise.all(
            pods.map(async (pod) => {
                const participants = await db('game_players as gpl')
                    .join('users as u', 'gpl.player_id', 'u.id')
                    .where('gpl.pod_id', pod.id)
                    .whereNull('gpl.deleted_at')
                    .orderBy('gpl.turn_order', 'asc')
                    .select(
                        'u.id as player_id', 'u.firstname', 'u.lastname',
                        'gpl.result', 'gpl.confirmed', 'gpl.turn_order'
                    );
                return { ...pod, participants };
            })
        );

        // Group by round
        const byRound = {};
        for (const pod of podsWithParticipants) {
            const roundKey = pod.is_championship_game ? 'championship' : `round_${pod.tournament_round}`;
            if (!byRound[roundKey]) byRound[roundKey] = [];
            byRound[roundKey].push(pod);
        }

        res.status(200).json({ pods: podsWithParticipants, byRound });
    } catch (err) {
        logger.error('Error getting tournament pods', err, { leagueId });
        res.status(500).json({ error: 'Failed to get tournament pods.' });
    }
};

/**
 * Get Championship Qualifiers (Top 4)
 * GET /api/leagues/:id/tournament/championship-qualifiers
 */
const getChampionshipQualifiers = async (req, res) => {
    const { id: leagueId } = req.params;

    try {
        // Check if all qualifying pods are complete
        const incompletePods = await db('game_pods')
            .where({
                league_id: leagueId,
                is_tournament_game: true,
                is_championship_game: false
            })
            .whereNot('confirmation_status', 'complete')
            .whereNull('deleted_at')
            .count('id as count')
            .first();

        const allComplete = parseInt(incompletePods.count) === 0;

        // Get top 4 by tournament points (with tiebreakers)
        const qualifiers = await db('user_leagues as ul')
            .join('users as u', 'ul.user_id', 'u.id')
            .where({ 'ul.league_id': leagueId, 'ul.finals_qualified': true })
            .orderBy([
                { column: 'ul.tournament_points', order: 'desc' },
                { column: 'ul.tournament_wins', order: 'desc' },
                { column: 'ul.tournament_seed', order: 'asc' }
            ])
            .limit(4)
            .select(
                'u.id as player_id', 'u.firstname', 'u.lastname',
                'ul.tournament_seed', 'ul.tournament_points',
                'ul.tournament_wins', 'ul.tournament_non_wins'
            );

        res.status(200).json({
            allQualifyingPodsComplete: allComplete,
            incompleteCount: parseInt(incompletePods.count),
            qualifiers
        });
    } catch (err) {
        logger.error('Error getting championship qualifiers', err, { leagueId });
        res.status(500).json({ error: 'Failed to get championship qualifiers.' });
    }
};

/**
 * Start Championship Game
 * POST /api/leagues/:id/tournament/start-championship
 */
const startChampionship = async (req, res) => {
    const { id: leagueId } = req.params;
    const adminId = req.user.id;

    try {
        const league = await db('leagues').where({ id: leagueId }).first();
        if (!league || league.league_phase !== 'tournament') {
            return res.status(400).json({ error: 'League must be in tournament phase.' });
        }

        // Check if championship already exists
        const existingChampionship = await db('game_pods')
            .where({ league_id: leagueId, is_championship_game: true })
            .whereNull('deleted_at')
            .first();

        if (existingChampionship) {
            return res.status(400).json({
                error: 'Championship game already exists.',
                championshipPodId: existingChampionship.id
            });
        }

        // Verify all qualifying pods are complete
        const incompletePods = await db('game_pods')
            .where({
                league_id: leagueId,
                is_tournament_game: true,
                is_championship_game: false
            })
            .whereNot('confirmation_status', 'complete')
            .whereNull('deleted_at')
            .count('id as count')
            .first();

        if (parseInt(incompletePods.count) > 0) {
            return res.status(400).json({
                error: `Cannot start championship. ${incompletePods.count} qualifying pod(s) are incomplete.`
            });
        }

        // Get top 4 players by tournament standings
        const top4 = await db('user_leagues as ul')
            .where({ 'ul.league_id': leagueId, 'ul.finals_qualified': true })
            .orderBy([
                { column: 'ul.tournament_points', order: 'desc' },
                { column: 'ul.tournament_wins', order: 'desc' },
                { column: 'ul.tournament_seed', order: 'asc' }
            ])
            .limit(4)
            .select('ul.user_id', 'ul.id');

        if (top4.length < 4) {
            return res.status(400).json({ error: 'Need 4 players for championship.' });
        }

        let podId;
        await db.transaction(async (trx) => {
            // Mark these players as championship qualified
            for (const player of top4) {
                await trx('user_leagues')
                    .where({ id: player.id })
                    .update({ championship_qualified: true });
            }

            // Create championship pod as unpublished draft
            [podId] = await trx('game_pods').insert({
                league_id: leagueId,
                creator_id: adminId,
                confirmation_status: 'open',
                is_tournament_game: true,
                tournament_round: 5,
                is_championship_game: true,
                published: false
            });

            // Randomize turn order
            const shuffled = [...top4].sort(() => Math.random() - 0.5);
            const playerInserts = shuffled.map((player, index) => ({
                pod_id: podId,
                player_id: player.user_id,
                turn_order: index + 1
            }));
            await trx('game_players').insert(playerInserts);
        });

        // Don't emit WebSocket events or notify players yet - pod is a draft
        // Events will be emitted when pod is published

        logger.info('Championship draft pod created', { leagueId, podId, adminId });

        res.status(201).json({
            message: 'Championship draft pod created. Review and publish when ready.',
            podId,
            qualifiers: top4.map(p => p.user_id),
            isDraft: true
        });
    } catch (err) {
        logger.error('Error starting championship', err, { leagueId });
        res.status(500).json({ error: 'Failed to start championship.' });
    }
};

/**
 * Complete Tournament and Record Champion
 * POST /api/leagues/:id/tournament/complete
 */
const completeTournament = async (req, res) => {
    const { id: leagueId } = req.params;
    const adminId = req.user.id;

    try {
        const league = await db('leagues').where({ id: leagueId }).first();
        if (!league || league.league_phase !== 'tournament') {
            return res.status(400).json({ error: 'League must be in tournament phase.' });
        }

        // Get championship pod
        const championshipPod = await db('game_pods')
            .where({ league_id: leagueId, is_championship_game: true })
            .whereNull('deleted_at')
            .first();

        if (!championshipPod) {
            return res.status(400).json({ error: 'No championship game found.' });
        }

        if (championshipPod.confirmation_status !== 'complete') {
            return res.status(400).json({ error: 'Championship game is not complete.' });
        }

        // Find the winner
        const winner = await db('game_players')
            .where({ pod_id: championshipPod.id, result: 'win' })
            .first();

        if (!winner) {
            return res.status(400).json({
                error: 'No winner found in championship game. If it was a draw, admin must decide champion.'
            });
        }

        await db.transaction(async (trx) => {
            // Mark champion
            await trx('user_leagues')
                .where({ league_id: leagueId, user_id: winner.player_id })
                .update({ is_champion: true });

            // Update league phase
            await trx('leagues')
                .where({ id: leagueId })
                .update({ league_phase: 'completed' });
        });

        const champion = await db('users')
            .where({ id: winner.player_id })
            .select('id', 'firstname', 'lastname')
            .first();

        // Notify all league members about the champion
        const allMembers = await db('user_leagues')
            .where({ league_id: leagueId })
            .select('user_id');

        for (const member of allMembers) {
            await createNotification(req.app, member.user_id, {
                title: 'League Champion Crowned!',
                message: `${champion.firstname} ${champion.lastname} is the League Champion!`,
                type: 'success',
                link: '/leagues/tournament'
            });
        }

        // Invalidate caches
        cacheInvalidators.leagueUpdated(leagueId);

        logger.info('Tournament completed', { leagueId, championId: winner.player_id, adminId });

        res.status(200).json({
            message: 'Tournament completed!',
            champion
        });
    } catch (err) {
        logger.error('Error completing tournament', err, { leagueId });
        res.status(500).json({ error: 'Failed to complete tournament.' });
    }
};

/**
 * Admin: Reset tournament (for testing/corrections)
 * POST /api/leagues/:id/tournament/reset
 */
const resetTournament = async (req, res) => {
    const { id: leagueId } = req.params;
    const { confirmReset } = req.body;
    const adminId = req.user.id;

    if (confirmReset !== 'RESET_TOURNAMENT') {
        return res.status(400).json({
            error: 'Must confirm reset by passing confirmReset: "RESET_TOURNAMENT"'
        });
    }

    try {
        await db.transaction(async (trx) => {
            // Delete all tournament game_players first (due to foreign key)
            const tournamentPodIds = await trx('game_pods')
                .where({ league_id: leagueId, is_tournament_game: true })
                .pluck('id');

            if (tournamentPodIds.length > 0) {
                await trx('game_players')
                    .whereIn('pod_id', tournamentPodIds)
                    .del();
            }

            // Delete all tournament pods
            await trx('game_pods')
                .where({ league_id: leagueId, is_tournament_game: true })
                .del();

            // Reset user_leagues tournament fields
            await trx('user_leagues')
                .where({ league_id: leagueId })
                .update({
                    finals_qualified: false,
                    tournament_seed: null,
                    tournament_points: 0,
                    tournament_wins: 0,
                    tournament_non_wins: 0,
                    tournament_dqs: 0,
                    championship_qualified: false,
                    is_champion: false
                });

            // Reset league to regular season
            await trx('leagues')
                .where({ id: leagueId })
                .update({
                    league_phase: 'regular_season',
                    regular_season_locked_at: null
                });
        });

        // Invalidate caches
        cacheInvalidators.leagueUpdated(leagueId);

        logger.info('Tournament reset', { leagueId, adminId });
        res.status(200).json({ message: 'Tournament reset successfully.' });
    } catch (err) {
        logger.error('Error resetting tournament', err, { leagueId });
        res.status(500).json({ error: 'Failed to reset tournament.' });
    }
};

/**
 * Get Draft Tournament Pods (admin only)
 * GET /api/leagues/:id/tournament/draft-pods
 */
const getDraftTournamentPods = async (req, res) => {
    const { id: leagueId } = req.params;

    try {
        const pods = await db('game_pods as gp')
            .where({ 'gp.league_id': leagueId, 'gp.is_tournament_game': true, 'gp.published': false })
            .whereNull('gp.deleted_at')
            .orderBy([
                { column: 'gp.is_championship_game', order: 'desc' },
                { column: 'gp.tournament_round', order: 'asc' },
                { column: 'gp.id', order: 'asc' }
            ])
            .select('gp.*');

        // Fetch participants for each pod
        const podsWithParticipants = await Promise.all(
            pods.map(async (pod) => {
                const participants = await db('game_players as gpl')
                    .join('users as u', 'gpl.player_id', 'u.id')
                    .where('gpl.pod_id', pod.id)
                    .whereNull('gpl.deleted_at')
                    .orderBy('gpl.turn_order', 'asc')
                    .select(
                        'u.id as player_id', 'u.firstname', 'u.lastname',
                        'gpl.turn_order'
                    );
                return { ...pod, participants };
            })
        );

        res.status(200).json({
            draftPods: podsWithParticipants,
            count: podsWithParticipants.length
        });
    } catch (err) {
        logger.error('Error getting draft tournament pods', err, { leagueId });
        res.status(500).json({ error: 'Failed to get draft tournament pods.' });
    }
};

/**
 * Publish Draft Tournament Pods (admin only)
 * POST /api/leagues/:id/tournament/publish-pods
 */
const publishTournamentPods = async (req, res) => {
    const { id: leagueId } = req.params;
    const adminId = req.user.id;

    try {
        // Get all unpublished tournament pods for this league
        const draftPods = await db('game_pods')
            .where({ league_id: leagueId, is_tournament_game: true, published: false })
            .whereNull('deleted_at');

        if (draftPods.length === 0) {
            return res.status(400).json({ error: 'No draft pods to publish.' });
        }

        const now = new Date();

        // Update all draft pods to published
        await db('game_pods')
            .whereIn('id', draftPods.map(p => p.id))
            .update({
                published: true,
                published_at: now,
                confirmation_status: 'active'
            });

        // Emit WebSocket events for each published pod
        for (const pod of draftPods) {
            emitPodCreated(req.app, leagueId, {
                id: pod.id,
                league_id: leagueId,
                is_tournament_game: true,
                tournament_round: pod.tournament_round,
                is_championship_game: pod.is_championship_game,
                confirmation_status: 'active'
            });
        }

        // Get qualified players for notifications
        const qualifiedPlayers = await db('user_leagues as ul')
            .join('users as u', 'ul.user_id', 'u.id')
            .where({ 'ul.league_id': leagueId, 'ul.finals_qualified': true })
            .select('u.id as player_id');

        // Determine notification message based on pod type
        const hasChampionship = draftPods.some(p => p.is_championship_game);
        const notificationTitle = hasChampionship ? 'Championship Pod Published!' : 'Tournament Pods Published!';
        const notificationMessage = hasChampionship
            ? "The championship game is ready! Check your tournament pods."
            : 'Tournament pods have been published. Play your qualifying games!';

        // Notify qualified players
        for (const player of qualifiedPlayers) {
            await createNotification(req.app, player.player_id, {
                title: notificationTitle,
                message: notificationMessage,
                type: 'info',
                link: '/leagues/tournament'
            });
        }

        logger.info('Tournament pods published', { leagueId, podCount: draftPods.length, adminId });

        res.status(200).json({
            message: `${draftPods.length} tournament pod(s) published.`,
            publishedCount: draftPods.length
        });
    } catch (err) {
        logger.error('Error publishing tournament pods', err, { leagueId });
        res.status(500).json({ error: 'Failed to publish tournament pods.' });
    }
};

/**
 * Swap Players Between Draft Tournament Pods (admin only)
 * POST /api/leagues/:id/tournament/swap-players
 */
const swapTournamentPlayers = async (req, res) => {
    const { id: leagueId } = req.params;
    const { player1_id, pod1_id, player2_id, pod2_id } = req.body;
    const adminId = req.user.id;

    if (!player1_id || !pod1_id || !player2_id || !pod2_id) {
        return res.status(400).json({
            error: 'Must provide player1_id, pod1_id, player2_id, and pod2_id.'
        });
    }

    if (pod1_id === pod2_id) {
        return res.status(400).json({ error: 'Cannot swap players within the same pod.' });
    }

    try {
        // Verify both pods are unpublished tournament pods for this league
        const pods = await db('game_pods')
            .whereIn('id', [pod1_id, pod2_id])
            .andWhere({ league_id: leagueId, is_tournament_game: true, published: false })
            .whereNull('deleted_at');

        if (pods.length !== 2) {
            return res.status(400).json({
                error: 'Both pods must be unpublished tournament draft pods for this league.'
            });
        }

        // Verify both players exist in their respective pods
        const [player1Entry, player2Entry] = await Promise.all([
            db('game_players')
                .where({ pod_id: pod1_id, player_id: player1_id })
                .whereNull('deleted_at')
                .first(),
            db('game_players')
                .where({ pod_id: pod2_id, player_id: player2_id })
                .whereNull('deleted_at')
                .first()
        ]);

        if (!player1Entry || !player2Entry) {
            return res.status(400).json({ error: 'Players not found in specified pods.' });
        }

        // Swap the players
        await db.transaction(async (trx) => {
            await trx('game_players')
                .where({ pod_id: pod1_id, player_id: player1_id })
                .update({ player_id: player2_id, turn_order: player1Entry.turn_order });

            await trx('game_players')
                .where({ pod_id: pod2_id, player_id: player2_id })
                .update({ player_id: player1_id, turn_order: player2Entry.turn_order });
        });

        logger.info('Tournament players swapped', {
            leagueId, pod1_id, pod2_id, player1_id, player2_id, adminId
        });

        res.status(200).json({
            message: 'Players swapped successfully.',
            swap: { player1_id, pod1_id, player2_id, pod2_id }
        });
    } catch (err) {
        logger.error('Error swapping tournament players', err, { leagueId });
        res.status(500).json({ error: 'Failed to swap players.' });
    }
};

/**
 * Delete Draft Tournament Pods (admin only)
 * DELETE /api/leagues/:id/tournament/draft-pods
 */
const deleteDraftTournamentPods = async (req, res) => {
    const { id: leagueId } = req.params;
    const { championship_only } = req.query;
    const adminId = req.user.id;

    try {
        let query = db('game_pods')
            .where({ league_id: leagueId, is_tournament_game: true, published: false })
            .whereNull('deleted_at');

        if (championship_only === 'true') {
            query = query.andWhere({ is_championship_game: true });
        }

        const draftPods = await query;

        if (draftPods.length === 0) {
            return res.status(400).json({ error: 'No draft pods to delete.' });
        }

        const podIds = draftPods.map(p => p.id);

        await db.transaction(async (trx) => {
            // Delete game_players first (foreign key)
            await trx('game_players')
                .whereIn('pod_id', podIds)
                .del();

            // Delete the pods
            await trx('game_pods')
                .whereIn('id', podIds)
                .del();
        });

        logger.info('Draft tournament pods deleted', {
            leagueId, podCount: draftPods.length, championshipOnly: championship_only === 'true', adminId
        });

        res.status(200).json({
            message: `${draftPods.length} draft pod(s) deleted.`,
            deletedCount: draftPods.length
        });
    } catch (err) {
        logger.error('Error deleting draft tournament pods', err, { leagueId });
        res.status(500).json({ error: 'Failed to delete draft pods.' });
    }
};

module.exports = {
    endRegularSeason,
    getTournamentStatus,
    getTournamentStandings,
    generateTournamentPods,
    getTournamentPods,
    getChampionshipQualifiers,
    startChampionship,
    completeTournament,
    resetTournament,
    getDraftTournamentPods,
    publishTournamentPods,
    swapTournamentPlayers,
    deleteDraftTournamentPods
};
