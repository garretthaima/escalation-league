const axios = require('axios');
const redis = require('../utils/redisClient');
const { moxfieldLimiter } = require('../utils/rateLimiter');
const db = require('../models/db'); // Database client

// Helper function: Validate the decklist URL
const validateDecklistUrl = (decklistUrl) => {
    const moxfieldRegex = /^https:\/\/www\.moxfield\.com\/decks\/[a-zA-Z0-9-]+$/;
    const archidektRegex = /^https:\/\/archidekt\.com\/decks\/[0-9]+(\/[a-zA-Z0-9_-]+)?$/;

    if (moxfieldRegex.test(decklistUrl)) return 'Moxfield';
    if (archidektRegex.test(decklistUrl)) return 'Archidekt';
    return null;
};

// Helper function: Fetch deck data from Moxfield
const fetchMoxfieldDeck = async (deckId) => {
    const response = await moxfieldLimiter.schedule(() =>
        axios.get(`https://api2.moxfield.com/v2/decks/all/${deckId}`, {
            headers: {
                'User-Agent': process.env.MOXFIELD_USER_AGENT,
            },
        })
    );

    // Extract commanders from the "commanders" field
    const commanders = Object.values(response.data.commanders).map((commander) => ({
        name: commander.card.name,
        scryfall_id: commander.card.scryfall_id,
    }));

    // Extract all cards from the "mainboard" field
    const cards = Object.values(response.data.mainboard).map((card) => ({
        name: card.card.name,
        scryfall_id: card.card.scryfall_id,
    }));

    return standardizeDeckData(
        'Moxfield',
        deckId,
        `https://www.moxfield.com/decks/${deckId}`,
        response.data.name,
        commanders,
        cards
    );
};

// Helper function: Fetch deck data from Archidekt
const fetchArchidektDeck = async (deckId) => {
    const response = await axios.get(`https://archidekt.com/api/decks/${deckId}/`);

    // Extract commanders based on the "categories" field
    const commanders = response.data.cards
        .filter((card) => card.categories && card.categories.includes('Commander'))
        .map((card) => ({
            name: card.card.oracleCard.name,
            scryfall_id: card.card.oracleCard.uid,
        }));

    // Extract all cards in the deck
    const cards = response.data.cards.map((card) => ({
        name: card.card.oracleCard.name,
        scryfall_id: card.card.oracleCard.uid,
    }));

    return standardizeDeckData(
        'Archidekt',
        deckId,
        `https://archidekt.com/decks/${deckId}`,
        response.data.name,
        commanders,
        cards
    );
};

// Helper function: Save deck data to the database
const saveDeckToDatabase = async (deckData) => {
    const { id, decklist_url, platform, name, commanders, cards } = deckData;

    try {
        await db('decks')
            .insert({
                id,
                decklist_url,
                platform,
                name,
                commanders: JSON.stringify(commanders), // Store commanders as JSON
                cards: JSON.stringify(cards), // Store cards as JSON
            })
            .onConflict('id') // If the deck already exists, update it
            .merge();
        console.log(`Deck ${id} saved to database.`);
    } catch (error) {
        console.error('Error saving deck to database:', error.message);
    }
};

// Helper function: Standardize deck data for storage
const standardizeDeckData = (platform, deckId, decklistUrl, name, commanders, cards) => {
    return {
        id: deckId,
        decklist_url: decklistUrl,
        platform,
        name,
        commanders: commanders.map((commander) => ({
            name: commander.name,
            scryfall_id: commander.scryfall_id,
        })),
        cards: cards.map((card) => ({
            name: card.name,
            scryfall_id: card.scryfall_id,
        })),
    };
};

// Main function: Validate and cache deck data
const validateAndCacheDeck = async (req, res) => {
    const { decklistUrl } = req.body;

    if (!decklistUrl) {
        return res.status(400).json({ error: 'Decklist URL is required.' });
    }

    const platform = validateDecklistUrl(decklistUrl);
    if (!platform) {
        return res.status(400).json({ error: 'Unsupported decklist URL format.' });
    }

    try {
        const deckId = platform === 'Moxfield'
            ? decklistUrl.split('/').pop()
            : decklistUrl.match(/^https:\/\/archidekt\.com\/decks\/([0-9]+)/)[1];

        const cacheKey = `deck:${deckId}`;

        // Check if the deck is already cached
        const cachedDeck = await redis.get(cacheKey);
        if (cachedDeck) {
            return res.status(200).json({ deck: JSON.parse(cachedDeck), cached: true });
        }

        // Fetch deck data from the appropriate platform
        const deckData = platform === 'Moxfield'
            ? await fetchMoxfieldDeck(deckId)
            : await fetchArchidektDeck(deckId);

        // Cache the deck data
        await redis.set(cacheKey, JSON.stringify(deckData), 'EX', 3600); // Cache for 1 hour
        console.log('Deck cached successfully:', deckId);

        // Save the deck data to the database
        await saveDeckToDatabase(deckData);

        res.status(200).json({ deck: deckData, cached: false });
    } catch (error) {
        console.error('Error validating or caching deck:', error.message);
        res.status(500).json({ error: 'Failed to validate or cache deck.' });
    }
};

module.exports = {
    validateAndCacheDeck,
};