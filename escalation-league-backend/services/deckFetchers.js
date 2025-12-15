const axios = require('axios');
const { moxfieldLimiter, archidektLimiter } = require('../utils/rateLimiter');
const { standardizeDeckData } = require('../utils/deckUtils');

// Fetch deck data from Moxfield
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
        cards,
        updated_at = response.data.lastUpdatedAtUtc
    );
};

// Fetch deck data from Archidekt
const fetchArchidektDeck = async (deckId) => {
    const response = await archidektLimiter.schedule(() =>
        axios.get(`https://archidekt.com/api/decks/${deckId}/`)
    );

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
        cards,
        updated_at = response.data.updatedAt
    );
};

module.exports = {
    fetchMoxfieldDeck,
    fetchArchidektDeck,
};