const express = require('express');
const { validateAndCacheDeck, priceCheckDeck } = require('../controllers/decksController');
const authenticateToken = require('../middlewares/authentication');
const authorizePermission = require('../middlewares/authorizePermission');

const router = express.Router();

// Route to validate and cache deck data
router.post(
    '/validate',
    authenticateToken, // Ensure the user is authenticated
    authorizePermission(['deck_validate']), // Ensure the user has the 'validate_decks' permission
    validateAndCacheDeck
);

router.post(
    '/price-check',
    authenticateToken, // Ensure the user is authenticated
    authorizePermission(['deck_validate']), // Ensure the user has the 'validate_decks' permission
    priceCheckDeck
);

module.exports = router;