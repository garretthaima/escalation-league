const redis = require('../utils/redisClient');
const db = require('../models/db');
const logger = require('../utils/logger');
const { fetchMoxfieldDeck, fetchArchidektDeck } = require('./deckFetchers');

/**
 * Safely parse a date from platform data, falling back to current time if invalid
 * @param {string|Date} dateValue - The date value to parse
 * @returns {Date} - A valid Date object
 */
const safeParsePlatformDate = (dateValue) => {
    if (!dateValue) return new Date();
    const parsedDate = new Date(dateValue);
    return isNaN(parsedDate.getTime()) ? new Date() : parsedDate;
};

/**
 * Convert a Date object to MySQL datetime format (YYYY-MM-DD HH:MM:SS)
 * @param {Date} date - The date to convert
 * @returns {string} - MySQL formatted datetime string
 */
const toMySQLDatetime = (date) => {
    return date.toISOString().slice(0, 19).replace('T', ' ');
};

// Configuration for lazy sync
const LAZY_SYNC_INTERVAL_HOURS = 6; // Minimum hours between league syncs
const LAZY_SYNC_CACHE_KEY_PREFIX = 'league-sync-last:';
const LAZY_SYNC_LOCK_PREFIX = 'league-sync-lock:';
const LAZY_SYNC_LOCK_TTL = 600; // 10 minutes lock to prevent concurrent syncs

/**
 * Trigger a lazy sync for all decks in a league if enough time has passed
 * This runs in the background and doesn't block the caller
 *
 * @param {number} leagueId - The league ID to sync decks for
 * @returns {Promise<boolean>} - True if sync was triggered, false if skipped
 */
const triggerLazySyncIfNeeded = async (leagueId) => {
    try {
        const cacheKey = `${LAZY_SYNC_CACHE_KEY_PREFIX}${leagueId}`;
        const lockKey = `${LAZY_SYNC_LOCK_PREFIX}${leagueId}`;

        // Check if a sync is already in progress (lock exists)
        const lockExists = await redis.get(lockKey);
        if (lockExists) {
            logger.debug('Lazy sync already in progress, skipping', { leagueId });
            return false;
        }

        // Check when the last sync happened
        const lastSyncTime = await redis.get(cacheKey);
        if (lastSyncTime) {
            const hoursSinceSync = (Date.now() - parseInt(lastSyncTime, 10)) / (1000 * 60 * 60);
            if (hoursSinceSync < LAZY_SYNC_INTERVAL_HOURS) {
                logger.debug('Lazy sync not needed, last sync was recent', {
                    leagueId,
                    hoursSinceSync: hoursSinceSync.toFixed(2)
                });
                return false;
            }
        }

        // Acquire lock before starting sync
        const lockAcquired = await redis.set(lockKey, Date.now().toString(), 'EX', LAZY_SYNC_LOCK_TTL, 'NX');
        if (!lockAcquired) {
            logger.debug('Could not acquire sync lock, another sync may have started', { leagueId });
            return false;
        }

        // Trigger sync in background (don't await)
        syncLeagueDecksBackground(leagueId, cacheKey, lockKey).catch(err => {
            logger.error('Background lazy sync failed', { leagueId, error: err.message });
        });

        logger.info('Triggered lazy sync for league decks', { leagueId });
        return true;
    } catch (error) {
        logger.error('Error checking lazy sync status', { leagueId, error: error.message });
        return false;
    }
};

/**
 * Background sync function for league decks
 * Updates decks that have changed on the platform since last sync
 *
 * @param {number} leagueId - The league ID
 * @param {string} cacheKey - Redis key for last sync time
 * @param {string} lockKey - Redis key for sync lock
 */
