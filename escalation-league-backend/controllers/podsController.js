const db = require('../models/db'); // Import the database connection
const gameService = require('../services/gameService');
const podService = require('../services/podService');
const logger = require('../utils/logger');
const {
    emitPodCreated,
    emitPlayerJoined,
    emitPodActivated,
    emitWinnerDeclared,
    emitGameConfirmed
} = require('../utils/socketEmitter');
const { cacheInvalidators } = require('../middlewares/cacheMiddleware');
const { createNotification } = require('../services/notificationService');
const { logPodCreated, logPodJoined, logGameResultDeclared, logGameResultConfirmed, logGameCompleted, logPodOverridden } = require('../services/activityLogService');
const { handleError, notFound, badRequest } = require('../utils/errorUtils');

// Create a Pod
// Supports two modes:
// 1. Simple mode: { leagueId } - creates open pod with creator as first player
// 2. Full mode: { league_id, player_ids, turn_order? } - creates active pod with all players
const createPod = async (req, res) => {
    const { leagueId, league_id, player_ids, turn_order } = req.body;
    const creatorId = req.user.id;
    const effectiveLeagueId = leagueId || league_id;

    logger.info('Pod creation requested', {
        userId: creatorId,
        leagueId: effectiveLeagueId,
        hasPlayerIds: !!player_ids
    });

    try {
        // Mode 2: Create pod with specific players (from pod suggestions)
        if (player_ids && Array.isArray(player_ids) && player_ids.length >= 3) {
            if (player_ids.length > 6) {
                return res.status(400).json({ error: 'Maximum 6 players allowed in a pod.' });
            }

            // Validate player IDs are valid integers and no duplicates
            const parsedIds = player_ids.map(id => parseInt(id, 10));
            const uniqueIds = new Set(parsedIds);
            if (parsedIds.some(id => !Number.isInteger(id) || id <= 0)) {
                return res.status(400).json({ error: 'All player IDs must be valid positive integers.' });
            }
            if (uniqueIds.size !== player_ids.length) {
                return res.status(400).json({ error: 'Duplicate player IDs are not allowed.' });
            }

            // Validate turn_order if provided
            if (turn_order && Array.isArray(turn_order)) {
                if (turn_order.length !== player_ids.length) {
                    return res.status(400).json({ error: 'Turn order must have same length as player_ids.' });
                }
                const turnOrderSet = new Set(turn_order);
                const playerIdSet = new Set(player_ids);
                if (turn_order.some(id => !playerIdSet.has(id)) || player_ids.some(id => !turnOrderSet.has(id))) {
                    return res.status(400).json({ error: 'Turn order must contain exactly the same player IDs.' });
                }
            }

            // Create the pod as active (since we have full roster)
            const [podId] = await db('game_pods').insert({
                league_id: effectiveLeagueId,
                creator_id: creatorId,
                confirmation_status: 'active'
            });

            // Add all players with turn order
            const orderToUse = turn_order || player_ids;
            const playerInserts = orderToUse.map((playerId, index) => ({
                pod_id: podId,
                player_id: playerId,
                turn_order: index + 1
            }));
            await db('game_players').insert(playerInserts);

            // Fetch pod with participants for response
            const pod = await db('game_pods').where({ id: podId }).first();
            const participants = await db('game_players as gp')
                .join('users as u', 'gp.player_id', 'u.id')
                .where('gp.pod_id', podId)
                .whereNull('gp.deleted_at')
                .select('u.id as player_id', 'u.firstname', 'u.lastname', 'u.email', 'gp.result', 'gp.confirmed', 'gp.turn_order')
                .orderBy('gp.turn_order', 'asc');

            logger.info('Pod created with players', {
                userId: creatorId,
                leagueId: effectiveLeagueId,
                podId,
                playerCount: player_ids.length
            });

            // Log activity
            await logPodCreated(creatorId, podId, effectiveLeagueId);

            // Emit WebSocket event
            emitPodCreated(req.app, effectiveLeagueId, {
                id: podId,
                league_id: effectiveLeagueId,
                creator_id: creatorId,
                confirmation_status: 'active',
                participants
            });

            return res.status(201).json({ ...pod, participants });
        }

        // Mode 1: Simple pod creation (original behavior)
        const [podId] = await db('game_pods').insert({
            league_id: effectiveLeagueId,
            creator_id: creatorId,
        });

        // Add the creator as a participant in the pod (turn_order 1)
        await db('game_players').insert({
            pod_id: podId,
            player_id: creatorId,
            turn_order: 1
        });

        // Fetch the created pod to return it in the response
        const pod = await db('game_pods').where({ id: podId }).first();

        // Fetch creator details for participants array
        const creator = await db('users')
            .where({ id: creatorId })
            .select('id', 'firstname', 'lastname', 'email')
            .first();

        logger.info('Pod created successfully', {
            userId: creatorId,
            leagueId: effectiveLeagueId,
            podId
        });

        // Log activity
        await logPodCreated(creatorId, podId, effectiveLeagueId);

        // Emit WebSocket event with complete pod data including participants
        emitPodCreated(req.app, effectiveLeagueId, {
            id: podId,
            league_id: effectiveLeagueId,
            creator_id: creatorId,
            confirmation_status: 'open',
            participants: [{
                player_id: creator.id,
                firstname: creator.firstname,
                lastname: creator.lastname,
                email: creator.email,
                result: null,
                confirmed: 0,
                turn_order: 1
            }]
        });

        res.status(201).json(pod);
    } catch (err) {
        handleError(res, err, 'Failed to create pod');
    }
};

