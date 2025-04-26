const express = require('express');
const router = express.Router();
const {
    createLeague,
    setActiveLeague,
    getLeagues,
    updateCurrentWeek,
    getActiveLeague,
    getLeagueDetails,
    getLeagueLeaderboard,
} = require('../controllers/leaguesController');
const authenticateToken = require('../middlewares/authentication');

// Create a league
router.post('/create', authenticateToken, createLeague);

// Set active league
router.post('/set-active', authenticateToken, setActiveLeague);

// Get all leagues
router.get('/all', authenticateToken, getLeagues);

// Update current week
router.post('/update-week', authenticateToken, updateCurrentWeek);

// Get active league
router.get('/active', authenticateToken, getActiveLeague);

// Get details of a specific league
router.get('/:leagueId', authenticateToken, getLeagueDetails);

// Get final leaderboard for a specific league
router.get('/:leagueId/leaderboard', authenticateToken, getLeagueLeaderboard);

module.exports = router;