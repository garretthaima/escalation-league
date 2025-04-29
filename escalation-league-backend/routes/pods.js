const express = require('express');
const router = express.Router();
const {
    createPod,
    joinPod,
    logPodResult,
    getInProgressPods, // Renamed from getActivePods
    getCompletedPods, // Renamed from getCompletedPods
    getPodDetails,
    getPodParticipants,
    deletePod,
    getCompletedGames,
    getPendingPods, // Renamed from getPodsWaitingConfirmation
    getOpenPods, // New endpoint to fetch open pods
} = require('../controllers/podsController');
const authenticateToken = require('../middlewares/authentication');
const authorizeRole = require('../middlewares/authorizeRole');

// Pod Management Endpoints
router.post('/', authenticateToken, createPod); // Create a pod
router.get('/open', authenticateToken, getOpenPods); // Fetch open pods
router.get('/completed-games', authenticateToken, getCompletedGames); // Fetch completed games
router.get('/pending', authenticateToken, getPendingPods); // Fetch pods waiting for confirmation
router.get('/in-progress', authenticateToken, getInProgressPods); // Fetch in-progress pods
router.get('/completed-pods', authenticateToken, getCompletedPods); // Fetch completed pods
router.post('/:podId/join', authenticateToken, joinPod); // Join a pod
router.post('/:podId/log', authenticateToken, logPodResult); // Log pod result
router.get('/:podId', authenticateToken, getPodDetails); // Fetch pod details
router.get('/:podId/participants', authenticateToken, getPodParticipants); // Fetch participants for a pod
router.delete('/:podId', authenticateToken, authorizeRole(['league_admin', 'admin']), deletePod); // Delete a pod

module.exports = router;