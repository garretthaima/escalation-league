const axios = require('axios');
const scryfallDb = require('../models/scryfallDb');
const redis = require('../utils/redisClient');

const SCRYFALL_BASE_URL = 'https://api.scryfall.com';
const USER_AGENT = 'EscalationLeague/1.0; garretthaima@gmail.com';
const AUTOCOMPLETE_CACHE_TTL = 600; // 10 minutes

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

    // Autocomplete with prices from local database
    async autocompleteWithPrices(req, res) {
        const { q } = req.query;

        if (!q) {
            return res.status(400).json({ error: 'The "q" query parameter is required.' });
        }

        try {
            // Check cache first
            const cacheKey = `autocomplete:${q.toLowerCase()}`;
            const cached = await redis.get(cacheKey);
            if (cached) {
                return res.json(JSON.parse(cached));
            }

            // Simplified query - skip expensive exclusions subquery for autocomplete speed
            // Exclusions will still apply when actually selecting the card
            const printings = await scryfallDb('cards')
                .select(
                    'name',
                    scryfallDb.raw('JSON_EXTRACT(prices, "$.usd") AS usd'),
                    scryfallDb.raw('JSON_EXTRACT(prices, "$.usd_foil") AS usd_foil'),
                    scryfallDb.raw('JSON_EXTRACT(prices, "$.usd_etched") AS usd_etched')
                )
                .where('name', 'like', `${q}%`)
                .whereRaw('JSON_CONTAINS(games, \'"paper"\')')
                .whereNot('border_color', 'gold')
                .whereRaw('JSON_EXTRACT(legalities, "$.commander") IN ("legal", "restricted")')
                .limit(100); // Limit rows returned from DB

            // Group by name and find cheapest price
            const cardMap = {};
            printings.forEach((p) => {
                if (!cardMap[p.name]) {
                    cardMap[p.name] = null;
                }

                const prices = [
                    parseFloat(p.usd),
                    parseFloat(p.usd_foil),
                    parseFloat(p.usd_etched)
                ].filter(price => !isNaN(price) && price > 0);

                if (prices.length > 0) {
                    const minPrice = Math.min(...prices);
                    if (cardMap[p.name] === null || minPrice < cardMap[p.name]) {
                        cardMap[p.name] = minPrice;
                    }
                }
            });

            // Convert to array and limit to 20 results
            const results = Object.keys(cardMap)
                .sort()
                .slice(0, 20)
                .map(name => ({
                    name,
                    price: cardMap[name] ? cardMap[name].toFixed(2) : null
                }));

            // Cache for 10 minutes
            await redis.setex(cacheKey, AUTOCOMPLETE_CACHE_TTL, JSON.stringify(results));

            res.json(results);
        } catch (error) {
            console.error('Error fetching autocomplete with prices:', error);
            res.status(500).json({ error: 'Failed to fetch autocomplete suggestions.' });
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

    // Get cheapest printing of a card by name (same logic as price check)
    async getCheapestPrinting(req, res) {
        const { name } = req.query;

        if (!name) {
            return res.status(400).json({ error: 'Card name is required.' });
        }

        try {
            // Query all printings of the card (with same exclusions as price check)
            const priceRows = await scryfallDb('cards')
                .select(
                    'name',
                    'id',
                    'set_name',
                    'set_code',
                    'border_color',
                    'type_line',
                    'set_type',
                    scryfallDb.raw('JSON_EXTRACT(prices, "$.usd") AS usd'),
                    scryfallDb.raw('JSON_EXTRACT(prices, "$.usd_foil") AS usd_foil'),
                    scryfallDb.raw('JSON_EXTRACT(prices, "$.usd_etched") AS usd_etched'),
                    scryfallDb.raw('JSON_EXTRACT(image_uris, "$.normal") AS image_uri'),
                    'card_faces',
                    scryfallDb.raw('JSON_EXTRACT(legalities, "$.commander") AS commander_legal')
                )
                .where('name', name)
                .andWhereRaw('JSON_CONTAINS(games, \'"paper"\')')
                .whereNot('border_color', 'gold') // Explicitly exclude gold-bordered cards (World Championship, etc.)
                .whereRaw('JSON_EXTRACT(legalities, "$.commander") IN ("legal", "restricted")') // Only commander-legal cards
                .whereNotExists(function () {
                    this.select('*')
                        .from('exclusions')
                        .whereRaw('exclusions.set = cards.set_code')
                        .orWhereRaw('exclusions.border_color = cards.border_color')
                        .orWhereRaw('exclusions.type_line = cards.type_line')
                        .orWhereRaw('cards.type_line LIKE exclusions.type_line')
                        .orWhereRaw('exclusions.card_id = cards.id')
                        .orWhereRaw('exclusions.set_type = cards.set_type');
                });

            if (priceRows.length === 0) {
                return res.status(404).json({ error: 'Card not found.' });
            }

            // Find cheapest printing
            let cheapestPrice = Infinity;
            let cheapestPrinting = null;

            priceRows.forEach((row) => {
                const usd = parseFloat(row.usd) || Infinity;
                const usdFoil = parseFloat(row.usd_foil) || Infinity;
                const usdEtched = parseFloat(row.usd_etched) || Infinity;

                const rowCheapest = Math.min(usd, usdFoil, usdEtched);
                if (rowCheapest < cheapestPrice) {
                    cheapestPrice = rowCheapest;

                    // Handle image_uri - might be string or need parsing
                    let imageUri = null;
                    if (row.image_uri) {
                        try {
                            imageUri = typeof row.image_uri === 'string' && row.image_uri.startsWith('http')
                                ? row.image_uri
                                : JSON.parse(row.image_uri);
                        } catch {
                            imageUri = row.image_uri;
                        }
                    }

                    // Handle card_faces - might be string or need parsing
                    let cardFaces = null;
                    if (row.card_faces) {
                        try {
                            cardFaces = typeof row.card_faces === 'string'
                                ? JSON.parse(row.card_faces)
                                : row.card_faces;
                        } catch {
                            cardFaces = null;
                        }
                    }

                    cheapestPrinting = {
                        id: row.id,
                        name: row.name,
                        set_name: row.set_name,
                        image_uris: {
                            normal: imageUri
                        },
                        prices: {
                            usd: parseFloat(row.usd) || null,
                            usd_foil: parseFloat(row.usd_foil) || null,
                            usd_etched: parseFloat(row.usd_etched) || null
                        },
                        card_faces: cardFaces
                    };
                }
            });

            if (cheapestPrice === Infinity) {
                return res.status(404).json({ error: 'No price data available for this card.' });
            }

            res.json(cheapestPrinting);
        } catch (error) {
            console.error('Error fetching cheapest printing:', error);
            res.status(500).json({ error: 'Failed to fetch cheapest printing.' });
        }
    },
};

module.exports = ScryfallController;