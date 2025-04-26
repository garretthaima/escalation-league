const express = require('express');
const router = express.Router();
const { logGame, confirmGame, getGameHistory } = require('../controllers/gamesController');
const authenticateToken = require('../middlewares/authentication');

// Game Logging
router.post('/log-game', authenticateToken, logGame);

// Game Confirmation
router.post('/confirm-game', authenticateToken, confirmGame);

// Game History
router.get('/game-history', authenticateToken, getGameHistory);

module.exports = router;