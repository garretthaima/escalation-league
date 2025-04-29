const express = require('express');
const router = express.Router();
const {
    signUpForLeague,
    getUserLeagueStats,
    updateUserLeagueData,
    leaveLeague,
    getLeagueParticipants,
    updateLeagueStats
} = require('../controllers/userLeaguesController');
const authenticateToken = require('../middlewares/authentication');
const authorizeRole = require('../middlewares/authorizeRole');

// User-League Endpoints
router.post('/signup', authenticateToken, signUpForLeague); // Sign up for a league
router.get('/:league_id', authenticateToken, getUserLeagueStats); // View user's league stats
router.put('/:league_id', authenticateToken, updateUserLeagueData); // Update user's league data
router.delete('/:league_id', authenticateToken, leaveLeague); // Leave a league
router.put('/update-league-stats', authenticateToken, updateLeagueStats); // Update league-specific stats
router.get('/:league_id/participants', authenticateToken, authorizeRole(['league_admin']), getLeagueParticipants); // View participants (league_admin only)

module.exports = router;