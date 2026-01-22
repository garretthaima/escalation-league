const db = require('../models/db');
const { emitPodDeleted } = require('../utils/socketEmitter');
const { cacheInvalidators } = require('../middlewares/cacheMiddleware');
const {
    logPodUpdated,
    logPodDeleted,
    logParticipantRemoved,
    logParticipantAdded,
    logParticipantResultUpdated,
    logPlayerDQToggled
} = require('../services/activityLogService');


// Update a Pod
const updatePod = async (req, res) => {
    const { podId } = req.params;
    const { participants, result, confirmation_status } = req.body;

    console.log('=== updatePod called ===');
    console.log('podId:', podId);
    console.log('Request body:', JSON.stringify(req.body, null, 2));
    console.log('confirmation_status from request:', confirmation_status);

    try {
        // Get current pod state and participants for stats reversal
        const currentPod = await db('game_pods').where({ id: podId }).first();
        const currentParticipants = await db('game_players').where({ pod_id: podId }).whereNull('deleted_at');

        console.log('Current pod status:', currentPod.confirmation_status);
        console.log('Current pod result:', currentPod.result);

        // If pod was complete, reverse old stats before making changes
        if (currentPod.confirmation_status === 'complete' && currentPod.league_id) {
            // Fetch league point settings (including tournament settings)
            const league = await db('leagues')
                .where({ id: currentPod.league_id })
                .select('points_per_win', 'points_per_loss', 'points_per_draw',
                    'tournament_win_points', 'tournament_non_win_points', 'tournament_dq_points')
                .first();

            for (const p of currentParticipants) {
                // Skip DQ'd players - they never got regular stats in the first place
                if (p.result === 'disqualified') {
                    // But if tournament game, DQ'd players DID get tournament stats
                    if (currentPod.is_tournament_game) {
                        await db('user_leagues')
                            .where({ user_id: p.player_id, league_id: currentPod.league_id })
                            .increment({
                                tournament_points: -(league.tournament_dq_points || 0),
                                tournament_dqs: -1
                            });
                    }
                    continue;
                }

                const wins = p.result === 'win' ? -1 : 0;
                const losses = p.result === 'loss' ? -1 : 0;
                const draws = p.result === 'draw' ? -1 : 0;

                // Calculate points to reverse
                let points = 0;
                if (p.result === 'win') {
                    points = -(league.points_per_win || 4);
                } else if (p.result === 'loss') {
                    points = -(league.points_per_loss || 1);
                } else if (p.result === 'draw') {
                    points = -(league.points_per_draw || 1);
                }

                // Reverse user stats
                await db('users')
                    .where({ id: p.player_id })
                    .increment({
                        wins: wins,
                        losses: losses,
                        draws: draws
                    });

                // Reverse league stats
                await db('user_leagues')
                    .where({ user_id: p.player_id, league_id: currentPod.league_id })
                    .increment({
                        league_wins: wins,
                        league_losses: losses,
                        league_draws: draws,
                        total_points: points
                    });

                // Reverse tournament stats if this was a tournament game
                if (currentPod.is_tournament_game) {
                    let tPoints = 0;
                    let tWins = 0;
                    let tNonWins = 0;

                    if (p.result === 'win') {
                        tPoints = -(league.tournament_win_points || 4);
                        tWins = -1;
                    } else {
                        tPoints = -(league.tournament_non_win_points || 1);
                        tNonWins = -1;
                    }

                    await db('user_leagues')
                        .where({ user_id: p.player_id, league_id: currentPod.league_id })
                        .increment({
                            tournament_points: tPoints,
                            tournament_wins: tWins,
                            tournament_non_wins: tNonWins
                        });
                }
            }
        }

        // Update participants FIRST if provided (before updating pod status)
        if (participants) {
            await db('game_players').where({ pod_id: podId }).del();
            const participantInserts = participants.map((participant, index) => ({
                pod_id: podId,
                player_id: participant.player_id,
                result: participant.result || null,
                confirmed: participant.confirmed || 0,
                turn_order: participant.turn_order || (index + 1),
            }));
            await db('game_players').insert(participantInserts);
        }

        // Handle "Override to Complete" logic ONLY if participants weren't provided
        // (meaning this is an override action, not an admin edit)
        if (confirmation_status === 'complete' && !participants) {
            await db('game_players')
                .where({ pod_id: podId })
                .update({
                    result: db.raw('COALESCE(result, "loss")'), // Set result to "loss" if null
                    confirmed: db.raw('GREATEST(confirmed, 1)'), // Set confirmed to 1 if 0
                });
        }

        // Update the pod's result and/or confirmation_status AFTER participants
        const podUpdates = {};
        if (result) podUpdates.result = result;
        if (confirmation_status) podUpdates.confirmation_status = confirmation_status;

        if (Object.keys(podUpdates).length > 0) {
            await db('game_pods').where({ id: podId }).update(podUpdates);
        }

        // Fetch updated participants for new stats
        const newParticipants = await db('game_players').where({ pod_id: podId }).whereNull('deleted_at');

        console.log('Checking stats condition:');
        console.log('  confirmation_status === "complete":', confirmation_status === 'complete');
        console.log('  currentPod.confirmation_status === "complete":', currentPod.confirmation_status === 'complete');

        // If pod is now complete, apply new stats
        // ONLY apply stats if we're explicitly completing the pod OR if it was already complete
        if (confirmation_status === 'complete' || currentPod.confirmation_status === 'complete') {
            console.log('>>> STATS BLOCK TRIGGERED <<<');
            const pod = await db('game_pods').where({ id: podId }).first();

            if (pod && pod.league_id) {
                // Fetch league point settings (including tournament settings)
                const league = await db('leagues')
                    .where({ id: pod.league_id })
                    .select('points_per_win', 'points_per_loss', 'points_per_draw',
                        'tournament_win_points', 'tournament_non_win_points', 'tournament_dq_points')
                    .first();

                for (const p of newParticipants) {
                    // Skip DQ'd players for regular stats - they don't get any stats or points
                    if (p.result === 'disqualified') {
                        // But if tournament game, DQ'd players DO get tournament stats
                        if (pod.is_tournament_game) {
                            await db('user_leagues')
                                .where({ user_id: p.player_id, league_id: pod.league_id })
                                .increment({
                                    tournament_points: league.tournament_dq_points || 0,
                                    tournament_dqs: 1
                                });
                        }
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

                    // Apply tournament stats if this is a tournament game
                    if (pod.is_tournament_game) {
                        let tPoints = 0;
                        let tWins = 0;
                        let tNonWins = 0;

                        if (p.result === 'win') {
                            tPoints = league.tournament_win_points || 4;
                            tWins = 1;
                        } else {
                            tPoints = league.tournament_non_win_points || 1;
                            tNonWins = 1;
                        }

                        await db('user_leagues')
                            .where({ user_id: p.player_id, league_id: pod.league_id })
                            .increment({
                                tournament_points: tPoints,
                                tournament_wins: tWins,
                                tournament_non_wins: tNonWins
                            });
                    }
                }
            }
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
                        .whereNull('deleted_at')
                        .select('player_id', 'result', 'confirmed', 'turn_order')
                        .orderBy('turn_order', 'asc');
                    return { ...pod, participants };
                }
                return null;
            });

        if (!updatedPod) {
            return res.status(404).json({ error: 'Pod not found.' });
        }

        // Invalidate cache if game was completed or stats were updated
        const wasComplete = currentPod.confirmation_status === 'complete';
        const isNowComplete = confirmation_status === 'complete';
        if ((isNowComplete || wasComplete) && updatedPod.league_id) {
            await cacheInvalidators.gameCompleted(updatedPod.league_id);
        }

        // Log the admin action
        const changes = {};
        if (participants) changes.participants = 'updated';
        if (result) changes.result = result;
        if (confirmation_status) changes.confirmation_status = confirmation_status;
        await logPodUpdated(req.user.id, podId, changes);

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
            .whereNull('deleted_at')
            .first();

        if (!participant) {
            return res.status(404).json({ error: 'Participant not found in the pod.' });
        }

        // Check if this player was the winner
        const wasWinner = participant.result === 'win';

        // Soft delete the participant from the pod
        await db('game_players')
            .where({ pod_id: podId, player_id: playerId })
            .update({ deleted_at: db.fn.now() });

        // If the removed player was the winner, reset the pod status and clear winner
        if (wasWinner) {
            const pod = await db('game_pods').where({ id: podId }).first();

            // If pod was in pending or complete status, reset it
            if (pod && (pod.confirmation_status === 'pending' || pod.confirmation_status === 'complete')) {
                await db('game_pods').where({ id: podId }).update({
                    confirmation_status: 'active',
                    result: null
                });
            }
        }

        // Log the admin action
        await logParticipantRemoved(req.user.id, podId, playerId, wasWinner);

        res.status(200).json({
            message: 'Participant removed successfully.',
            winnerRemoved: wasWinner
        });
    } catch (err) {
        console.error('Error removing participant:', err.message);
        res.status(500).json({ error: 'Failed to remove participant.' });
    }
};

