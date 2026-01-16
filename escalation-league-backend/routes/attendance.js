const express = require('express');
const router = express.Router();
const {
    getLeagueSessions,
    getSession,
    checkIn,
    checkOut,
    getActiveAttendees,
    getTodaySession,
    getActivePollSession
} = require('../controllers/attendanceController');
const authenticateToken = require('../middlewares/authentication');
const authorizePermission = require('../middlewares/authorizePermission');

// Get or create today's session for a league (convenience endpoint)
router.get(
    '/leagues/:league_id/today',
    authenticateToken,
    authorizePermission(['league_read']),
    getTodaySession
);

// Get all sessions for a league
router.get(
    '/leagues/:league_id/sessions',
    authenticateToken,
    authorizePermission(['league_read']),
    getLeagueSessions
);

// Get a specific session with attendance
router.get(
    '/sessions/:session_id',
    authenticateToken,
    authorizePermission(['league_read']),
    getSession
);

// User check-in to a session
router.post(
    '/sessions/:session_id/check-in',
    authenticateToken,
    checkIn
);

// User check-out from a session
router.post(
    '/sessions/:session_id/check-out',
    authenticateToken,
    checkOut
);

// Get active attendees for pod building
router.get(
    '/sessions/:session_id/active',
    authenticateToken,
    authorizePermission(['league_read']),
    getActiveAttendees
);

// Get the active poll session for a league (one poll per league at a time)
router.get(
    '/leagues/:league_id/active-poll',
    authenticateToken,
    authorizePermission(['league_read']),
    getActivePollSession
);

module.exports = router;
