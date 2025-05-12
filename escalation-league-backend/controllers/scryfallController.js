const axios = require('axios');

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
};

module.exports = ScryfallController;