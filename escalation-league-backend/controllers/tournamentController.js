/**
 * Tournament Controller
 * Handles all tournament-related operations including phase transitions,
 * pod generation, and championship management.
 * Issue #76: Finals Tournament System
 */

const db = require('../models/db');
const logger = require('../utils/logger');
const { emitPodCreated } = require('../utils/socketEmitter');
const { cacheInvalidators } = require('../middlewares/cacheMiddleware');
const { createNotification } = require('../services/notificationService');

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

        // Create pods in database
        const createdPods = [];
        await db.transaction(async (trx) => {
            for (let i = 0; i < pods.length; i++) {
                const [podId] = await trx('game_pods').insert({
                    league_id: leagueId,
                    creator_id: adminId,
                    confirmation_status: 'active',
                    is_tournament_game: true,
                    tournament_round: Math.floor(i / Math.ceil(n / 4)) + 1,
                    is_championship_game: false
                });

                // Randomize turn order within pod
                const shuffledPlayers = [...pods[i]].sort(() => Math.random() - 0.5);

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

        // Emit WebSocket events for each pod
        for (const pod of createdPods) {
            emitPodCreated(req.app, leagueId, {
                id: pod.id,
                league_id: leagueId,
                is_tournament_game: true,
                tournament_round: pod.round,
                confirmation_status: 'active'
            });
        }

        // Notify qualified players
        for (const player of qualifiedPlayers) {
            await createNotification(req.app, player.player_id, {
                title: 'Tournament Pods Generated',
                message: 'Tournament pods have been created. Play your 4 qualifying games!',
                type: 'info',
                link: '/leagues/tournament'
            });
        }

        logger.info('Tournament pods generated', { leagueId, podCount: pods.length, adminId });

        res.status(201).json({
            message: 'Tournament pods generated successfully.',
            podCount: pods.length,
            gamesPerPlayer: 4,
            qualifiedPlayerCount: n,
            pods: createdPods
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
 */
function selectBestPod(eligiblePlayers, podSize, pairings, playerGames) {
    const pod = [];

    // Start with the player who has the fewest games
    pod.push(eligiblePlayers[0]);

    while (pod.length < podSize) {
        let bestCandidate = null;
        let bestScore = Infinity;

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
                bestCandidate = candidate;
            }
        }

        if (bestCandidate !== null) {
            pod.push(bestCandidate);
        } else {
            break;
        }
    }

    return pod;
}

/**
 * Get Tournament Pods
 * GET /api/leagues/:id/tournament/pods
 */
const getTournamentPods = async (req, res) => {
    const { id: leagueId } = req.params;
    const { round } = req.query;

    try {
        let query = db('game_pods as gp')
            .where({ 'gp.league_id': leagueId, 'gp.is_tournament_game': true })
            .whereNull('gp.deleted_at');

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

            // Create championship pod
            [podId] = await trx('game_pods').insert({
                league_id: leagueId,
                creator_id: adminId,
                confirmation_status: 'active',
                is_tournament_game: true,
                tournament_round: 5,
                is_championship_game: true
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

        // Emit WebSocket event
        emitPodCreated(req.app, leagueId, {
            id: podId,
            league_id: leagueId,
            is_tournament_game: true,
            tournament_round: 5,
            is_championship_game: true,
            confirmation_status: 'active'
        });

        // Notify championship players
        for (const player of top4) {
            await createNotification(req.app, player.user_id, {
                title: 'Championship Qualifier!',
                message: "You've qualified for the Championship Game!",
                type: 'success',
                link: '/leagues/tournament'
            });
        }

        logger.info('Championship started', { leagueId, podId, adminId });

        res.status(201).json({
            message: 'Championship game created.',
            podId,
            qualifiers: top4.map(p => p.user_id)
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

module.exports = {
    endRegularSeason,
    getTournamentStatus,
    getTournamentStandings,
    generateTournamentPods,
    getTournamentPods,
    getChampionshipQualifiers,
    startChampionship,
    completeTournament,
    resetTournament
};
