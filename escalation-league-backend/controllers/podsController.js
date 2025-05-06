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

// Fetch Participants for a Pod
const getPodParticipants = async (req, res) => {
    const { podId } = req.params;

    try {
        const participants = await gameService.getParticipants('pod', podId);
        res.status(200).json(participants);
    } catch (err) {
        console.error('Error fetching pod participants:', err.message);
        res.status(500).json({ error: 'Failed to fetch pod participants.' });
    }
};

// Delete a Pod
const deletePod = async (req, res) => {
    const { podId } = req.params;

    try {
        await gameService.deleteById('game_pods', podId);
        res.status(200).json({ message: 'Pod deleted successfully.' });
    } catch (err) {
        console.error('Error deleting pod:', err.message);
        res.status(500).json({ error: 'Failed to delete pod.' });
    }
};

const getCompletedGames = async (req, res) => {
    try {
        const games = await db('games').whereNotNull('result');

        if (games.length === 0) {
            return res.status(404).json({ error: 'No completed games found.' });
        }

        res.status(200).json(games);
    } catch (err) {
        console.error('Error fetching completed games:', err.message);
        res.status(500).json({ error: 'Failed to fetch completed games.' });
    }
};

const getPodDetails = async (req, res) => {
    const { podId } = req.params;

    try {
        const pod = await db('game_pods').where({ id: podId }).first();

        if (!pod) {
            return res.status(404).json({ error: 'Pod not found.' });
        }

        // Fetch participants from game_players
        const participants = await db('game_players as gp')
            .join('users as u', 'gp.player_id', 'u.id')
            .select('u.id as player_id', 'u.firstname', 'u.lastname', 'u.email')
            .where('gp.pod_id', podId);

        // Add the creator to the participants list if not already included
        const creator = await db('users')
            .select('id as player_id', 'firstname', 'lastname', 'email')
            .where('id', pod.creator_id)
            .first();

        const allParticipants = participants.some((p) => p.player_id === creator.player_id)
            ? participants
            : [creator, ...participants];

        res.status(200).json({ ...pod, participants: allParticipants });
    } catch (err) {
        console.error('Error fetching pod details:', err.message);
        res.status(500).json({ error: 'Failed to fetch pod details.' });
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


const getInProgressPods = async (req, res) => {
    const { leagueId } = req.query; // Optional filter by league

    try {
        const query = db('game_pods').where({ confirmation_status: 'active', deleted_at: null });

        if (leagueId) {
            query.andWhere({ league_id: leagueId });
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

        res.status(200).json(podsWithParticipants);
    } catch (err) {
        console.error('Error fetching in-progress pods:', err.message);
        res.status(500).json({ error: 'Failed to fetch in-progress pods.' });
    }
};

const getPendingPods = async (req, res) => {
    try {
        const pods = await db('game_pods')
            .where({ confirmation_status: 'pending', deleted_at: null })
            .select('id', 'league_id', 'creator_id', 'created_at', 'confirmation_status'); // Exclude result

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

        res.status(200).json(podsWithParticipants);
    } catch (err) {
        console.error('Error fetching pending pods:', err.message);
        res.status(500).json({ error: 'Failed to fetch pending pods.' });
    }
};

const getOpenPods = async (req, res) => {
    try {
        // Fetch pods with confirmation_status = 'open'
        const pods = await db('game_pods')
            .where({ confirmation_status: 'open', deleted_at: null });

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

        res.status(200).json(podsWithParticipants);
    } catch (err) {
        console.error('Error fetching open pods:', err.message);
        res.status(500).json({ error: 'Failed to fetch open pods.' });
    }
};

const getCompletedPods = async (req, res) => {
    try {
        // Fetch completed pods with their win_condition_id
        const pods = await db('game_pods')
            .where({ confirmation_status: 'complete', deleted_at: null })
            .select(
                'id',
                'league_id',
                'creator_id',
                'result',
                'created_at',
                'confirmation_status',
                'win_condition_id' // Include win_condition_id
            );

        const podsWithParticipantsAndWinCondition = await Promise.all(
            pods.map(async (pod) => {
                // Fetch participants for the pod
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

                // Fetch the win condition details if win_condition_id is present
                let winCondition = null;
                if (pod.win_condition_id) {
                    winCondition = await db('win_conditions')
                        .where({ id: pod.win_condition_id })
                        .select('id', 'name', 'description', 'category')
                        .first();
                }

                return { ...pod, participants, win_condition: winCondition };
            })
        );

        res.status(200).json(podsWithParticipantsAndWinCondition);
    } catch (err) {
        console.error('Error fetching completed pods:', err.message);
        res.status(500).json({ error: 'Failed to fetch completed pods.' });
    }
};

module.exports = {
    createPod,
    getPodParticipants,
    deletePod,
    getInProgressPods, // Renamed from getActivePods
    getCompletedGames,
    getPodDetails,
    joinPod,
    logPodResult,
    getCompletedPods, // Renamed from getCompletedPods
    getPendingPods, // Renamed from getPodsWaitingConfirmation
    getOpenPods
};
