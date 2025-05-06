const axios = require('axios');
const redis = require('../utils/redisClient'); // Redis client setup
const { moxfieldLimiter } = require('../utils/rateLimiter'); // Rate limiter for Moxfield API

// Validate and cache deck data
const validateAndCacheDeck = async (req, res) => {
    const { decklistUrl } = req.body;

    if (!decklistUrl) {
        return res.status(400).json({ error: 'Decklist URL is required.' });
    }

    const moxfieldRegex = /^https:\/\/www\.moxfield\.com\/decks\/[a-zA-Z0-9-]+$/;
    const archidektRegex = /^https:\/\/archidekt\.com\/decks\/[0-9]+(\/[a-zA-Z0-9_-]+)?$/;

    try {
        let deckId;
        let cacheKey;
        let deckData;

        // Fetch deck data from Moxfield
        if (moxfieldRegex.test(decklistUrl)) {
            deckId = decklistUrl.split('/').pop();
            cacheKey = `deck:${deckId}`; // Define cacheKey here

            // Check if the deck is already cached
            const cachedDeck = await redis.get(cacheKey);
            if (cachedDeck) {
                console.log('Deck retrieved from cache:', JSON.parse(cachedDeck));
                return res.status(200).json({ deck: JSON.parse(cachedDeck), cached: true });
            }

            const response = await moxfieldLimiter.schedule(() =>
                axios.get(`https://api2.moxfield.com/v2/decks/all/${deckId}`, {
                    headers: {
                        'User-Agent': process.env.MOXFIELD_USER_AGENT, // Use the User Agent from environment variables
                    },
                })
            );
            deckData = {
                platform: 'Moxfield',
                deckId,
                decklistUrl,
                mainboard: response.data.mainboard,
                mainboardCount: response.data.mainboardCount,
                commanders: response.data.commanders,
                commandersCount: response.data.commandersCount,
            };
        }
        // Fetch deck data from Archidekt
        else if (archidektRegex.test(decklistUrl)) {
            const deckIdMatch = decklistUrl.match(/^https:\/\/archidekt\.com\/decks\/([0-9]+)/);
            if (!deckIdMatch) {
                return res.status(400).json({ error: 'Invalid Archidekt decklist URL.' });
            }
            deckId = deckIdMatch[1]; // The first capturing group contains the deck ID
            cacheKey = `deck:${deckId}`; // Define cacheKey here

            // Check if the deck is already cached
            const cachedDeck = await redis.get(cacheKey);
            if (cachedDeck) {
                console.log('Deck retrieved from cache:', JSON.parse(cachedDeck));
                return res.status(200).json({ deck: JSON.parse(cachedDeck), cached: true });
            }

            const response = await axios.get(`https://archidekt.com/api/decks/${deckId}/`);
            deckData = {
                platform: 'Archidekt',
                deckId,
                decklistUrl,
                name: response.data.name,
                cards: response.data.cards.map((card) => ({
                    name: card.card.oracleCard.name,
                    quantity: card.quantity,
                })),
            };
        } else {
            return res.status(400).json({ error: 'Unsupported decklist URL format.' });
        }

        // Cache the deck data
        await redis.set(cacheKey, JSON.stringify(deckData), 'EX', 3600); // Cache for 1 hour
        console.log('Deck cached successfully:', deckData);

        res.status(200).json({ deck: deckData, cached: false });
    } catch (error) {
        console.error('Error validating or caching deck:', error.message);
        res.status(500).json({ error: 'Failed to validate or cache deck.' });
    }
};

module.exports = {
    validateAndCacheDeck,
};