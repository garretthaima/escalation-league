const db = require('../db'); // Replace with your Knex instance

// Create a Pod
const createPod = async (req, res) => {
    const { leagueId } = req.body;
    const creatorId = req.user.id; // Assuming `req.user` contains the authenticated user's info

    try {
        const [pod] = await db('game_pods').insert({
            league_id: leagueId,
            creator_id: creatorId,
            status: 'active'
        }).returning('*');

        res.status(201).json(pod);
    } catch (err) {
        console.error('Error creating pod:', err.message);
        res.status(500).json({ error: 'Failed to create pod.' });
    }
};

// Join a Pod
const joinPod = async (req, res) => {
    const { podId } = req.params;
    const playerId = req.user.id;

    try {
        await db('game_players').insert({
            pod_id: podId,
            player_id: playerId
        });

        res.status(200).json({ message: 'Joined pod successfully.' });
    } catch (err) {
        console.error('Error joining pod:', err.message);
        res.status(500).json({ error: 'Failed to join pod.' });
    }
};

// Log Pod Result
const logPodResult = async (req, res) => {
    const { podId } = req.params;
    const { result } = req.body; // `result` is the player_id of the winner or null for a draw

    try {
        // Fetch the pod to ensure it exists and is active
        const pod = await db('game_pods').where({ id: podId, status: 'active' }).first();
        if (!pod) {
            return res.status(404).json({ error: 'Pod not found or already completed.' });
        }

        // Insert the game result
        await db('games').insert({
            league_id: pod.league_id,
            creator_id: pod.creator_id,
            result
        });

        // Mark the pod as completed
        await db('game_pods').where({ id: podId }).update({ status: 'completed' });

        res.status(200).json({ message: 'Game result logged successfully.' });
    } catch (err) {
        console.error('Error logging pod result:', err.message);
        res.status(500).json({ error: 'Failed to log pod result.' });
    }
};

module.exports = {
    createPod,
    joinPod,
    logPodResult
};