const joinPod = async (req, res) => {
    const podId = parseInt(req.params.podId, 10);
    const playerId = req.user.id;

    try {
        // Check if the pod exists and is open
        const pod = await db('game_pods').where({ id: podId, confirmation_status: 'open' }).first();
        if (!pod) {
            return res.status(404).json({ error: 'Pod not found or is no longer open.' });
        }

        // Check if the pod already has enough participants
        const participantCountResult = await db('game_players').where({ pod_id: podId }).count('id as count').first();
        const participantCount = participantCountResult?.count || 0;

        if (participantCount >= 4) {
            return res.status(400).json({ error: 'Pod is already full.' });
        }

        // Check if the user is already in the pod
        const existingParticipant = await db('game_players')
            .where({ pod_id: podId, player_id: playerId })
            .first();
        if (existingParticipant) {
            return res.status(400).json({ error: 'You are already part of this pod.' });
        }

        // Add the user to the pod with next turn order
        await db('game_players').insert({
            pod_id: podId,
            player_id: playerId,
            turn_order: participantCount + 1
        });

        // Fetch user details for WebSocket event
        const user = await db('users')
            .where({ id: playerId })
            .select('id', 'firstname', 'lastname', 'email')
            .first();

        // Log activity
        await logPodJoined(playerId, podId);

        // Emit player joined event
        emitPlayerJoined(req.app, pod.league_id, podId, user);

        // Check if the pod now has enough participants to become active
        if (participantCount + 1 >= 4) {
            await db('game_pods').where({ id: podId }).update({ confirmation_status: 'active' });

            // Emit pod activated event
            emitPodActivated(req.app, pod.league_id, podId);
        }

        res.status(200).json({ message: 'Joined pod successfully.' });
    } catch (err) {
        handleError(res, err, 'Failed to join pod');
    }
};

