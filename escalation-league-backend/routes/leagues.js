const express = require('express');
const router = express.Router();
const {
    createLeague,
    setActiveLeague,
    updateLeague,
    getLeagues,
    getActiveLeague,
    getLeagueGames,
    searchLeagues,
    inviteToLeague,
    getLeagueStats
} = require('../controllers/leaguesController');
const authenticateToken = require('../middlewares/authentication');
const authorizeRole = require('../middlewares/authorizeRole');

// League Management Endpoints
router.post('/', authenticateToken, authorizeRole(['admin', 'league_admin']), createLeague); // Create a league
router.put('/active', authenticateToken, authorizeRole(['admin', 'league_admin']), setActiveLeague); // Set active league
router.put('/:id', authenticateToken, authorizeRole(['admin', 'league_admin']), updateLeague); // Update league details
router.get('/', authenticateToken, getLeagues); // Get all leagues (accessible to all authenticated users)
router.get('/active', authenticateToken, getActiveLeague); // Get active league (accessible to all authenticated users)
router.get('/:id/games', authenticateToken, getLeagueGames); // Get games in a league (accessible to all authenticated users)
router.get('/search', authenticateToken, searchLeagues); // Search leagues
router.post('/:leagueId/invite', authenticateToken, authorizeRole(['league_admin']), inviteToLeague); // Invite user to league
router.get('/:leagueId/stats', authenticateToken, getLeagueStats); // Get league stats

module.exports = router;