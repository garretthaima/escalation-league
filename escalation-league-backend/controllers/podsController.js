const db = require('../models/db'); // Import the database connection
const gameService = require('../services/gameService');
const logger = require('../utils/logger');
const {
    emitPodCreated,
    emitPlayerJoined,
    emitPodActivated,
    emitWinnerDeclared,
    emitGameConfirmed
} = require('../utils/socketEmitter');

// Create a Pod
const createPod = async (req, res) => {
    const { leagueId } = req.body;
    const creatorId = req.user.id;

    logger.info('Pod creation requested', {
        userId: creatorId,
        leagueId
    });

    try {
        // Create the pod and get the inserted ID
        const [podId] = await db('game_pods').insert({
            league_id: leagueId,
            creator_id: creatorId,
        });

        // Add the creator as a participant in the pod
        await db('game_players').insert({
            pod_id: podId,
            player_id: creatorId,
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
            leagueId,
            podId
        });

        // Emit WebSocket event with complete pod data including participants
        emitPodCreated(req.app, leagueId, {
            id: podId,
            league_id: leagueId,
            creator_id: creatorId,
            confirmation_status: 'open',
            participants: [{
                player_id: creator.id,
                firstname: creator.firstname,
                lastname: creator.lastname,
                email: creator.email,
                result: null,
                confirmed: 0
            }]
        });

        res.status(201).json(pod);
    } catch (err) {
        logger.error('Error creating pod', err, {
            userId: creatorId,
            leagueId
        });
        res.status(500).json({ error: 'Failed to create pod.' });
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

        // Add the user to the pod
        await db('game_players').insert({
            pod_id: podId,
            player_id: playerId,
        });

        // Fetch user details for WebSocket event
        const user = await db('users')
            .where({ id: playerId })
            .select('id', 'firstname', 'lastname', 'email')
            .first();

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
        console.error('Error joining pod:', err.message);
        res.status(500).json({ error: 'Failed to join pod.' });
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

        // Prevent double-confirmation (race condition protection)
        if (participant.confirmed === 1) {
            return res.status(200).json({ 
                message: 'Result already confirmed',
                alreadyConfirmed: true 
            });
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

        // Update the player's confirmation status and optionally their result
        const updateData = { confirmed: 1, confirmation_time: db.fn.now() };
        if (result !== undefined) {
            updateData.result = result;
        } else {
            // If no result specified, check if someone else already won
            // If so, this player should be marked as a loss
            const winner = await db('game_players')
                .where({ pod_id: podId, result: 'win' })
                .first();

            if (winner) {
                updateData.result = 'loss';
            }
        }

        await db('game_players')
            .where({ pod_id: podId, player_id: playerId })
            .update(updateData);

        // Get pod details for WebSocket events
        const pod = await db('game_pods').where({ id: podId }).first();

        // If declaring a win, update pod status to pending and emit event
        if (result === 'win') {
            await db('game_pods').where({ id: podId }).update({ confirmation_status: 'pending' });
            emitWinnerDeclared(req.app, pod.league_id, podId, playerId);
        }

        // Check if all participants have confirmed
        const participants = await db('game_players').where({ pod_id: podId });
        const allConfirmed = participants.every((p) => p.confirmed === 1);

        if (allConfirmed) {
            // Determine the pod result
            const podResult = participants.some((p) => p.result === 'draw') ? 'draw' : 'win';

            // Get the league ID and point settings for this pod
            const pod = await db('game_pods').where({ id: podId }).select('league_id').first();

            if (!pod || !pod.league_id) {
                return res.status(404).json({ error: 'League not found for this pod.' });
            }

            // Fetch league point settings
            const league = await db('leagues')
                .where({ id: pod.league_id })
                .select('points_per_win', 'points_per_loss', 'points_per_draw')
                .first();

            // Update stats for all participants
            for (const p of participants) {
                // DQ'd players get 0 for everything
                if (p.result === 'disqualified') {
                    // DQ'd players don't get any stats or points
                    continue;
                }

                const wins = p.result === 'win' ? 1 : 0;
                const losses = p.result === 'loss' ? 1 : 0;
                const draws = p.result === 'draw' ? 1 : 0;

                // Calculate points based on league settings
                let points = 0;
                if (p.result === 'win') {
                    points = league.points_per_win || 4;
                } else if (p.result === 'loss') {
                    points = league.points_per_loss || 1;
                } else if (p.result === 'draw') {
                    points = league.points_per_draw || 1;
                }

                // Update user stats
                await db('users')
                    .where({ id: p.player_id })
                    .increment({
                        wins: wins,
                        losses: losses,
                        draws: draws
                    });

                // Update league stats
                await db('user_leagues')
                    .where({ user_id: p.player_id, league_id: pod.league_id })
                    .increment({
                        league_wins: wins,
                        league_losses: losses,
                        league_draws: draws,
                        total_points: points
                    });
            }

            // Update the pod's status to 'complete'
            await db('game_pods')
                .where({ id: podId })
                .update({
                    confirmation_status: 'complete',
                    result: podResult,
                });

            // Emit game completed event
            emitGameConfirmed(req.app, pod.league_id, podId, playerId, true);

            return res.status(200).json({ message: 'Game result logged successfully, stats updated, and pod marked as complete.' });
        } else {
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
        console.error('Error logging pod result:', err.message);
        res.status(500).json({ error: 'Failed to log pod result.' });
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

        // Fetch participants for each pod
        const podsWithParticipants = await Promise.all(
            pods.map(async (pod) => {
                const participants = await db('game_players as gp')
                    .join('users as u', 'gp.player_id', 'u.id')
                    .select(
                        'u.id as player_id',
                        'u.firstname',
                        'u.lastname',
                        'u.email',
                        'gp.result',
                        'gp.confirmed'
                    )
                    .where('gp.pod_id', pod.id);

                return { ...pod, participants };
            })
        );

        // If a specific podId was requested, return only that pod
        if (podId) {
            return res.status(200).json(podsWithParticipants[0] || null);
        }

        res.status(200).json(podsWithParticipants);
    } catch (err) {
        console.error('Error fetching pods:', err.message);
        res.status(500).json({ error: 'Failed to fetch pods.' });
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

        res.status(200).json({ message: 'Pod successfully overridden to active.' });
    } catch (err) {
        console.error('Error overriding pod:', err.message);
        res.status(500).json({ error: 'Failed to override pod.' });
    }
};

module.exports = {
    createPod,
    getPods,
    joinPod,
    logPodResult,
    overridePod,
};
