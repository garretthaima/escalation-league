const redis = require('../utils/redisClient');
const db = require('../models/db');
const { fetchMoxfieldDeck, fetchArchidektDeck } = require('./deckFetchers');

// Fetch deck data from the database or platform if stale
const fetchDeckDataIfStale = async (deck) => {
    try {
        console.log(`fetchDeckDataIfStale called for deck ID: ${deck.id}`);
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

        console.log(`Deck ${deckId} last synced at: ${lastSyncedAtDate}`);
        console.log('Is stale:', isStale);

        if (isStale) {
            console.log(`Deck ${deckId} is stale. Updating database and cache...`);

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
        } else {
            console.log(`Deck ${deckId} is up-to-date. Using cached data.`);
        }

        return platformDeckData;
    } catch (error) {
        console.error(`Error in fetchDeckDataIfStale for deck ID: ${deck.id}`, error.message);
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