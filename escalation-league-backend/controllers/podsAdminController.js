const db = require('../models/db');


// Update a Pod
const updatePod = async (req, res) => {
    const { podId } = req.params;
    const { participants, result, confirmation_status } = req.body;

    try {
        // Update the pod's result and/or confirmation_status
        const podUpdates = {};
        if (result) podUpdates.result = result;
        if (confirmation_status) podUpdates.confirmation_status = confirmation_status;

        await db('game_pods').where({ id: podId }).update(podUpdates);

        // Handle "Override to Complete" logic
        if (confirmation_status === 'complete') {
            await db('game_players')
                .where({ pod_id: podId })
                .update({
                    result: db.raw('COALESCE(result, "loss")'), // Set result to "loss" if null
                    confirmed: db.raw('GREATEST(confirmed, 1)'), // Set confirmed to 1 if 0
                });
        }

        // Update participants if provided
        if (participants) {
            await db('game_players').where({ pod_id: podId }).del();
            const participantInserts = participants.map((participant) => ({
                pod_id: podId,
                player_id: participant.player_id,
                result: participant.result || null,
                confirmed: participant.confirmed || 0,
            }));
            await db('game_players').insert(participantInserts);
        }

        // Fetch the updated pod with participants
        const updatedPod = await db('game_pods')
            .where({ id: podId })
            .first()
            .select('*')
            .then(async (pod) => {
                if (pod) {
                    const participants = await db('game_players')
                        .where({ pod_id: podId })
                        .select('player_id', 'result', 'confirmed');
                    return { ...pod, participants };
                }
                return null;
            });

        if (!updatedPod) {
            return res.status(404).json({ error: 'Pod not found.' });
        }

        res.status(200).json(updatedPod);
    } catch (err) {
        console.error('Error updating pod:', err.message);
        res.status(500).json({ error: 'Failed to update pod.' });
    }
};

const removeParticipant = async (req, res) => {
    const { podId, playerId } = req.params;

    try {
        const participant = await db('game_players')
            .where({ pod_id: podId, player_id: playerId })
            .first();

        if (!participant) {
            return res.status(404).json({ error: 'Participant not found in the pod.' });
        }

        // Remove the participant from the pod
        await db('game_players').where({ pod_id: podId, player_id: playerId }).del();

        res.status(200).json({ message: 'Participant removed successfully.' });
    } catch (err) {
        console.error('Error removing participant:', err.message);
        res.status(500).json({ error: 'Failed to remove participant.' });
    }
};

// Update Participant Result
const updateParticipantResult = async (req, res) => {
    const { podId, playerId } = req.params;
    const { result } = req.body;

    try {
        const participant = await db('game_players')
            .where({ pod_id: podId, player_id: playerId })
            .first();

        if (!participant) {
            return res.status(404).json({ error: 'Participant not found in the pod.' });
        }

        // Update the participant's result
        await db('game_players').where({ pod_id: podId, player_id: playerId }).update({ result });

        res.status(200).json({ message: 'Participant result updated successfully.' });
    } catch (err) {
        console.error('Error updating participant result:', err.message);
        res.status(500).json({ error: 'Failed to update participant result.' });
    }
};

// Delete a Pod
const deletePod = async (req, res) => {
    const { podId } = req.params;

    try {
        // Remove all participants from the pod
        await db('game_players').where({ pod_id: podId }).del();

        // Soft delete the pod
        await db('game_pods').where({ id: podId }).update({ deleted_at: db.fn.now() });

        res.status(200).json({ message: 'Pod deleted successfully.' });
    } catch (err) {
        console.error('Error deleting pod:', err.message);
        res.status(500).json({ error: 'Failed to delete pod.' });
    }
};

module.exports = {
    updatePod,
    removeParticipant,
    updateParticipantResult,
    deletePod,
};