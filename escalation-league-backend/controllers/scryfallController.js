const axios = require('axios');
const scryfallDb = require('../models/scryfallDb');

const SCRYFALL_BASE_URL = 'https://api.scryfall.com';
const USER_AGENT = 'EscalationLeague/1.0; garretthaima@gmail.com';

const ScryfallController = {
    // Proxy for autocomplete endpoint
    async autocomplete(req, res) {
        const { q } = req.query;

        if (!q) {
            return res.status(400).json({ error: 'The "q" query parameter is required.' });
        }

        try {
            const response = await axios.get(`${SCRYFALL_BASE_URL}/cards/autocomplete`, {
                params: { q },
                headers: {
                    'User-Agent': USER_AGENT,
                },
            });
            res.json(response.data.data); // Return the array of card names
        } catch (error) {
            console.error('Error fetching autocomplete suggestions from Scryfall:', error);
            res.status(error.response?.status || 500).json({ error: 'Failed to fetch autocomplete suggestions.' });
        }
    },

    // Proxy for getCardByName endpoint
    async getCardByName(req, res) {
        const { exact } = req.query;

        if (!exact) {
            return res.status(400).json({ error: 'The "exact" query parameter is required.' });
        }

        try {
            const response = await axios.get(`${SCRYFALL_BASE_URL}/cards/named`, {
                params: { exact },
                headers: {
                    'User-Agent': USER_AGENT,
                },
            });
            res.json(response.data); // Return the full card details
        } catch (error) {
            console.error('Error fetching card details from Scryfall:', error);
            res.status(error.response?.status || 500).json({ error: 'Failed to fetch card details.' });
        }
    },

    // Get card by Scryfall ID from local database
    async getCardById(req, res) {
        const { id } = req.params;

        if (!id) {
            return res.status(400).json({ error: 'Card ID is required.' });
        }

        try {
            const card = await scryfallDb('cards')
                .select(
                    'id',
                    'name',
                    scryfallDb.raw('JSON_EXTRACT(image_uris, "$.normal") AS image_normal'),
                    scryfallDb.raw('JSON_EXTRACT(image_uris, "$.large") AS image_large'),
                    scryfallDb.raw('JSON_EXTRACT(image_uris, "$.small") AS image_small'),
                    'card_faces'
                )
                .where('id', id)
                .first();

            if (!card) {
                return res.status(404).json({ error: 'Card not found.' });
            }

            // Format response to match expected structure
            const response = {
                id: card.id,
                name: card.name,
                image_uris: {
                    normal: card.image_normal ? JSON.parse(card.image_normal) : null,
                    large: card.image_large ? JSON.parse(card.image_large) : null,
                    small: card.image_small ? JSON.parse(card.image_small) : null,
                },
                card_faces: card.card_faces ? JSON.parse(card.card_faces) : null,
            };

            res.json(response);
        } catch (error) {
            console.error('Error fetching card by ID from local database:', error);
            res.status(500).json({ error: 'Failed to fetch card by ID.' });
        }
    },
};

module.exports = ScryfallController;