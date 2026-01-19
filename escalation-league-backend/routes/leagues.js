const express = require('express');
const router = express.Router();
const {
    createLeague,
    setActiveLeague,
    updateLeague,
    getLeagues,
    getActiveLeague,
    getLeagueDetails,
    getLeagueStats,
    searchLeagues,
    inviteToLeague,
    getSignupRequests,
    approveSignupRequest,
    rejectSignupRequest,
} = require('../controllers/leaguesController');
const authenticateToken = require('../middlewares/authentication');
const authorizePermission = require('../middlewares/authorizePermission');
const authorizeLeagueAccess = require('../middlewares/authorizeLeagueAccess');

/**
 * @openapi
 * /leagues:
 *   post:
 *     summary: Create a new league
 *     tags: [Leagues]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, start_date, end_date]
 *             properties:
 *               name:
 *                 type: string
 *               start_date:
 *                 type: string
 *                 format: date
 *               end_date:
 *                 type: string
 *                 format: date
 *               max_players:
 *                 type: integer
 *     responses:
 *       201:
 *         description: League created
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *   get:
 *     summary: Get all leagues
 *     tags: [Leagues]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of leagues
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/League'
 */
router.post(
    '/',
    authenticateToken,
    authorizePermission(['league_create']), // Permission to create a league
    createLeague
);

/**
 * @openapi
 * /leagues/active:
 *   put:
 *     summary: Set a league as active
 *     tags: [Leagues]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               leagueId:
 *                 type: integer
 *     responses:
 *       200:
 *         description: League set as active
 *   get:
 *     summary: Get the currently active league
 *     tags: [Leagues]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Active league details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/League'
 *       404:
 *         description: No active league
 */
router.put(
    '/active',
    authenticateToken,
    authorizePermission(['league_set_active']),
    setActiveLeague
);

/**
 * @openapi
 * /leagues/{id}:
 *   put:
 *     summary: Update a league
 *     tags: [Leagues]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/League'
 *     responses:
 *       200:
 *         description: League updated
 *   get:
 *     summary: Get league details
 *     tags: [Leagues]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: League details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/League'
 */
router.put(
    '/:id',
    authenticateToken,
    authorizePermission(['league_update']),
    updateLeague
);

router.get(
    '/',
    authenticateToken,
    authorizePermission(['league_read']),
    getLeagues
);

router.get(
    '/active',
    authenticateToken,
    authorizePermission(['league_view_active']),
    getActiveLeague
);

// Signup Request Management Endpoints (moved above dynamic routes)
router.get(
    '/signup-requests',
    authenticateToken,
    authorizePermission(['league_manage_requests']), // Permission to manage signup requests
    getSignupRequests
);

router.put(
    '/signup-requests/:id/approve',
    authenticateToken,
    authorizePermission(['league_manage_requests']), // Permission to approve signup requests
    approveSignupRequest
);

router.put(
    '/signup-requests/:id/reject',
    authenticateToken,
    authorizePermission(['league_manage_requests']), // Permission to reject signup requests
    rejectSignupRequest
);

router.get(
    '/search',
    authenticateToken,
    authorizePermission(['league_read']), // Permission to search leagues
    searchLeagues
);

router.get(
    '/:id',
    authenticateToken,
    authorizePermission(['league_view_details']), // Permission to view league details
    authorizeLeagueAccess,
    getLeagueDetails
);

router.get(
    '/:leagueId/stats',
    authenticateToken,
    authorizePermission(['league_view_details']), // Permission to view league stats and leaderboard
    authorizeLeagueAccess,
    getLeagueStats
);


router.post(
    '/:leagueId/invite',
    authenticateToken,
    authorizePermission(['league_manage_players']), // Permission to invite users to a league
    inviteToLeague
);

module.exports = router;