// Helper function: Standardize deck data for storage
const standardizeDeckData = (platform, deckId, decklistUrl, name, commanders, cards, updatedAt) => {
    return {
        id: deckId,
        decklist_url: decklistUrl,
        platform,
        name,
        commanders: commanders.map((commander) => ({
            name: commander.name,
            scryfall_id: commander.scryfall_id,
        })),
        cards: cards.map((card) => ({
            name: card.name,
            scryfall_id: card.scryfall_id,
        })),
        updated_at: updatedAt || null,
    };
};

module.exports = {
    standardizeDeckData,
};