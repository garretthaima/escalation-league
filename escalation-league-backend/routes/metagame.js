const express = require('express');
const { getMetagameStats, getCardStats, getTurnOrderStats } = require('../controllers/metagameController');
const authenticateToken = require('../middlewares/authentication');
const authorizePermission = require('../middlewares/authorizePermission');

const router = express.Router();

// Get metagame statistics for a league
router.get(
    '/:leagueId/metagame/analysis',
    authenticateToken,
    authorizePermission(['league_view_details']),
    getMetagameStats
);

// Get statistics for a specific card
router.get(
    '/:leagueId/metagame/card/:cardName',
    authenticateToken,
    authorizePermission(['league_view_details']),
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
