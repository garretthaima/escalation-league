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
const { cacheMiddleware, CACHE_TTL } = require('../middlewares/cacheMiddleware');
const { validateBody } = require('../middlewares/validate');
const { leagueSchemas } = require('../validation/schemas');

// League Management Endpoints
router.post(
    '/',
    authenticateToken,
    authorizePermission(['league_create']), // Permission to create a league
    validateBody(leagueSchemas.create),
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
    validateBody(leagueSchemas.update),
    updateLeague
);

router.get(
    '/',
    authenticateToken,
    authorizePermission(['league_read']),
    cacheMiddleware(CACHE_TTL.LONG), // Cache for 15 minutes
    getLeagues
);

router.get(
    '/active',
    authenticateToken,
    authorizePermission(['league_view_active']),
    cacheMiddleware(CACHE_TTL.MEDIUM), // Cache for 5 minutes
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
    authorizePermission(['league_view_details']),
    authorizeLeagueAccess,
    cacheMiddleware(CACHE_TTL.MEDIUM), // Cache for 5 minutes
    getLeagueStats
);


router.post(
    '/:leagueId/invite',
    authenticateToken,
    authorizePermission(['league_manage_players']), // Permission to invite users to a league
    inviteToLeague
);

module.exports = router;