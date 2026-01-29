const db = require('../models/db');
const podService = require('../services/podService');
const logger = require('../utils/logger');
const { emitPodDeleted } = require('../utils/socketEmitter');
const { cacheInvalidators } = require('../middlewares/cacheMiddleware');
const {
    logPodUpdated,
    logPodDeleted,
    logParticipantRemoved,
    logParticipantAdded,
    logParticipantResultUpdated,
    logPlayerDQToggled,
    logAdminSetWinner
} = require('../services/activityLogService');
const { handleError, notFound, badRequest } = require('../utils/errorUtils');


// Update a Pod
const updatePod = async (req, res) => {
    const { podId } = req.params;
    const { participants, result, confirmation_status } = req.body;

    logger.debug('updatePod called', { podId, confirmation_status, hasParticipants: !!participants });

    try {
        // Get current pod state and participants for stats reversal
        const currentPod = await podService.getById(podId);
        const currentParticipants = await podService.getParticipants(podId);

        logger.debug('Current pod state', {
            podId,
            currentStatus: currentPod?.confirmation_status,
            currentResult: currentPod?.result
        });

        // If pod was complete, reverse old stats before making changes
        if (currentPod.confirmation_status === 'complete' && currentPod.league_id) {
            await podService.reverseGameStats(currentParticipants, currentPod.league_id, currentPod.is_tournament_game);
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
        const newParticipants = await podService.getParticipants(podId);

        logger.debug('Stats condition check', {
            podId,
            requestedStatus: confirmation_status,
            wasComplete: currentPod.confirmation_status === 'complete'
        });

        // If pod is now complete, apply new stats
        // ONLY apply stats if we're explicitly completing the pod OR if it was already complete
        if (confirmation_status === 'complete' || currentPod.confirmation_status === 'complete') {
            logger.debug('Applying stats for complete pod', { podId });
            const pod = await podService.getById(podId);

            if (pod && pod.league_id) {
                // Apply game stats using podService (handles tournament stats internally)
                await podService.applyGameStats(newParticipants, pod.league_id, pod.is_tournament_game);

                // Apply ELO changes using podService
                await podService.applyEloChanges(newParticipants, podId, pod.league_id);
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
        handleError(res, err, 'Failed to update pod');
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
        handleError(res, err, 'Failed to remove participant');
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
        handleError(res, err, 'Failed to add participant');
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
        handleError(res, err, 'Failed to update participant result');
    }
};

// Delete a Pod
const deletePod = async (req, res) => {
    const { podId } = req.params;

    try {
        // Get current pod state and participants for stats reversal
        const currentPod = await podService.getById(podId);
        const currentParticipants = await podService.getParticipants(podId);

        // If pod was complete, reverse stats before deleting
        if (currentPod && currentPod.confirmation_status === 'complete' && currentPod.league_id) {
            logger.info('Reversing stats for pod deletion', {
                podId,
                participantCount: currentParticipants.length
            });

            await podService.reverseGameStats(currentParticipants, currentPod.league_id);
        }

        // Soft delete all participants from the pod
        await db('game_players').where({ pod_id: podId }).update({ deleted_at: db.fn.now() });

        // Soft delete the pod
        await db('game_pods').where({ id: podId }).update({ deleted_at: db.fn.now() });

        // Emit WebSocket event for real-time UI update
        if (currentPod && currentPod.league_id) {
            emitPodDeleted(req.app, currentPod.league_id, podId);
        }

        // Invalidate cache if the deleted pod was complete
        if (currentPod && currentPod.confirmation_status === 'complete' && currentPod.league_id) {
            await cacheInvalidators.gameCompleted(currentPod.league_id);
        }

        // Log the admin action
        await logPodDeleted(req.user.id, podId);

        res.status(200).json({ message: 'Pod deleted successfully.' });
    } catch (err) {
        handleError(res, err, 'Failed to delete pod');
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
            await podService.handleDqToggle(playerId, pod.league_id, newResult === 'disqualified', participant.result);
            await cacheInvalidators.gameCompleted(pod.league_id);
        }

        // Log the admin action
        await logPlayerDQToggled(req.user.id, podId, playerId, newResult === 'disqualified');

        res.status(200).json({
            message: `Player ${newResult === 'disqualified' ? 'disqualified' : 'reinstated'} successfully.`,
            result: newResult
        });
    } catch (err) {
        handleError(res, err, 'Failed to toggle DQ status');
    }
};

/**
 * Admin Set Winner - Sets a winner for an active/pending pod and completes it
 * This handles the full workflow:
 * 1. Sets the winner's result to 'win', confirmed=1, confirmation_time
 * 2. Sets all other players to 'loss', confirmed=1, confirmation_time
 * 3. Updates pod status to 'complete' with result='win'
 * 4. Applies game stats (wins/losses) to users and user_leagues
 * 5. Calculates and applies ELO changes
 */
const setWinner = async (req, res) => {
    const { podId } = req.params;
    const { winnerId } = req.body;

    if (!winnerId) {
        return res.status(400).json({ error: 'Winner ID is required.' });
    }

    logger.info('Admin setWinner called', { podId, winnerId, adminId: req.user.id });

    try {
        // Get pod and validate it exists
        const pod = await podService.getById(podId);
        if (!pod) {
            return res.status(404).json({ error: 'Pod not found.' });
        }

        // Only allow setting winner on active or pending pods
        if (pod.confirmation_status === 'complete') {
            return res.status(400).json({ error: 'Pod is already complete. Use updatePod to modify a completed pod.' });
        }

        if (pod.confirmation_status === 'open') {
            return res.status(400).json({ error: 'Pod is still open. Wait for more players to join or override to active first.' });
        }

        // Get current participants
        const participants = await podService.getParticipants(podId);
        if (participants.length < 2) {
            return res.status(400).json({ error: 'Pod must have at least 2 participants.' });
        }

        // Verify winner is a participant
        const winnerParticipant = participants.find(p => p.player_id === parseInt(winnerId));
        if (!winnerParticipant) {
            return res.status(400).json({ error: 'Winner must be a participant in this pod.' });
        }

        // If pod was already pending (had stats partially applied), we need to reverse first
        // This handles the case where someone declared a win but the pod wasn't completed
        if (pod.confirmation_status === 'pending' && pod.league_id) {
            // Check if any stats were applied (participants have results set)
            const hasResults = participants.some(p => p.result !== null);
            if (hasResults) {
                logger.debug('Reversing partial stats from pending pod', { podId });
                // Note: In pending state, stats shouldn't have been applied yet
                // (stats are only applied when ALL players confirm and pod becomes complete)
                // So we don't need to reverse here
            }
        }

        const now = db.fn.now();

        // Update winner: result='win', confirmed=1, confirmation_time=now
        await db('game_players')
            .where({ pod_id: podId, player_id: winnerId })
            .whereNull('deleted_at')
            .update({
                result: 'win',
                confirmed: 1,
                confirmation_time: now
            });

        // Update all other players: result='loss', confirmed=1, confirmation_time=now
        await db('game_players')
            .where({ pod_id: podId })
            .whereNot({ player_id: winnerId })
            .whereNull('deleted_at')
            .update({
                result: 'loss',
                confirmed: 1,
                confirmation_time: now
            });

        // Update pod status to complete with result='win'
        await db('game_pods')
            .where({ id: podId })
            .update({
                confirmation_status: 'complete',
                result: 'win'
            });

        // Fetch updated participants for stats application
        const updatedParticipants = await podService.getParticipants(podId);

        // Apply game stats if pod has a league
        if (pod.league_id) {
            // Apply stats (wins/losses to users and user_leagues)
            await podService.applyGameStats(updatedParticipants, pod.league_id);

            // Apply ELO changes
            await podService.applyEloChanges(updatedParticipants, podId, pod.league_id);

            // Invalidate caches
            await cacheInvalidators.gameCompleted(pod.league_id);
        }

        // Log the admin action
        await logAdminSetWinner(req.user.id, podId, winnerId);

        // Fetch the complete pod with participants for response
        const completedPod = await db('game_pods').where({ id: podId }).first();
        const participantsWithDetails = await podService.getParticipantsWithUsers(podId);

        logger.info('Admin setWinner completed', {
            podId,
            winnerId,
            adminId: req.user.id,
            leagueId: pod.league_id
        });

        res.status(200).json({
            message: 'Winner set and pod completed successfully.',
            pod: {
                ...completedPod,
                participants: participantsWithDetails
            }
        });
    } catch (err) {
        handleError(res, err, 'Failed to set winner');
    }
};

/**
 * Admin Declare Winner - Sets winner/losers and moves pod from active to pending
 * Does NOT apply stats - waits for confirmations or admin force complete
 *
 * Flow: active → pending
 *
 * 1. Sets the winner's result to 'win' (not confirmed - waiting for others)
 * 2. Sets all other players to 'loss' (not confirmed)
 * 3. Updates pod status to 'pending' with result='win'
 */
const declareWinner = async (req, res) => {
    const { podId } = req.params;
    const { winnerId } = req.body;

    if (!winnerId) {
        return res.status(400).json({ error: 'Winner ID is required.' });
    }

    logger.info('Admin declareWinner called', { podId, winnerId, adminId: req.user.id });

    try {
        // Get pod and validate it exists
        const pod = await podService.getById(podId);
        if (!pod) {
            return res.status(404).json({ error: 'Pod not found.' });
        }

        // Only allow declaring winner on active pods
        if (pod.confirmation_status !== 'active') {
            if (pod.confirmation_status === 'pending') {
                return res.status(400).json({ error: 'Pod is already pending. Use "Force Complete" to finish it.' });
            }
            if (pod.confirmation_status === 'complete') {
                return res.status(400).json({ error: 'Pod is already complete.' });
            }
            return res.status(400).json({ error: 'Pod must be active to declare a winner.' });
        }

        // Get current participants
        const participants = await podService.getParticipants(podId);
        if (participants.length < 2) {
            return res.status(400).json({ error: 'Pod must have at least 2 participants.' });
        }

        // Verify winner is a participant
        const winnerParticipant = participants.find(p => p.player_id === parseInt(winnerId));
        if (!winnerParticipant) {
            return res.status(400).json({ error: 'Winner must be a participant in this pod.' });
        }

        // Update winner: result='win' (NOT confirmed yet)
        await db('game_players')
            .where({ pod_id: podId, player_id: winnerId })
            .whereNull('deleted_at')
            .update({
                result: 'win',
                confirmed: 0
            });

        // Update all other players: result='loss' (NOT confirmed yet)
        await db('game_players')
            .where({ pod_id: podId })
            .whereNot({ player_id: winnerId })
            .whereNull('deleted_at')
            .update({
                result: 'loss',
                confirmed: 0
            });

        // Update pod status to pending with result='win'
        await db('game_pods')
            .where({ id: podId })
            .update({
                confirmation_status: 'pending',
                result: 'win'
            });

        // Log the admin action
        await logPodUpdated(req.user.id, podId, { action: 'declare_winner', winnerId });

        // Fetch the updated pod with participants for response
        const updatedPod = await db('game_pods').where({ id: podId }).first();
        const participantsWithDetails = await podService.getParticipantsWithUsers(podId);

        logger.info('Admin declareWinner completed - pod moved to pending', {
            podId,
            winnerId,
            adminId: req.user.id
        });

        res.status(200).json({
            message: 'Winner declared. Pod is now pending confirmation.',
            pod: {
                ...updatedPod,
                participants: participantsWithDetails
            }
        });
    } catch (err) {
        handleError(res, err, 'Failed to declare winner');
    }
};

/**
 * Admin Force Complete - Moves a pending pod to complete, applying stats
 *
 * Flow: pending → complete
 *
 * 1. Sets all participants to confirmed=1
 * 2. Updates pod status to 'complete'
 * 3. Applies game stats (wins/losses)
 * 4. Applies ELO changes
 */
const forceComplete = async (req, res) => {
    const { podId } = req.params;

    logger.info('Admin forceComplete called', { podId, adminId: req.user.id });

    try {
        // Get pod and validate it exists
        const pod = await podService.getById(podId);
        if (!pod) {
            return res.status(404).json({ error: 'Pod not found.' });
        }

        // Only allow force complete on pending pods
        if (pod.confirmation_status !== 'pending') {
            if (pod.confirmation_status === 'complete') {
                return res.status(400).json({ error: 'Pod is already complete.' });
            }
            if (pod.confirmation_status === 'active') {
                return res.status(400).json({ error: 'Pod is still active. Declare a winner first to move it to pending.' });
            }
            return res.status(400).json({ error: 'Pod must be pending to force complete.' });
        }

        const now = db.fn.now();

        // Set all participants to confirmed
        await db('game_players')
            .where({ pod_id: podId })
            .whereNull('deleted_at')
            .update({
                confirmed: 1,
                confirmation_time: now
            });

        // Update pod status to complete
        await db('game_pods')
            .where({ id: podId })
            .update({
                confirmation_status: 'complete'
            });

        // Fetch updated participants for stats application
        const updatedParticipants = await podService.getParticipants(podId);

        // Apply game stats if pod has a league
        if (pod.league_id) {
            await podService.applyGameStats(updatedParticipants, pod.league_id);
            await podService.applyEloChanges(updatedParticipants, podId, pod.league_id);
            await cacheInvalidators.gameCompleted(pod.league_id);
        }

        // Log the admin action
        await logPodUpdated(req.user.id, podId, { action: 'force_complete' });

        // Fetch the complete pod with participants for response
        const completedPod = await db('game_pods').where({ id: podId }).first();
        const participantsWithDetails = await podService.getParticipantsWithUsers(podId);

        logger.info('Admin forceComplete completed', {
            podId,
            adminId: req.user.id,
            leagueId: pod.league_id
        });

        res.status(200).json({
            message: 'Pod completed successfully. Stats have been applied.',
            pod: {
                ...completedPod,
                participants: participantsWithDetails
            }
        });
    } catch (err) {
        handleError(res, err, 'Failed to force complete pod');
    }
};

module.exports = {
    updatePod,
    removeParticipant,
    addParticipant,
    updateParticipantResult,
    toggleDQ,
    deletePod,
    setWinner,
    declareWinner,
    forceComplete,
};