const logPodResult = async (req, res) => {
    const podId = parseInt(req.params.podId, 10);
    const { result } = req.body || {};
    const playerId = req.user.id;

    try {
        // Check if the player is part of the pod
        const participant = await db('game_players')
            .where({ pod_id: podId, player_id: playerId })
            .first();

        if (!participant) {
            return res.status(404).json({ error: 'Player is not part of this pod.' });
        }

        // If declaring a win, check if someone else already won
        if (result === 'win') {
            const existingWinner = await db('game_players')
                .where({ pod_id: podId, result: 'win' })
                .whereNot({ player_id: playerId })
                .first();

            if (existingWinner) {
                return res.status(400).json({ error: 'A winner has already been declared for this game.' });
            }
        }

        // Build update data
        const updateData = { confirmed: 1, confirmation_time: db.fn.now() };
        if (result !== undefined) {
            updateData.result = result;
        } else {
            // If no result specified, check if someone declared a win or draw
            const winner = await db('game_players')
                .where({ pod_id: podId, result: 'win' })
                .first();

            if (winner) {
                // Someone won, so this player lost
                updateData.result = 'loss';
            } else {
                // Check if someone declared a draw
                const drawer = await db('game_players')
                    .where({ pod_id: podId, result: 'draw' })
                    .first();

                if (drawer) {
                    // It's a draw, so everyone gets draw
                    updateData.result = 'draw';
                }
            }
        }

        // ATOMIC update - only updates if confirmed = 0 (prevents race condition)
        // This ensures that even if two requests arrive simultaneously,
        // only one will successfully update and proceed with stats
        const rowsUpdated = await db('game_players')
            .where({ pod_id: podId, player_id: playerId, confirmed: 0 })
            .update(updateData);

        // If no rows updated, the player was already confirmed (race condition caught)
        if (rowsUpdated === 0) {
            return res.status(200).json({
                message: 'Result already confirmed',
                alreadyConfirmed: true
            });
        }

        // Get pod details for WebSocket events
        const pod = await db('game_pods').where({ id: podId }).first();

        // If declaring a win or draw, update pod status to pending and emit event
        if (result === 'win' || result === 'draw') {
            await db('game_pods').where({ id: podId }).update({ confirmation_status: 'pending' });
            emitWinnerDeclared(req.app, pod.league_id, podId, playerId);

            // Log activity - result declared
            await logGameResultDeclared(playerId, podId, result === 'win' ? playerId : null);

            // Get declarer's name and notify other players to confirm
            const declarer = await db('users').where({ id: playerId }).first();
            const declarerName = declarer ? `${declarer.firstname} ${declarer.lastname}` : 'A player';
            const otherPlayers = await db('game_players')
                .where({ pod_id: podId })
                .whereNot({ player_id: playerId })
                .select('player_id');

            for (const player of otherPlayers) {
                await createNotification(req.app, player.player_id, {
                    title: 'Confirm Game Result',
                    message: `${declarerName} declared a ${result} in Pod #${podId}. Please confirm.`,
                    type: 'info',
                    link: `/pods?podId=${podId}`
                });
            }

            // Notify the declarer that they're waiting for confirmations
            await createNotification(req.app, playerId, {
                title: 'Awaiting Confirmations',
                message: `You declared a ${result} in Pod #${podId}. Waiting for ${otherPlayers.length} player${otherPlayers.length > 1 ? 's' : ''} to confirm.`,
                type: 'info',
                link: `/pods?podId=${podId}`
            });
        }

        // Check if all participants have confirmed
        // Use == instead of === because MySQL tinyint may return as number or boolean
        const participants = await db('game_players').where({ pod_id: podId });
        const allConfirmed = participants.every((p) => p.confirmed == 1);

        if (allConfirmed) {
            // Determine the pod result
            const podResult = participants.some((p) => p.result === 'draw') ? 'draw' : 'win';

            // Get the league ID for this pod
            const podData = await db('game_pods').where({ id: podId }).select('league_id').first();

            if (!podData || !podData.league_id) {
                throw notFound('League for this pod');
            }

            // Apply game stats using podService
            await podService.applyGameStats(participants, podData.league_id);

            // Apply ELO changes using podService
            await podService.applyEloChanges(participants, podId, podData.league_id);

            // Update the pod's status to 'complete'
            await db('game_pods')
                .where({ id: podId })
                .update({
                    confirmation_status: 'complete',
                    result: podResult,
                });

            // Log activity - game completed
            await logGameCompleted(playerId, podId);

            // Emit game completed event
            emitGameConfirmed(req.app, podData.league_id, podId, playerId, true);

            // Invalidate caches for this league
            cacheInvalidators.gameCompleted(podData.league_id);

            // Notify all players that the game is complete
            for (const p of participants) {
                const resultText = p.result === 'win' ? 'won' : p.result === 'draw' ? 'drew' : 'lost';
                await createNotification(req.app, p.player_id, {
                    title: 'Game Complete',
                    message: `Pod #${podId} is complete. You ${resultText}!`,
                    type: p.result === 'win' ? 'success' : 'info',
                    link: `/pods?podId=${podId}`
                });
            }

            return res.status(200).json({ message: 'Game result logged successfully, stats updated, and pod marked as complete.' });
        } else {
            // Log activity - result confirmed (not the declarer, just confirming)
            await logGameResultConfirmed(playerId, podId);

            // Update the pod's confirmation status to 'pending'
            await db('game_pods')
                .where({ id: podId })
                .update({
                    confirmation_status: 'pending',
                    result: null,
                });

            // Emit partial confirmation event
            emitGameConfirmed(req.app, pod.league_id, podId, playerId, false);

            return res.status(200).json({ message: 'Confirmation recorded. Waiting for other players.' });
        }
    } catch (err) {
        handleError(res, err, 'Failed to log pod result');
    }
};


