const express = require('express');
const ScryfallController = require('../controllers/scryfallController');
const authenticateToken = require('../middlewares/authentication');

const router = express.Router();

// Route for autocomplete
router.get('/autocomplete', ScryfallController.autocomplete, authenticateToken);

// Route for getCardByName
router.get('/cards/named', ScryfallController.getCardByName, authenticateToken);

module.exports = router;