// Add Participant to Pod
const addParticipant = async (req, res) => {
    const { podId } = req.params;
    const { playerId } = req.body;

    if (!playerId) {
        return res.status(400).json({ error: 'Player ID is required.' });
    }

    try {
        // Check if pod exists
        const pod = await db('game_pods').where({ id: podId }).first();
        if (!pod) {
            return res.status(404).json({ error: 'Pod not found.' });
        }

        // Check if pod is already complete
        if (pod.confirmation_status === 'complete') {
            return res.status(400).json({ error: 'Cannot add participants to a completed pod.' });
        }

        // Check current participant count
        const currentParticipants = await db('game_players').where({ pod_id: podId }).whereNull('deleted_at');
        if (currentParticipants.length >= 4) {
            return res.status(400).json({ error: 'Pod is full. Maximum 4 players allowed.' });
        }

        // Check if player is already in the pod
        const existingParticipant = currentParticipants.find(p => p.player_id === parseInt(playerId));
        if (existingParticipant) {
            return res.status(400).json({ error: 'Player is already in this pod.' });
        }

        // Verify player exists and is in the league
        const player = await db('users').where({ id: playerId }).first();
        if (!player) {
            return res.status(404).json({ error: 'Player not found.' });
        }

        if (pod.league_id) {
            const userInLeague = await db('user_leagues')
                .where({ user_id: playerId, league_id: pod.league_id })
                .first();
            if (!userInLeague) {
                return res.status(400).json({ error: 'Player is not enrolled in this league.' });
            }
        }

        // Get max turn_order to assign next position
        const maxTurnOrder = await db('game_players')
            .where({ pod_id: podId })
            .whereNull('deleted_at')
            .max('turn_order as max')
            .first();
        const nextTurnOrder = (maxTurnOrder?.max || 0) + 1;

        // Add the participant with turn_order
        await db('game_players').insert({
            pod_id: podId,
            player_id: playerId,
            result: null,
            confirmed: 0,
            turn_order: nextTurnOrder
        });

        // If adding 4th player to an open pod, move to active
        if (currentParticipants.length === 3 && pod.confirmation_status === 'open') {
            await db('game_pods').where({ id: podId }).update({
                confirmation_status: 'active'
            });
        }

        // Log the admin action
        await logParticipantAdded(req.user.id, podId, playerId);

        res.status(200).json({
            message: 'Participant added successfully.',
            participantCount: currentParticipants.length + 1
        });
    } catch (err) {
        console.error('Error adding participant:', err.message);
        res.status(500).json({ error: 'Failed to add participant.' });
    }
};

