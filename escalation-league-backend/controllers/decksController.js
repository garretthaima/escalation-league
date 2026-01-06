const redis = require('../utils/redisClient');
const { fetchMoxfieldDeck, fetchArchidektDeck } = require('../services/deckFetchers');
const { fetchDeckDataIfStale, getCachedPriceCheck, cachePriceCheckResults } = require('../services/deckService');
const { getDeckFromDatabase, saveDeckToDatabase } = require('../services/databaseService');
const { calculateDeckPrices } = require('../services/priceService');

// Helper function: Validate the decklist URL
const validateDecklistUrl = (decklistUrl) => {
    const moxfieldRegex = /^https:\/\/(www\.)?moxfield\.com\/decks\/[a-zA-Z0-9_-]+$/;
    const archidektRegex = /^https:\/\/archidekt\.com\/decks\/[0-9]+(\/[a-zA-Z0-9_-]+)?$/;

    if (moxfieldRegex.test(decklistUrl)) return 'Moxfield';
    if (archidektRegex.test(decklistUrl)) return 'Archidekt';
    return null;
};

// Main function: Validate and cache deck data
const validateAndCacheDeck = async (req, res) => {
    console.log('validateAndCacheDeck received body:', req.body);
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

        console.log('Deck ID extracted:', deckId, 'Platform:', platform);
        const cacheKey = `deck:${deckId}`;

        // Check if the deck is already cached
        const cachedDeck = await redis.get(cacheKey);
        let deckData;
        if (cachedDeck) {
            console.log('Deck found in cache:', deckId);
            deckData = JSON.parse(cachedDeck);

            // Save the cached deck to the database to ensure it is persisted
            await saveDeckToDatabase(deckData);
        } else {
            // Fetch deck data from the appropriate platform
            deckData = platform === 'Moxfield'
                ? await fetchMoxfieldDeck(deckId)
                : await fetchArchidektDeck(deckId);

            // Cache the deck data
            await redis.set(cacheKey, JSON.stringify(deckData), 'EX', 3600); // Cache for 1 hour
            console.log('Deck cached successfully:', deckId);

            // Save the deck data to the database
            await saveDeckToDatabase(deckData);
        }

        res.status(200).json({ deck: deckData, cached: !!cachedDeck });
    } catch (error) {
        console.error('Error validating or caching deck:', error.message);
        res.status(500).json({ error: 'Failed to validate or cache deck.' });
    }
};

const priceCheckDeck = async (req, res) => {
    const { deckId } = req.body;
    const { refresh } = req.query; // Optional query parameter to force refresh

    if (!deckId) {
        return res.status(400).json({ error: 'Deck ID is required.' });
    }

    const cacheKey = `deck:${deckId}`;

    try {
        let deck;
        let dbDeck;

        // Always fetch from database to get last_synced_at
        dbDeck = await getDeckFromDatabase(deckId);
        if (!dbDeck) {
            return res.status(404).json({ error: 'Deck not found.' });
        }

        // Attempt to fetch the deck from Redis for card data
        const cachedDeck = await redis.get(cacheKey);
        if (cachedDeck) {
            console.log('Deck found in Redis cache:', deckId);
            deck = JSON.parse(cachedDeck);
            // Merge database metadata with cached data
            deck.last_synced_at = dbDeck.last_synced_at;
            deck.platform = dbDeck.platform;
        } else {
            console.log('Deck not found in Redis cache. Using database data...');
            deck = dbDeck;

            // Re-cache the deck in Redis
            await redis.set(cacheKey, JSON.stringify(deck), 'EX', 3600); // Cache for 1 hour
            console.log('Deck re-cached in Redis:', deckId);
        }

        // Ensure the deck data is up-to-date
        console.log(`Calling fetchDeckDataIfStale for deck ID: ${deck.id}`);
        const deckData = await fetchDeckDataIfStale(deck);

        console.log('deckData received:', JSON.stringify({
            id: deckData.id,
            name: deckData.name,
            hasCards: !!deckData.cards,
            cardsType: typeof deckData.cards,
            cardsLength: Array.isArray(deckData.cards) ? deckData.cards.length : 'N/A'
        }));

        // Calculate prices for the deck
        const priceCheckResults = await calculateDeckPrices(deckData);

        // Cache the price check results
        const priceCheckCacheKey = `price-check:${deckId}`;
        await cachePriceCheckResults(priceCheckCacheKey, priceCheckResults);

        res.status(200).json(priceCheckResults);
    } catch (error) {
        console.error('Error during price check:', error.message);
        res.status(500).json({ error: 'Failed to perform price check.' });
    }
};

module.exports = {
    validateAndCacheDeck,
    priceCheckDeck
};