const syncLeagueDecksBackground = async (leagueId, cacheKey, lockKey) => {
    let updatedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    try {
        logger.info('Starting lazy sync for league', { leagueId });

        // Get all decks in the league
        const decks = await db('user_leagues as ul')
            .join('decks as d', 'ul.deck_id', 'd.id')
            .where('ul.league_id', leagueId)
            .select('d.id', 'd.platform', 'd.last_synced_at', 'd.name');

        logger.debug('Found decks to sync', { leagueId, count: decks.length });

        for (const deck of decks) {
            try {
                const { id: deckId, platform, last_synced_at: lastSyncedAt } = deck;

                // Fetch latest data from platform
                const platformDeckData = platform === 'Moxfield'
                    ? await fetchMoxfieldDeck(deckId)
                    : await fetchArchidektDeck(deckId);

                // Safely parse the platform's updated_at date
                const platformUpdatedAt = safeParsePlatformDate(platformDeckData.updated_at);
                const lastSyncedAtDate = lastSyncedAt ? new Date(lastSyncedAt) : null;
                const isStale = !lastSyncedAtDate || platformUpdatedAt > lastSyncedAtDate;

                if (isStale) {
                    logger.debug('Updating stale deck', { deckId, deckName: platformDeckData.name });

                    // Update database
                    await db('decks')
                        .where('id', deckId)
                        .update({
                            name: platformDeckData.name,
                            commanders: JSON.stringify(platformDeckData.commanders),
                            cards: JSON.stringify(platformDeckData.cards),
                            last_synced_at: toMySQLDatetime(platformUpdatedAt),
                        });

                    // Update Redis cache
                    const cacheKeyDeck = `deck:${deckId}`;
                    await redis.set(cacheKeyDeck, JSON.stringify(platformDeckData), 'EX', 3600);

                    // Invalidate price check cache
                    const priceCheckKey = `price-check:${deckId}`;
                    await redis.del(priceCheckKey);

                    updatedCount++;
                } else {
                    skippedCount++;
                }
            } catch (error) {
                logger.error('Error syncing deck in lazy sync', { deckId: deck.id, error: error.message });
                errorCount++;
            }
        }

        // Update last sync time
        await redis.set(cacheKey, Date.now().toString());

        logger.info('Lazy sync completed for league', {
            leagueId,
            updated: updatedCount,
            skipped: skippedCount,
            errors: errorCount
        });
    } catch (error) {
        logger.error('Fatal error in lazy sync', { leagueId, error: error.message });
    } finally {
        // Release the lock
        await redis.del(lockKey);
    }
};

/**
 * Force sync all decks in a league (for manual admin trigger)
 * This is a synchronous operation that waits for completion
 *
 * @param {number} leagueId - The league ID to sync decks for
 * @returns {Promise<Object>} - Sync results { updated, skipped, errors }
 */
const forceSyncLeagueDecks = async (leagueId) => {
    let updatedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    const updatedDecks = [];

    logger.info('Force sync requested for league', { leagueId });

    // Get all decks in the league
    const decks = await db('user_leagues as ul')
        .join('decks as d', 'ul.deck_id', 'd.id')
        .where('ul.league_id', leagueId)
        .select('d.id', 'd.platform', 'd.last_synced_at', 'd.name');

    logger.info('Found decks to force sync', { leagueId, count: decks.length });

    for (const deck of decks) {
        try {
            const { id: deckId, platform, last_synced_at: lastSyncedAt } = deck;

            // Fetch latest data from platform
            const platformDeckData = platform === 'Moxfield'
                ? await fetchMoxfieldDeck(deckId)
                : await fetchArchidektDeck(deckId);

            // Safely parse the platform's updated_at date
            const platformUpdatedAt = safeParsePlatformDate(platformDeckData.updated_at);
            const lastSyncedAtDate = lastSyncedAt ? new Date(lastSyncedAt) : null;
            const isStale = !lastSyncedAtDate || platformUpdatedAt > lastSyncedAtDate;

            if (isStale) {
                logger.info('Updating stale deck', { deckId, deckName: platformDeckData.name });

                // Update database
                await db('decks')
                    .where('id', deckId)
                    .update({
                        name: platformDeckData.name,
                        commanders: JSON.stringify(platformDeckData.commanders),
                        cards: JSON.stringify(platformDeckData.cards),
                        last_synced_at: toMySQLDatetime(platformUpdatedAt),
                    });

                // Update Redis cache
                const cacheKeyDeck = `deck:${deckId}`;
                await redis.set(cacheKeyDeck, JSON.stringify(platformDeckData), 'EX', 3600);

                // Invalidate price check cache
                const priceCheckKey = `price-check:${deckId}`;
                await redis.del(priceCheckKey);

                updatedDecks.push({ id: deckId, name: platformDeckData.name });
                updatedCount++;
            } else {
                skippedCount++;
            }
        } catch (error) {
            logger.error('Error syncing deck in force sync', { deckId: deck.id, error: error.message });
            errorCount++;
        }
    }

    // Update last sync time in Redis
    const cacheKey = `${LAZY_SYNC_CACHE_KEY_PREFIX}${leagueId}`;
    await redis.set(cacheKey, Date.now().toString());

    logger.info('Force sync completed for league', {
        leagueId,
        updated: updatedCount,
        skipped: skippedCount,
        errors: errorCount
    });

    return {
        updated: updatedCount,
        skipped: skippedCount,
        errors: errorCount,
        updatedDecks,
        totalDecks: decks.length
    };
};

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

        // Safely parse the platform's updated_at date
        const platformUpdatedAt = safeParsePlatformDate(platformDeckData.updated_at);

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
                    last_synced_at: toMySQLDatetime(platformUpdatedAt), // Store in UTC
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
    triggerLazySyncIfNeeded,
    forceSyncLeagueDecks,
    LAZY_SYNC_INTERVAL_HOURS,
};