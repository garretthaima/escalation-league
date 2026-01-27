const express = require('express');
const { validateAndCacheDeck, priceCheckDeck, syncDeck } = require('../controllers/decksController');
const authenticateToken = require('../middlewares/authentication');

const router = express.Router();

// Route to validate and cache deck data
router.post(
    '/validate',
    authenticateToken, // Ensure the user is authenticated
    validateAndCacheDeck
);

router.post(
    '/price-check',
    authenticateToken, // Ensure the user is authenticated
    priceCheckDeck
);

// Route to sync a single deck from its platform
router.post(
    '/:deckId/sync',
    authenticateToken, // Ensure the user is authenticated
    syncDeck
);

module.exports = router;