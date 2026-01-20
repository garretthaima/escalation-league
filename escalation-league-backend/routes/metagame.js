const express = require('express');
const { getMetagameStats, getCardStats, getTurnOrderStats } = require('../controllers/metagameController');
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

module.exports = router;
