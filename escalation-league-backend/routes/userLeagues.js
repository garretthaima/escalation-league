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
} = require('../controllers/userLeaguesController');
const authenticateToken = require('../middlewares/authentication');
const authorizePermission = require('../middlewares/authorizePermission');

// User-League Endpoints

// Request signup for a league
router.post(
    '/signup-request',
    authenticateToken,
    authorizePermission(['league_signup']), // Permission to request signup
    requestSignupForLeague
);

// Fetch user's pending signup requests
router.get(
    '/signup-request',
    authenticateToken,
    authorizePermission(['league_signup']), // Ensure the user has permission to view their signup requests
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
    authorizePermission(['league_signup']), // Permission to sign up for a league
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
    authorizePermission(['league_update']), // Permission to update user's league data
    updateUserLeagueData
);

// Leave a league
router.delete(
    '/:league_id',
    authenticateToken,
    authorizePermission(['league_leave']), // Permission to leave a league
    leaveLeague
);

// View league participants
router.get(
    '/:league_id/participants',
    authenticateToken,
    authorizePermission(['league_read']), // Permission to view league participants
    getLeagueParticipants
);

router.get(
    '/:league_id/participants/:user_id',
    authenticateToken,
    authorizePermission(['league_read']), // Restrict access to league admins
    getLeagueParticipantDetails
);

// Admin: Update participant status (activate/deactivate, disqualify)
router.put(
    '/:league_id/participants/:user_id',
    authenticateToken,
    authorizePermission(['league_manage_players']), // Permission to manage league participants
    updateParticipantStatus
);


module.exports = router;