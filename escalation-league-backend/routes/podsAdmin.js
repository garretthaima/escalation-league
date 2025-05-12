const express = require('express');
const router = express.Router();
const {
    updatePod,
    removeParticipant,
    updateParticipantResult,
    deletePod
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

// Update a participant's result
router.put(
    '/:podId/participants/:playerId',
    authenticateToken,
    authorizePermission(['admin_pod_update']),
    updateParticipantResult
);

// Delete a pod
router.delete(
    '/:podId',
    authenticateToken,
    authorizePermission(['admin_pod_delete']),
    deletePod
);

module.exports = router;