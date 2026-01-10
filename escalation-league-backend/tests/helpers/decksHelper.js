const db = require('./testDb');

async function createTestDeck(userId, overrides = {}) {
    const deckId = overrides.id || `deck-${Date.now()}-${Math.random()}`;

    await db('decks').insert({
        id: deckId,
        decklist_url: overrides.decklistUrl || `https://archidekt.com/decks/${deckId}`,
        platform: overrides.platform || 'archidekt',
        name: overrides.name || 'Test Deck',
        commanders: overrides.commanders || JSON.stringify(['Test Commander']),
        cards: overrides.cards || JSON.stringify([]),
        created_at: overrides.createdAt || db.fn.now(),
        updated_at: overrides.updatedAt || db.fn.now(),
        last_synced_at: overrides.lastSyncedAt || db.fn.now(),
        ...overrides
    });

    // Note: The decks table doesn't have a user_id column
    // Ownership is tracked through deck usage in leagues/pods
    return deckId;
}

async function importDeck(userId, deckUrl, platform = 'archidekt') {
    const deckId = `${platform}-${Date.now()}`;

    return await createTestDeck(userId, {
        id: deckId,
        decklistUrl: deckUrl,
        platform: platform
    });
}

async function syncDeck(deckId, updates = {}) {
    return await db('decks')
        .where('id', deckId)
        .update({
            commanders: updates.commanders || null,
            cards: updates.cards || null,
            last_synced_at: db.fn.now(),
            updated_at: db.fn.now()
        });
}

async function updateDeckCommander(deckId, commanderName, partnerName = null) {
    const commanders = partnerName
        ? JSON.stringify([commanderName, partnerName])
        : JSON.stringify([commanderName]);

    return await db('decks')
        .where('id', deckId)
        .update({
            commanders,
            updated_at: db.fn.now()
        });
}

async function deleteDeck(deckId) {
    return await db('decks')
        .where('id', deckId)
        .del();
}

async function getDeckByUrl(deckUrl) {
    return await db('decks')
        .where('decklist_url', deckUrl)
        .first();
}

module.exports = {
    createTestDeck,
    importDeck,
    syncDeck,
    updateDeckCommander,
    deleteDeck,
    getDeckByUrl
};