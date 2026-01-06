const db = require('../models/db');
const redis = require('../utils/redisClient');
const { fetchMoxfieldDeck, fetchArchidektDeck } = require('../services/deckFetchers');

const syncAllDecks = async () => {
    try {
        console.log('Starting deck synchronization...');
        console.log(`Time: ${new Date().toISOString()}`);

        // Fetch all decks from database
        const decks = await db('decks').select('*');
        console.log(`Found ${decks.length} decks to check`);

        let updatedCount = 0;
        let skippedCount = 0;
        let errorCount = 0;

        for (const deck of decks) {
            try {
                const { id: deckId, platform, last_synced_at: lastSyncedAt } = deck;

                // Fetch latest data from platform
                const platformDeckData = platform === 'Moxfield'
                    ? await fetchMoxfieldDeck(deckId)
                    : await fetchArchidektDeck(deckId);

                // Check if deck is stale
                const platformUpdatedAt = new Date(platformDeckData.updated_at);
                const lastSyncedAtDate = lastSyncedAt ? new Date(lastSyncedAt) : null;
                const isStale = !lastSyncedAtDate || platformUpdatedAt > lastSyncedAtDate;

                if (isStale) {
                    console.log(`Updating deck ${deckId} (${platformDeckData.name})`);

                    // Update database
                    await db('decks')
                        .where('id', deckId)
                        .update({
                            name: platformDeckData.name,
                            commanders: JSON.stringify(platformDeckData.commanders),
                            cards: JSON.stringify(platformDeckData.cards),
                            last_synced_at: platformUpdatedAt.toISOString(),
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
                console.error(`Error syncing deck ${deck.id}:`, error.message);
                errorCount++;
            }
        }

        console.log('\nSync complete:');
        console.log(`  Updated: ${updatedCount}`);
        console.log(`  Skipped: ${skippedCount}`);
        console.log(`  Errors: ${errorCount}`);

        process.exit(errorCount > 0 ? 1 : 0);
    } catch (error) {
        console.error('Fatal error during deck sync:', error);
        process.exit(1);
    }
};

syncAllDecks();
