const redis = require('../utils/redisClient');
const { fetchMoxfieldDeck, fetchArchidektDeck } = require('../services/deckFetchers');
const { fetchDeckDataIfStale, getCachedPriceCheck, cachePriceCheckResults } = require('../services/deckService');
const { getDeckFromDatabase, saveDeckToDatabase } = require('../services/databaseService');
const { calculateDeckPrices } = require('../services/priceService');
const logger = require('../utils/logger');
const { handleError, badRequest, notFound } = require('../utils/errorUtils');

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
    try {
        const { decklistUrl } = req.body;

        logger.info('Deck validation requested', {
            userId: req.user?.id,
            decklistUrl
        });

        if (!decklistUrl) {
            logger.warn('Deck validation failed - missing URL', { userId: req.user?.id });
            throw badRequest('Decklist URL is required');
        }

        const platform = validateDecklistUrl(decklistUrl);
        if (!platform) {
            logger.warn('Deck validation failed - unsupported format', {
                userId: req.user?.id,
                decklistUrl
            });
            throw badRequest('Unsupported decklist URL format');
        }
        const deckId = platform === 'Moxfield'
            ? decklistUrl.split('/').pop()
            : decklistUrl.match(/^https:\/\/archidekt\.com\/decks\/([0-9]+)/)[1];

        logger.debug('Deck ID extracted', { deckId, platform, userId: req.user?.id });
        const cacheKey = `deck:${deckId}`;

        // Check if the deck is already cached
        const cachedDeck = await redis.get(cacheKey);
        let deckData;
        if (cachedDeck) {
            logger.debug('Deck found in cache', { deckId, userId: req.user?.id });
            deckData = JSON.parse(cachedDeck);

            // Save the cached deck to the database to ensure it is persisted
            await saveDeckToDatabase(deckData);
        } else {
            logger.info('Fetching deck from platform', { deckId, platform, userId: req.user?.id });
            // Fetch deck data from the appropriate platform
            deckData = platform === 'Moxfield'
                ? await fetchMoxfieldDeck(deckId)
                : await fetchArchidektDeck(deckId);

            // Cache the deck data
            await redis.set(cacheKey, JSON.stringify(deckData), 'EX', 3600); // Cache for 1 hour
            logger.info('Deck cached successfully', { deckId, userId: req.user?.id });

            // Save the deck data to the database
            await saveDeckToDatabase(deckData);
        }

        logger.info('Deck validation successful', {
            deckId,
            platform,
            cached: !!cachedDeck,
            userId: req.user?.id
        });

        res.status(200).json({ deck: deckData, cached: !!cachedDeck });
    } catch (error) {
        handleError(res, error, 'Failed to validate or cache deck');
    }
};

const priceCheckDeck = async (req, res) => {
    try {
        const { deckId } = req.body;
        const { refresh } = req.query; // Optional query parameter to force refresh

        if (!deckId) {
            throw badRequest('Deck ID is required');
        }

        const cacheKey = `deck:${deckId}`;
        let deck;
        let dbDeck;

        // Always fetch from database to get last_synced_at
        dbDeck = await getDeckFromDatabase(deckId);
        if (!dbDeck) {
            throw notFound('Deck');
        }

        // Attempt to fetch the deck from Redis for card data
        const cachedDeck = await redis.get(cacheKey);
        if (cachedDeck) {
            logger.debug('Deck found in Redis cache', { deckId });
            deck = JSON.parse(cachedDeck);
            // Merge database metadata with cached data
            deck.last_synced_at = dbDeck.last_synced_at;
            deck.platform = dbDeck.platform;
        } else {
            logger.debug('Deck not found in Redis cache, using database data', { deckId });
            deck = dbDeck;

            // Re-cache the deck in Redis
            await redis.set(cacheKey, JSON.stringify(deck), 'EX', 3600); // Cache for 1 hour
            logger.debug('Deck re-cached in Redis', { deckId });
        }

        // Ensure the deck data is up-to-date
        logger.debug('Fetching deck data if stale', { deckId: deck.id });
        const deckData = await fetchDeckDataIfStale(deck);

        logger.debug('Deck data received', {
            id: deckData.id,
            name: deckData.name,
            hasCards: !!deckData.cards,
            cardsLength: Array.isArray(deckData.cards) ? deckData.cards.length : 'N/A'
        });

        // Calculate prices for the deck
        const priceCheckResults = await calculateDeckPrices(deckData);

        // Cache the price check results
        const priceCheckCacheKey = `price-check:${deckId}`;
        await cachePriceCheckResults(priceCheckCacheKey, priceCheckResults);

        res.status(200).json(priceCheckResults);
    } catch (error) {
        handleError(res, error, 'Failed to perform price check');
    }
};

module.exports = {
    validateAndCacheDeck,
    priceCheckDeck
};