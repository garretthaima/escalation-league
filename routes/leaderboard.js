const express = require('express');
const router = express.Router();
const { getLeaderboard, getOpponentStats } = require('../controllers/leaderboardController');
const authenticateToken = require('../middlewares/authentication');

// Leaderboard
router.get('/leaderboard', getLeaderboard);

// Opponent Stats
router.get('/opponent-stats', authenticateToken, getOpponentStats);

module.exports = router;