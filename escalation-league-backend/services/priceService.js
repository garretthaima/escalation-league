const redis = require('../utils/redisClient');
const scryfallDb = require('../models/scryfallDb');

const calculateDeckPrices = async (deckData, updatedCards = [], removedCards = []) => {
    const cacheKey = `price-check:${deckData.id}`;
    let cachedPriceCheck = await redis.get(cacheKey);
    let cachedResults = cachedPriceCheck ? JSON.parse(cachedPriceCheck) : { totalPrice: 0, cardPrices: [] };

    // If cached results exist and no changes, return cached results immediately
    // BUT only if the cache is valid (has card prices AND matches deck size)
    if (cachedPriceCheck && updatedCards.length === 0 && removedCards.length === 0) {
        // Get the actual number of cards in the deck
        const deckCardCount = typeof deckData.cards === 'object' && !Array.isArray(deckData.cards)
            ? Object.keys(deckData.cards).length
            : (Array.isArray(deckData.cards) ? deckData.cards.length : 0);

        const cachedCardCount = cachedResults.cardPrices ? cachedResults.cardPrices.length : 0;

        if (cachedResults.cardPrices && cachedResults.cardPrices.length > 0 && cachedCardCount === deckCardCount) {
            console.log(`Returning cached price check results for deck: ${deckData.id} (${cachedCardCount} cards)`);
            return cachedResults;
        } else {
            console.log(`Cached price check is invalid. Cache: ${cachedCardCount} cards, Deck: ${deckCardCount} cards. Recalculating...`);
            cachedPriceCheck = null; // Invalidate cache so we recalculate below
            cachedResults = { totalPrice: 0, cardPrices: [] };
        }
    }

    // If no cached results and no updatedCards provided, calculate prices for all cards in the deck
    let cardsToPrice = updatedCards;
    if (!cachedPriceCheck && updatedCards.length === 0 && deckData.cards) {
        console.log('No cached price check found. Calculating prices for all cards in deck.');
        console.log('deckData.cards type:', typeof deckData.cards);
        console.log('deckData.cards length:', Array.isArray(deckData.cards) ? deckData.cards.length : 'not an array');

        // Parse cards if it's a JSON string
        if (typeof deckData.cards === 'string') {
            cardsToPrice = JSON.parse(deckData.cards);
            console.log('Parsed cards from JSON string. Count:', cardsToPrice.length);
        } else if (typeof deckData.cards === 'object' && !Array.isArray(deckData.cards)) {
            // Convert object of cards to array
            cardsToPrice = Object.entries(deckData.cards).map(([name, card]) => ({
                name: name,
                quantity: card.quantity || 1,
                ...card
            }));
            console.log('Converted cards object to array. Count:', cardsToPrice.length);
        } else {
            cardsToPrice = deckData.cards;
        }
    }

    // Update prices for the changed cards
    const updatedCardPrices = await Promise.all(
        cardsToPrice.map(async (card) => {
            const priceRows = await scryfallDb('cards')
                .select(
                    'id',
                    'set_name',
                    scryfallDb.raw('JSON_EXTRACT(prices, "$.usd") AS usd'),
                    scryfallDb.raw('JSON_EXTRACT(prices, "$.usd_foil") AS usd_foil'),
                    scryfallDb.raw('JSON_EXTRACT(prices, "$.usd_etched") AS usd_etched'),
                    scryfallDb.raw('JSON_EXTRACT(image_uris, "$.large") AS image_uri'),
                    'card_faces',
                    'type_line',
                    'border_color',
                    'set_code',
                    'set_type',
                )
                .where('name', card.name)
                .andWhereRaw('JSON_CONTAINS(games, \'"paper"\')')
                .whereNotExists(function () {
                    this.select('*')
                        .from('exclusions')
                        .whereRaw('exclusions.set = cards.set_code')
                        .orWhereRaw('exclusions.border_color = cards.border_color')
                        .orWhereRaw('exclusions.type_line = cards.type_line')
                        .orWhereRaw('cards.type_line LIKE exclusions.type_line')
                        .orWhereRaw('exclusions.card_id = cards.id')
                        .orWhereRaw('exclusions.set_type = cards.set_type');
                });

            // Process price rows and return the cheapest price
            let cheapestPrice = Infinity;
            let imageUri = null;
            let setName = null;
            let cardId = null;
            let cardFaces = null;

            priceRows.forEach((row) => {
                const usd = parseFloat(row.usd) || Infinity;
                const usdFoil = parseFloat(row.usd_foil) || Infinity;
                const usdEtched = parseFloat(row.usd_etched) || Infinity;

                const rowCheapest = Math.min(usd, usdFoil, usdEtched);
                if (rowCheapest < cheapestPrice) {
                    cheapestPrice = rowCheapest;
                    imageUri = row.image_uri;
                    setName = row.set_name;
                    cardId = row.id;

                    // Process card_faces if it exists
                    if (row.card_faces) {
                        try {
                            const parsedCardFaces = typeof row.card_faces === 'string' ? JSON.parse(row.card_faces) : row.card_faces;
                            cardFaces = parsedCardFaces.map((face) => ({
                                name: face.name,
                                image_uri: face.image_uris?.normal || null,
                            }));
                        } catch (error) {
                            console.error('Error parsing card_faces:', error.message);
                            cardFaces = null;
                        }
                    }
                }
            });

            if (cheapestPrice === Infinity) {
                return null;
            }

            return {
                name: card.name,
                price: cheapestPrice,
                image_uri: imageUri,
                set_name: setName,
                id: cardId,
                card_faces: cardFaces || null,
            };
        })
    );

    // Remove prices for removed cards
    const remainingCardPrices = cachedResults.cardPrices.filter(
        (card) => !removedCards.includes(card.name)
    );

    // Add updated card prices
    const finalCardPrices = [...remainingCardPrices, ...updatedCardPrices.filter((card) => card !== null)];

    // Recalculate the total price
    const totalPrice = finalCardPrices.reduce((sum, card) => sum + (card.price || 0), 0);

    console.log(`Price check complete for deck ${deckData.id}. Total: $${totalPrice.toFixed(2)}, Cards: ${finalCardPrices.length}`);

    // Cache the updated price check results
    const updatedResults = { totalPrice, cardPrices: finalCardPrices };
    await redis.set(cacheKey, JSON.stringify(updatedResults), 'EX', 3600); // Cache for 1 hour

    return updatedResults;
};

module.exports = { calculateDeckPrices };

module.exports = { calculateDeckPrices };