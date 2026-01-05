const db = require('../models/db'); // Import the database connection
const gameService = require('../services/gameService');

// Create a Pod
const createPod = async (req, res) => {
    const { leagueId } = req.body;
    const creatorId = req.user.id;

    try {
        // Create the pod and get the inserted ID
        const [podId] = await db('game_pods').insert({
            league_id: leagueId,
            creator_id: creatorId,
            status: 'active',
        });

        // Add the creator as a participant in the pod
        await db('game_players').insert({
            pod_id: podId,
            player_id: creatorId,
        });

        // Fetch the created pod to return it in the response
        const pod = await db('game_pods').where({ id: podId }).first();

        res.status(201).json(pod);
    } catch (err) {
        console.error('Error creating pod:', err.message);
        res.status(500).json({ error: 'Failed to create pod.' });
    }
};

const joinPod = async (req, res) => {
    const { podId } = req.params;
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

        // Check if the pod now has enough participants to become active
        if (participantCount + 1 >= 4) {
            await db('game_pods').where({ id: podId }).update({ confirmation_status: 'active' });
        }

        res.status(200).json({ message: 'Joined pod successfully.' });
    } catch (err) {
        console.error('Error joining pod:', err.message);
        res.status(500).json({ error: 'Failed to join pod.' });
    }
};

const logPodResult = async (req, res) => {
    const { podId } = req.params;
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

        // Update the player's confirmation status and optionally their result
        const updateData = { confirmed: 1, confirmation_time: db.fn.now() };
        if (result !== undefined) {
            updateData.result = result;
        }

        await db('game_players')
            .where({ pod_id: podId, player_id: playerId })
            .update(updateData);

        // Check if all participants have confirmed
        const participants = await db('game_players').where({ pod_id: podId });
        const allConfirmed = participants.every((p) => p.confirmed === 1);

        if (allConfirmed) {
            // Determine the pod result
            const podResult = participants.some((p) => p.result === 'draw') ? 'draw' : 'win';

            // Get the league ID for this pod
            const pod = await db('game_pods').where({ id: podId }).select('league_id').first();

            if (!pod || !pod.league_id) {
                return res.status(404).json({ error: 'League not found for this pod.' });
            }

            // Update stats for all participants
            for (const p of participants) {
                const wins = p.result === 'win' ? 1 : 0;
                const losses = p.result === 'loss' ? 1 : 0;
                const draws = p.result === 'draw' ? 1 : 0;

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
                        league_draws: draws
                    });
            }

            // Update the pod's status to 'complete'
            await db('game_pods')
                .where({ id: podId })
                .update({
                    confirmation_status: 'complete',
                    result: podResult,
                });

            return res.status(200).json({ message: 'Game result logged successfully, stats updated, and pod marked as complete.' });
        } else {
            // Update the pod's confirmation status to 'pending'
            await db('game_pods')
                .where({ id: podId })
                .update({
                    confirmation_status: 'pending',
                    result: null,
                });

            return res.status(200).json({ message: 'Confirmation recorded. Waiting for other players.' });
        }
    } catch (err) {
        console.error('Error logging pod result:', err.message);
        res.status(500).json({ error: 'Failed to log pod result.' });
    }
};


const getPods = async (req, res) => {
    const { podId, status, confirmation_status, league_id } = req.query; // Optional filters

    try {
        const query = db('game_pods').where({ deleted_at: null });

        if (podId) {
            query.andWhere({ id: podId });
        }

        if (status) {
            query.andWhere({ status });
        }

        if (confirmation_status) {
            query.andWhere({ confirmation_status });
        }

        if (league_id) {
            query.andWhere({ league_id });
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
    const { podId } = req.params;

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