const getPods = async (req, res) => {
    const { podId, confirmation_status, league_id, includeDeleted } = req.query; // Optional filters

    try {
        const query = db('game_pods as gp')
            .leftJoin('leagues as l', 'gp.league_id', 'l.id')
            .select('gp.*', 'l.name as league_name');

        // Only filter out deleted pods if includeDeleted is not 'true'
        if (includeDeleted !== 'true') {
            query.where({ 'gp.deleted_at': null });
        }

        if (podId) {
            query.andWhere({ 'gp.id': podId });
        }

        if (confirmation_status) {
            query.andWhere({ 'gp.confirmation_status': confirmation_status });
        }

        if (league_id) {
            query.andWhere({ 'gp.league_id': league_id });
        }

        const pods = await query;

        // Batch fetch all participants for all pods (avoid N+1 queries)
        const podIds = pods.map(p => p.id);
        let allParticipants = [];

        if (podIds.length > 0) {
            allParticipants = await db('game_players as gp')
                .join('users as u', 'gp.player_id', 'u.id')
                .join('game_pods as pod', 'gp.pod_id', 'pod.id')
                .leftJoin('user_leagues as ul', function() {
                    this.on('ul.user_id', '=', 'gp.player_id')
                        .andOn('ul.league_id', '=', 'pod.league_id');
                })
                .select(
                    'gp.pod_id',
                    'u.id as player_id',
                    'u.firstname',
                    'u.lastname',
                    'u.email',
                    'gp.result',
                    'gp.confirmed',
                    'gp.turn_order',
                    'gp.confirmation_time',
                    'ul.current_commander',
                    'ul.commander_partner'
                )
                .whereIn('gp.pod_id', podIds)
                .whereNull('gp.deleted_at')
                .orderBy('gp.turn_order', 'asc');
        }

        // Group participants by pod_id
        const participantsByPod = allParticipants.reduce((acc, p) => {
            if (!acc[p.pod_id]) acc[p.pod_id] = [];
            acc[p.pod_id].push(p);
            return acc;
        }, {});

        // Map participants to pods
        const podsWithParticipants = pods.map(pod => ({
            ...pod,
            participants: participantsByPod[pod.id] || []
        }));

        // If a specific podId was requested, return only that pod
        if (podId) {
            return res.status(200).json(podsWithParticipants[0] || null);
        }

        res.status(200).json(podsWithParticipants);
    } catch (err) {
        handleError(res, err, 'Failed to fetch pods');
    }
};



