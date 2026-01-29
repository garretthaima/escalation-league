const express = require('express');
const router = express.Router();
const {
    updatePod,
    removeParticipant,
    addParticipant,
    updateParticipantResult,
    toggleDQ,
    deletePod,
    setWinner,
    declareWinner,
    forceComplete
} = require('../controllers/podsAdminController');
const authenticateToken = require('../middlewares/authentication');
const authorizePermission = require('../middlewares/authorizePermission');

// Update a pod
router.put(
    '/:podId',
    authenticateToken,
    authorizePermission(['admin_pod_update']),
    updatePod
);

// Remove a participant
router.delete(
    '/:podId/participants/:playerId',
    authenticateToken,
    authorizePermission(['admin_pod_update']),
    removeParticipant
);

// Add a participant
router.post(
    '/:podId/participants',
    authenticateToken,
    authorizePermission(['admin_pod_update']),
    addParticipant
);

// Update a participant's result
router.put(
    '/:podId/participants/:playerId',
    authenticateToken,
    authorizePermission(['admin_pod_update']),
    updateParticipantResult
);

// Toggle DQ status for a participant
router.patch(
    '/:podId/participants/:playerId/dq',
    authenticateToken,
    authorizePermission(['admin_pod_update']),
    toggleDQ
);

// Delete a pod
router.delete(
    '/:podId',
    authenticateToken,
    authorizePermission(['admin_pod_delete']),
    deletePod
);

// Set winner and complete a pod (for active/pending pods) - skips pending state
router.post(
    '/:podId/set-winner',
    authenticateToken,
    authorizePermission(['admin_pod_update']),
    setWinner
);

// Declare winner and move to pending (active → pending)
router.post(
    '/:podId/declare-winner',
    authenticateToken,
    authorizePermission(['admin_pod_update']),
    declareWinner
);

// Force complete a pending pod (pending → complete)
router.post(
    '/:podId/force-complete',
    authenticateToken,
    authorizePermission(['admin_pod_update']),
    forceComplete
);

module.exports = router;