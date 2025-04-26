const express = require('express');
const router = express.Router();
const {
    logGame,
    confirmGame,
    getGameHistory,
    getGameDetails,
    updateGameDetails,
    deleteGame,
    getGamesInLeague,
} = require('../controllers/gamesController');

const authenticateToken = require('../middlewares/authentication');
const authorizeGameAccess = require('../middlewares/authorizeGameAccess');
const authorizeRole = require('../middlewares/authorizeRole');

// Game Logging
router.post('/', authenticateToken, logGame);

// Game Confirmation
router.put('/confirm', authenticateToken, confirmGame);

// Game History
router.get('/history', authenticateToken, getGameHistory);

// Game Details
router.get('/:gameId', authenticateToken, authorizeGameAccess, getGameDetails);

// Update Game Details
router.put('/:gameId', authenticateToken, authorizeGameAccess, updateGameDetails);

// Delete Game
router.delete('/:gameId', authenticateToken, authorizeRole(['league_admin', 'admin']), deleteGame);

// Get All Games in a League
router.get('/league/:leagueId', authenticateToken, authorizeRole(['league_admin', 'admin']), getGamesInLeague);

module.exports = router;