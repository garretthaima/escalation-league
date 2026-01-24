const redis = require('../utils/redisClient');
const db = require('../models/db');
const logger = require('../utils/logger');
const { fetchMoxfieldDeck, fetchArchidektDeck } = require('./deckFetchers');

// Fetch deck data from the database or platform if stale
const fetchDeckDataIfStale = async (deck) => {
    try {
        logger.debug('fetchDeckDataIfStale called', { deckId: deck.id });
        const { id: deckId, platform, last_synced_at: lastSyncedAt } = deck;
        const cacheKeyDeck = `deck:${deckId}`;

        // Fetch the latest deck data from the platform
        const platformDeckData = platform === 'Moxfield'
            ? await fetchMoxfieldDeck(deckId)
            : await fetchArchidektDeck(deckId);

        // Convert `updated_at` from the platform to a UTC Date object
        const platformUpdatedAt = new Date(platformDeckData.updated_at);

        // Convert `last_synced_at` from EST to UTC
        const lastSyncedAtDate = lastSyncedAt
            ? new Date(new Date(lastSyncedAt).toISOString()) // Convert EST to UTC
            : null;

        // Determine if the deck data is stale
        const isStale = !lastSyncedAtDate || platformUpdatedAt > lastSyncedAtDate;

        logger.debug('Deck staleness check', { deckId, lastSyncedAt: lastSyncedAtDate, isStale });

        if (isStale) {
            logger.debug('Deck is stale, updating database and cache', { deckId });

            // Update the database with the fresh data
            await db('decks')
                .where('id', deckId)
                .update({
                    name: platformDeckData.name,
                    commanders: JSON.stringify(platformDeckData.commanders),
                    cards: JSON.stringify(platformDeckData.cards),
                    last_synced_at: platformUpdatedAt.toISOString(), // Store in UTC
                });

            // Update the cache with the fresh data
            await redis.set(cacheKeyDeck, JSON.stringify(platformDeckData), 'EX', 3600); // Cache for 1 hour

            // Invalidate the price check cache since deck data changed
            const priceCheckKey = `price-check:${deckId}`;
            await redis.del(priceCheckKey);
            logger.debug('Invalidated price check cache', { deckId });
        } else {
            logger.debug('Deck is up-to-date, using cached data', { deckId });
        }

        return platformDeckData;
    } catch (error) {
        logger.error('Error in fetchDeckDataIfStale', { deckId: deck.id, error: error.message });
        throw error; // Re-throw the error to propagate it to the calling function
    }
};

// Get cached price check results
const getCachedPriceCheck = async (cacheKey) => {
    const cachedPriceCheck = await redis.get(cacheKey);
    return cachedPriceCheck ? JSON.parse(cachedPriceCheck) : null;
};

// Cache price check results
const cachePriceCheckResults = async (cacheKey, results) => {
    await redis.set(cacheKey, JSON.stringify(results), 'EX', 3600); // Cache for 1 hour
};

module.exports = {
    fetchDeckDataIfStale,
    getCachedPriceCheck,
    cachePriceCheckResults,
};