// Update Participant Result
const updateParticipantResult = async (req, res) => {
    const { podId, playerId } = req.params;
    const { result } = req.body;

    try {
        const participant = await db('game_players')
            .where({ pod_id: podId, player_id: playerId })
            .whereNull('deleted_at')
            .first();

        if (!participant) {
            return res.status(404).json({ error: 'Participant not found in the pod.' });
        }

        // Update the participant's result
        await db('game_players').where({ pod_id: podId, player_id: playerId }).whereNull('deleted_at').update({ result });

        // Log the admin action
        await logParticipantResultUpdated(req.user.id, podId, playerId, result);

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
        // Get current pod state and participants for stats reversal
        const currentPod = await db('game_pods').where({ id: podId }).first();
        const currentParticipants = await db('game_players').where({ pod_id: podId }).whereNull('deleted_at');

        // If pod was complete, reverse stats before deleting
        if (currentPod && currentPod.confirmation_status === 'complete' && currentPod.league_id) {
            console.log('Reversing stats for pod deletion:', { podId, participants: currentParticipants.length });

            // Fetch league point settings for points reversal
            const league = await db('leagues')
                .where({ id: currentPod.league_id })
                .select('points_per_win', 'points_per_loss', 'points_per_draw')
                .first();

            for (const p of currentParticipants) {
                // Skip DQ'd players - they never got stats in the first place
                if (p.result === 'disqualified') {
                    continue;
                }

                const wins = p.result === 'win' ? -1 : 0;
                const losses = p.result === 'loss' ? -1 : 0;
                const draws = p.result === 'draw' ? -1 : 0;

                // Calculate points to reverse
                let points = 0;
                if (p.result === 'win') {
                    points = -(league.points_per_win || 4);
                } else if (p.result === 'loss') {
                    points = -(league.points_per_loss || 1);
                } else if (p.result === 'draw') {
                    points = -(league.points_per_draw || 1);
                }

                // Reverse user stats
                await db('users')
                    .where({ id: p.player_id })
                    .increment({
                        wins: wins,
                        losses: losses,
                        draws: draws
                    });

                // Reverse league stats (including points)
                await db('user_leagues')
                    .where({ user_id: p.player_id, league_id: currentPod.league_id })
                    .increment({
                        league_wins: wins,
                        league_losses: losses,
                        league_draws: draws,
                        total_points: points
                    });
            }
        }

        // Soft delete all participants from the pod
        await db('game_players').where({ pod_id: podId }).update({ deleted_at: db.fn.now() });

        // Soft delete the pod
        await db('game_pods').where({ id: podId }).update({ deleted_at: db.fn.now() });

        // Emit WebSocket event for real-time UI update
        if (currentPod && currentPod.league_id) {
            emitPodDeleted(req.app, currentPod.league_id, podId);
        }

        // Log the admin action
        await logPodDeleted(req.user.id, podId);

        res.status(200).json({ message: 'Pod deleted successfully.' });
    } catch (err) {
        console.error('Error deleting pod:', err.message);
        res.status(500).json({ error: 'Failed to delete pod.' });
    }
};

