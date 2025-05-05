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

// League Management Endpoints
router.post(
    '/',
    authenticateToken,
    authorizePermission(['league_create']), // Permission to create a league
    createLeague
);

router.put(
    '/active',
    authenticateToken,
    authorizePermission(['league_set_active']), // Permission to set a league as active
    setActiveLeague
);

router.put(
    '/:id',
    authenticateToken,
    authorizePermission(['league_update']), // Permission to update league details
    updateLeague
);

router.get(
    '/',
    authenticateToken,
    authorizePermission(['league_read']), // Permission to view all leagues
    getLeagues
);

router.get(
    '/active',
    authenticateToken,
    authorizePermission(['league_view_active']), // Permission to view the active league
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
    '/:id',
    authenticateToken,
    authorizePermission(['league_view_details']), // Permission to view league details
    getLeagueDetails
);

router.get(
    '/:leagueId/stats',
    authenticateToken,
    authorizePermission(['league_view_details']), // Permission to view league stats and leaderboard
    getLeagueStats
);

router.get(
    '/search',
    authenticateToken,
    authorizePermission(['league_read']), // Permission to search leagues
    searchLeagues
);

router.post(
    '/:leagueId/invite',
    authenticateToken,
    authorizePermission(['league_manage_players']), // Permission to invite users to a league
    inviteToLeague
);

module.exports = router;