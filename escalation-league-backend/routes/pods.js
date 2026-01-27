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
const { gameLimiter } = require('../middlewares/rateLimitMiddleware');
const requireDiscord = require('../middlewares/requireDiscord');

// Pod Management Endpoints
router.post(
    '/',
    gameLimiter, // Apply game-specific rate limiting
    authenticateToken,
    authorizePermission(['pod_create']), // Permission to create a pod
    requireDiscord('discord_required_for_game_creation'), // Optional Discord requirement
    createPod
);

router.get(
    '/',
    gameLimiter, // Apply game-specific rate limiting
    authenticateToken,
    authorizePermission(['pod_read']), // Permission to fetch pods with filtering
    getPods
);

router.post(
    '/:podId/join',
    gameLimiter, // Apply game-specific rate limiting
    authenticateToken,
    joinPod
);

router.post(
    '/:podId/log',
    gameLimiter, // Apply game-specific rate limiting
    authenticateToken,
    logPodResult
);


router.post(
    '/:podId/override',
    gameLimiter, // Apply game-specific rate limiting
    authenticateToken,
    overridePod
);

module.exports = router;