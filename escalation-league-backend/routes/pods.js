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

/**
 * @openapi
 * /pods:
 *   post:
 *     summary: Create a new game pod
 *     tags: [Pods]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [leagueId]
 *             properties:
 *               leagueId:
 *                 type: integer
 *               sessionId:
 *                 type: integer
 *     responses:
 *       201:
 *         description: Pod created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Pod'
 *   get:
 *     summary: Get pods with optional filtering
 *     tags: [Pods]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: leagueId
 *         schema:
 *           type: integer
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [open, active, pending, complete]
 *       - in: query
 *         name: includeDeleted
 *         schema:
 *           type: boolean
 *     responses:
 *       200:
 *         description: List of pods
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Pod'
 */
router.post(
    '/',
    gameLimiter,
    authenticateToken,
    authorizePermission(['pod_create']),
    createPod
);

router.get(
    '/',
    gameLimiter,
    authenticateToken,
    authorizePermission(['pod_read']),
    getPods
);

/**
 * @openapi
 * /pods/{podId}/join:
 *   post:
 *     summary: Join an existing pod
 *     tags: [Pods]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: podId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Successfully joined pod
 *       400:
 *         description: Pod is full or already joined
 *       404:
 *         description: Pod not found
 */
router.post(
    '/:podId/join',
    gameLimiter,
    authenticateToken,
    joinPod
);

/**
 * @openapi
 * /pods/{podId}/log:
 *   post:
 *     summary: Log game result for a pod
 *     tags: [Pods]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: podId
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               winnerId:
 *                 type: integer
 *               winConditionId:
 *                 type: integer
 *               isDraw:
 *                 type: boolean
 *               turnOrder:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     playerId:
 *                       type: integer
 *                     turnOrder:
 *                       type: integer
 *     responses:
 *       200:
 *         description: Result logged
 *       400:
 *         description: Invalid result data
 */
router.post(
    '/:podId/log',
    gameLimiter,
    authenticateToken,
    logPodResult
);

/**
 * @openapi
 * /pods/{podId}/override:
 *   post:
 *     summary: Override pod result (admin)
 *     tags: [Pods]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: podId
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Pod overridden
 *       403:
 *         description: Forbidden
 */
router.post(
    '/:podId/override',
    gameLimiter,
    authenticateToken,
    overridePod
);

module.exports = router;