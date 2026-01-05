const express = require('express');
const router = express.Router();
const {
    createPod,
    joinPod,
    logPodResult,
    getPods, // New consolidated endpoint
    overridePod,
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
    '/',
    authenticateToken,
    authorizePermission(['pod_read']), // Permission to fetch pods with filtering
    getPods
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


router.post(
    '/:podId/override',
    authenticateToken,
    authorizePermission(['pod_update']), // Permission to override pod
    overridePod
);

module.exports = router;