// Toggle DQ status for a player
const toggleDQ = async (req, res) => {
    const { podId, playerId } = req.params;

    try {
        // Check if pod exists
        const pod = await db('game_pods').where({ id: podId }).first();
        if (!pod) {
            return res.status(404).json({ error: 'Pod not found.' });
        }

        // Check if participant exists
        const participant = await db('game_players')
            .where({ pod_id: podId, player_id: playerId })
            .whereNull('deleted_at')
            .first();

        if (!participant) {
            return res.status(404).json({ error: 'Participant not found in this pod.' });
        }

        // Toggle between disqualified and loss
        // If currently disqualified, change to loss
        // If currently anything else, change to disqualified
        const newResult = participant.result === 'disqualified' ? 'loss' : 'disqualified';

        await db('game_players')
            .where({ pod_id: podId, player_id: playerId })
            .whereNull('deleted_at')
            .update({ result: newResult });

        // If pod is already complete, need to recalculate stats
        if (pod.confirmation_status === 'complete' && pod.league_id) {
            const league = await db('leagues')
                .where({ id: pod.league_id })
                .select('points_per_win', 'points_per_loss', 'points_per_draw')
                .first();

            if (newResult === 'disqualified') {
                // Player is now DQ'd - remove their stats (they had loss stats before)
                const lossPoints = league.points_per_loss || 1;

                await db('users')
                    .where({ id: playerId })
                    .increment({
                        losses: -1
                    });

                await db('user_leagues')
                    .where({ user_id: playerId, league_id: pod.league_id })
                    .increment({
                        league_losses: -1,
                        total_points: -lossPoints
                    });
            } else {
                // Player is no longer DQ'd - add loss stats back
                const lossPoints = league.points_per_loss || 1;

                await db('users')
                    .where({ id: playerId })
                    .increment({
                        losses: 1
                    });

                await db('user_leagues')
                    .where({ user_id: playerId, league_id: pod.league_id })
                    .increment({
                        league_losses: 1,
                        total_points: lossPoints
                    });
            }
        }

        // Log the admin action
        await logPlayerDQToggled(req.user.id, podId, playerId, newResult === 'disqualified');

        res.status(200).json({
            message: `Player ${newResult === 'disqualified' ? 'disqualified' : 'reinstated'} successfully.`,
            result: newResult
        });
    } catch (err) {
        console.error('Error toggling DQ status:', err.message);
        res.status(500).json({ error: 'Failed to toggle DQ status.' });
    }
};

module.exports = {
    updatePod,
    removeParticipant,
    addParticipant,
    updateParticipantResult,
    toggleDQ,
    deletePod,
};