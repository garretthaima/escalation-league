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
    const { result } = req.body || {}; // Default to an empty object if req.body is undefined
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
            updateData.result = result; // Only update result if it's provided
        }

        await db('game_players')
            .where({ pod_id: podId, player_id: playerId })
            .update(updateData);

        // Check if all participants have confirmed
        const participants = await db('game_players').where({ pod_id: podId });
        const allConfirmed = participants.every((p) => p.confirmed === 1);

        if (allConfirmed) {
            // Determine the pod result (e.g., 'win' or 'draw')
            const podResult = participants.some((p) => p.result === 'draw') ? 'draw' : 'win';

            // Update the pod's status to 'complete' and set the result
            await db('game_pods')
                .where({ id: podId })
                .update({
                    confirmation_status: 'complete',
                    result: podResult,
                });

            // Create a game entry for the completed pod
            await db('games').insert({
                pod_id: podId,
                creator_id: participants[0].player_id, // Use the first player as the creator
                result: podResult,
                date: db.fn.now(),
                win_condition: 'All players confirmed', // Example win condition
                league_id: participants[0].league_id,
            });

            return res.status(200).json({ message: 'Game result logged successfully and pod marked as complete.' });
        } else {
            // Update the pod's confirmation status to 'pending'
            await db('game_pods')
                .where({ id: podId })
                .update({
                    confirmation_status: 'pending',
                    result: null, // Ensure no result is set for pending pods
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


module.exports = {
    createPod,
    getPods,
    joinPod,
    logPodResult,
};
