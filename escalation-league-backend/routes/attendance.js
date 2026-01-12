const express = require('express');
const router = express.Router();
const {
    createSession,
    getLeagueSessions,
    getSession,
    updateSessionStatus,
    checkIn,
    checkOut,
    adminCheckIn,
    adminCheckOut,
    getActiveAttendees,
    getTodaySession
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

// Create a new session (admin)
router.post(
    '/sessions',
    authenticateToken,
    authorizePermission(['pod_manage']),
    createSession
);

// Get a specific session with attendance
router.get(
    '/sessions/:session_id',
    authenticateToken,
    authorizePermission(['league_read']),
    getSession
);

// Update session status (admin)
router.patch(
    '/sessions/:session_id/status',
    authenticateToken,
    authorizePermission(['pod_manage']),
    updateSessionStatus
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

// Admin: Check in a user
router.post(
    '/sessions/:session_id/admin/check-in',
    authenticateToken,
    authorizePermission(['pod_manage']),
    adminCheckIn
);

// Admin: Check out a user
router.post(
    '/sessions/:session_id/admin/check-out',
    authenticateToken,
    authorizePermission(['pod_manage']),
    adminCheckOut
);

// Get active attendees for pod building
router.get(
    '/sessions/:session_id/active',
    authenticateToken,
    authorizePermission(['league_read']),
    getActiveAttendees
);

module.exports = router;
