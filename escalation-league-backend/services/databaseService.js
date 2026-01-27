const db = require('../models/db');

const getDeckFromDatabase = async (deckId) => {
    return db('decks')
        .select('id', 'decklist_url', 'platform', 'last_synced_at', 'commanders', 'cards', 'name')
        .where('id', deckId)
        .first();
};

const saveDeckToDatabase = async (deckData) => {
    const { id, decklist_url, platform, name, commanders, cards } = deckData;

    // Check if deck already exists
    const existingDeck = await db('decks').where('id', id).first();

    if (existingDeck) {
        // Update existing deck
        return db('decks')
            .where('id', id)
            .update({
                decklist_url,
                platform,
                name,
                commanders: JSON.stringify(commanders),
                cards: JSON.stringify(cards),
                last_synced_at: db.fn.now(),
                updated_at: db.fn.now()
            });
    } else {
        // Insert new deck
        return db('decks').insert({
            id,
            decklist_url,
            platform,
            name,
            commanders: JSON.stringify(commanders),
            cards: JSON.stringify(cards),
            last_synced_at: db.fn.now()
        });
    }
};

module.exports = { getDeckFromDatabase, saveDeckToDatabase };
