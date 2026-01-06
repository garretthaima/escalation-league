const express = require('express');
const ScryfallController = require('../controllers/scryfallController');
const authenticateToken = require('../middlewares/authentication');

const router = express.Router();

// Route for autocomplete
router.get('/autocomplete', authenticateToken, ScryfallController.autocomplete);

// Route for getCardByName
router.get('/cards/named', authenticateToken, ScryfallController.getCardByName);

// Route for getCardById (from local database)
router.get('/cards/:id', authenticateToken, ScryfallController.getCardById);

module.exports = router;