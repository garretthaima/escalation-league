const express = require('express');
const router = express.Router();
const {
    createPod,
    joinPod,
    logPodResult,
    getInProgressPods,
    getCompletedPods,
    getPodDetails,
    getPodParticipants,
    deletePod,
    getCompletedGames,
    getPendingPods,
    getOpenPods,
} = require('../controllers/podsController');
const authenticateToken = require('../middlewares/authentication');
const authorizePermission = require('../middlewares/authorizePermission');

// Pod Management Endpoints
router.post(
    '/',
    authenticateToken,
    authorizePermission(['pod_create']), // Permission to create a pod
    createPod
);
router.get(
    '/open',
    authenticateToken,
    authorizePermission(['pod_read']), // Permission to fetch open pods
    getOpenPods
);
router.get(
    '/completed-games',
    authenticateToken,
    authorizePermission(['pod_read']), // Permission to fetch completed games
    getCompletedGames
);
router.get(
    '/pending',
    authenticateToken,
    authorizePermission(['pod_read']), // Permission to fetch pods waiting for confirmation
    getPendingPods
);
router.get(
    '/in-progress',
    authenticateToken,
    authorizePermission(['pod_read']), // Permission to fetch in-progress pods
    getInProgressPods
);
router.get(
    '/completed-pods',
    authenticateToken,
    authorizePermission(['pod_read']), // Permission to fetch completed pods
    getCompletedPods
);
router.post(
    '/:podId/join',
    authenticateToken,
    authorizePermission(['pod_update']), // Permission to join a pod
    joinPod
);
router.post(
    '/:podId/log',
    authenticateToken,
    authorizePermission(['pod_update']), // Permission to log pod results
    logPodResult
);
router.get(
    '/:podId',
    authenticateToken,
    authorizePermission(['pod_read']), // Permission to fetch pod details
    getPodDetails
);
router.get(
    '/:podId/participants',
    authenticateToken,
    authorizePermission(['pod_read']), // Permission to fetch pod participants
    getPodParticipants
);
router.delete(
    '/:podId',
    authenticateToken,
    authorizePermission(['pod_delete']), // Permission to delete a pod
    deletePod
);

module.exports = router;