// Override a 3-player pod to active status
const overridePod = async (req, res) => {
    const podId = parseInt(req.params.podId, 10);

    try {
        // Check if the pod exists and is open
        const pod = await db('game_pods').where({ id: podId, confirmation_status: 'open' }).first();
        if (!pod) {
            return res.status(404).json({ error: 'Pod not found or is not open.' });
        }

        // Check if the pod has at least 3 players
        const participantCountResult = await db('game_players').where({ pod_id: podId }).count('id as count').first();
        const participantCount = participantCountResult?.count || 0;

        if (participantCount < 3) {
            return res.status(400).json({ error: 'Pod must have at least 3 players to override.' });
        }

        // Update pod to active
        await db('game_pods').where({ id: podId }).update({ confirmation_status: 'active' });

        // Emit WebSocket event
        emitPodActivated(req.app, pod.league_id, podId);

        // Log the admin action
        await logPodOverridden(req.user.id, podId);

        res.status(200).json({ message: 'Pod successfully overridden to active.' });
    } catch (err) {
        handleError(res, err, 'Failed to override pod');
    }
};

/**
 * Get life tracker state for a pod
 * Returns saved state if exists, or null for initialization
 */
const getLifeTrackerState = async (req, res) => {
    const podId = parseInt(req.params.podId, 10);
    const userId = req.user.id;

    try {
        // Verify pod exists
        const pod = await db('game_pods').where({ id: podId }).first();
        if (!pod) {
            return res.status(404).json({ error: 'Pod not found.' });
        }

        // Verify user is participant in the pod
        const participant = await db('game_players')
            .where({ pod_id: podId, player_id: userId })
            .whereNull('deleted_at')
            .first();

        if (!participant) {
            return res.status(403).json({ error: 'You are not a participant in this pod.' });
        }

        // Fetch saved state
        const savedState = await db('pod_life_tracker')
            .where({ pod_id: podId })
            .first();

        // Return the state (or null if none saved)
        // Handle both string and already-parsed JSON (depends on MySQL driver)
        let parsedState = null;
        if (savedState?.state) {
            parsedState = typeof savedState.state === 'string'
                ? JSON.parse(savedState.state)
                : savedState.state;
        }

        res.status(200).json({
            state: parsedState,
            podId
        });
    } catch (err) {
        handleError(res, err, 'Failed to fetch life tracker state');
    }
};

/**
 * Update life tracker state for a pod
 * Creates or updates the saved state
 */
const updateLifeTrackerState = async (req, res) => {
    const podId = parseInt(req.params.podId, 10);
    const { state } = req.body;
    const userId = req.user.id;

    try {
        // Verify pod exists
        const pod = await db('game_pods').where({ id: podId }).first();
        if (!pod) {
            return res.status(404).json({ error: 'Pod not found.' });
        }

        // Verify user is participant in the pod
        const participant = await db('game_players')
            .where({ pod_id: podId, player_id: userId })
            .whereNull('deleted_at')
            .first();

        if (!participant) {
            return res.status(403).json({ error: 'You are not a participant in this pod.' });
        }

        // Upsert the state
        const existingState = await db('pod_life_tracker')
            .where({ pod_id: podId })
            .first();

        if (existingState) {
            await db('pod_life_tracker')
                .where({ pod_id: podId })
                .update({
                    state: JSON.stringify(state),
                    updated_at: db.fn.now()
                });
        } else {
            await db('pod_life_tracker').insert({
                pod_id: podId,
                state: JSON.stringify(state)
            });
        }

        logger.debug('Life tracker state updated', { podId, userId });

        res.status(200).json({ message: 'Life tracker state saved.', podId });
    } catch (err) {
        handleError(res, err, 'Failed to update life tracker state');
    }
};

module.exports = {
    createPod,
    getPods,
    joinPod,
    logPodResult,
    overridePod,
    getLifeTrackerState,
    updateLifeTrackerState,
};
