const express = require('express');
const router = express.Router();
const {
    createSession,
    updateSessionStatus,
    adminCheckIn,
    adminCheckOut,
    getPodSuggestions,
    getMatchupMatrix,
    createPodWithPlayers,
    postDiscordPoll,
    closeDiscordPoll,
    lockSession,
    reopenSession
} = require('../controllers/attendanceAdminController');
const authenticateToken = require('../middlewares/authentication');
const authorizePermission = require('../middlewares/authorizePermission');

// Create a new session
router.post(
    '/sessions',
    authenticateToken,
    authorizePermission(['admin_session_create']),
    createSession
);

// Update session status
router.patch(
    '/sessions/:session_id/status',
    authenticateToken,
    authorizePermission(['admin_session_update']),
    updateSessionStatus
);

// Admin: Check in a user
router.post(
    '/sessions/:session_id/check-in',
    authenticateToken,
    authorizePermission(['admin_attendance_manage']),
    adminCheckIn
);

// Admin: Check out a user
router.post(
    '/sessions/:session_id/check-out',
    authenticateToken,
    authorizePermission(['admin_attendance_manage']),
    adminCheckOut
);

// Get pod suggestions based on active attendees
router.get(
    '/sessions/:session_id/suggest-pods',
    authenticateToken,
    authorizePermission(['admin_attendance_manage']),
    getPodSuggestions
);

// Create a pod with specified players (from suggestions)
router.post(
    '/sessions/:session_id/pods',
    authenticateToken,
    authorizePermission(['admin_attendance_manage']),
    createPodWithPlayers
);

// Get matchup matrix for a league (who has played whom)
router.get(
    '/leagues/:league_id/matchup-matrix',
    authenticateToken,
    authorizePermission(['admin_attendance_manage']),
    getMatchupMatrix
);

// Post a Discord attendance poll for a session
router.post(
    '/sessions/:session_id/discord-poll',
    authenticateToken,
    authorizePermission(['admin_discord_poll']),
    postDiscordPoll
);

// Close a Discord attendance poll for a session (also locks session)
router.delete(
    '/sessions/:session_id/discord-poll',
    authenticateToken,
    authorizePermission(['admin_discord_poll']),
    closeDiscordPoll
);

// Lock a session (without closing poll)
router.post(
    '/sessions/:session_id/lock',
    authenticateToken,
    authorizePermission(['admin_attendance_manage']),
    lockSession
);

// Reopen a locked session
router.post(
    '/sessions/:session_id/reopen',
    authenticateToken,
    authorizePermission(['admin_attendance_manage']),
    reopenSession
);

module.exports = router;
