const express = require('express');
const router = express.Router();
const {
    signUpForLeague,
    getUserLeagueStats,
    updateUserLeagueData,
    leaveLeague,
    getLeagueParticipants,
    getLeagueParticipantDetails,
    updateLeagueStats,
    requestSignupForLeague,
    getUserPendingSignupRequests,
    isUserInLeague,
    updateParticipantStatus,
    getParticipantMatchups,
    getParticipantTurnOrderStats,
} = require('../controllers/userLeaguesController');
const authenticateToken = require('../middlewares/authentication');
const authorizePermission = require('../middlewares/authorizePermission');
const { cacheMiddleware, CACHE_TTL } = require('../middlewares/cacheMiddleware');

// User-League Endpoints

// Request signup for a league
router.post(
    '/signup-request',
    authenticateToken,
    requestSignupForLeague
);

// Fetch user's pending signup requests
router.get(
    '/signup-request',
    authenticateToken,
    getUserPendingSignupRequests
);

// Check if the user is in a league
router.get(
    '/in-league',
    authenticateToken,
    authorizePermission(['league_read']), // Ensure the user has permission to read league data
    isUserInLeague
);

// Sign up for a league
router.post(
    '/signup',
    authenticateToken,
    signUpForLeague
);

// Update league-specific stats
router.put(
    '/update-league-stats',
    authenticateToken,
    authorizePermission(['league_manage_players']), // Permission to update league-specific stats
    updateLeagueStats
);

// Fetch user's league stats
router.get(
    '/:league_id',
    authenticateToken,
    authorizePermission(['league_read']), // Permission to view user's league stats
    getUserLeagueStats
);

// Update user's league data
router.put(
    '/:league_id',
    authenticateToken,
    updateUserLeagueData
);

// Leave a league
router.delete(
    '/:league_id',
    authenticateToken,
    authorizePermission(['league_leave']), // Permission to leave a league
    leaveLeague
);

// View league participants (leaderboard data)
router.get(
    '/:league_id/participants',
    authenticateToken,
    authorizePermission(['league_read']),
    cacheMiddleware(CACHE_TTL.SHORT), // Cache for 1 minute (updates with games)
    getLeagueParticipants
);

router.get(
    '/:league_id/participants/:user_id',
    authenticateToken,
    authorizePermission(['league_read']),
    cacheMiddleware(CACHE_TTL.SHORT), // Cache for 1 minute
    getLeagueParticipantDetails
);

// Get opponent matchup stats for a participant (nemesis/victim)
router.get(
    '/:league_id/participants/:user_id/matchups',
    authenticateToken,
    authorizePermission(['league_read']),
    cacheMiddleware(CACHE_TTL.MEDIUM), // Cache for 5 minutes
    getParticipantMatchups
);

// Get turn order win stats for a participant
router.get(
    '/:league_id/participants/:user_id/turn-order-stats',
    authenticateToken,
    authorizePermission(['league_read']),
    getParticipantTurnOrderStats
);

// Admin: Update participant status (activate/deactivate, disqualify)
router.put(
    '/:league_id/participants/:user_id',
    authenticateToken,
    authorizePermission(['league_manage_players']), // Permission to manage league participants
    updateParticipantStatus
);


module.exports = router;