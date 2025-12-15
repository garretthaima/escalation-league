const db = require('../models/db');

const getDeckFromDatabase = async (deckId) => {
    return db('decks')
        .select('id', 'decklist_url', 'platform', 'last_synced_at', 'commanders', 'cards', 'name')
        .where('id', deckId)
        .first();
};

module.exports = { getDeckFromDatabase };