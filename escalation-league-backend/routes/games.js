const express = require('express');
const router = express.Router();
const {
    getGameParticipants,
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
const authorizeLeagueAccess = require('../middlewares/authorizeLeagueAccess');

// Fetch Participants for a Game
router.get('/:gameId/participants', authenticateToken, authorizeGameAccess, getGameParticipants);

// Confirm Game Participation
router.put('/:gameId/confirm', authenticateToken, authorizeGameAccess, confirmGame);

// Fetch Game History
router.get('/history', authenticateToken, getGameHistory);

// Fetch Game Details
router.get('/:gameId', authenticateToken, authorizeGameAccess, getGameDetails);

// Update Game Details
router.put('/:gameId', authenticateToken, authorizeGameAccess, updateGameDetails);

// Delete a Game
router.delete('/:gameId', authenticateToken, authorizeRole(['league_admin', 'admin']), deleteGame);

// Fetch All Games in a League
router.get('/league/:leagueId', authenticateToken, authorizeLeagueAccess, getGamesInLeague);

module.exports = router;