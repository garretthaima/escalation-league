const express = require('express');
const { getMetagameStats, getCardStats, getTurnOrderStats, getCategoryCards, getCommanderMatchups, syncLeagueDecks } = require('../controllers/metagameController');
const authenticateToken = require('../middlewares/authentication');
const authorizePermission = require('../middlewares/authorizePermission');
const { cacheMiddleware, CACHE_TTL } = require('../middlewares/cacheMiddleware');

const router = express.Router();

// Get metagame statistics for a league (expensive query, cache longer)
router.get(
    '/:leagueId/metagame/analysis',
    authenticateToken,
    authorizePermission(['league_view_details']),
    cacheMiddleware(CACHE_TTL.LONG), // Cache for 15 minutes
    getMetagameStats
);

// Get statistics for a specific card
router.get(
    '/:leagueId/metagame/card/:cardName',
    authenticateToken,
    authorizePermission(['league_view_details']),
    cacheMiddleware(CACHE_TTL.MEDIUM), // Cache for 5 minutes
    getCardStats
);

// Get win rate statistics by turn order position
router.get(
    '/:leagueId/metagame/turn-order',
    authenticateToken,
    authorizePermission(['league_view_details']),
    getTurnOrderStats
);

// Get cards for a specific category (ramp, removal, etc.)
router.get(
    '/:leagueId/metagame/category/:category',
    authenticateToken,
    authorizePermission(['league_view_details']),
    cacheMiddleware(CACHE_TTL.MEDIUM), // Cache for 5 minutes
    getCategoryCards
);

// Get commander matchup statistics
router.get(
    '/:leagueId/metagame/commander-matchups',
    authenticateToken,
    authorizePermission(['league_view_details']),
    cacheMiddleware(CACHE_TTL.MEDIUM), // Cache for 5 minutes
    getCommanderMatchups
);

// Manually trigger deck sync for a league (admin only)
router.post(
    '/:leagueId/metagame/sync-decks',
    authenticateToken,
    authorizePermission(['league_update']),
    syncLeagueDecks
);

module.exports = router;
