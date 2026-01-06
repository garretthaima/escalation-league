const express = require('express');
const { validateAndCacheDeck, priceCheckDeck } = require('../controllers/decksController');
const authenticateToken = require('../middlewares/authentication');
const authorizePermission = require('../middlewares/authorizePermission');

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

module.exports = router;