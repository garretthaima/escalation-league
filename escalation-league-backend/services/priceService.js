const redis = require('../utils/redisClient');
const scryfallDb = require('../models/scryfallDb');
const logger = require('../utils/logger');

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
            logger.debug('Returning cached price check results', { deckId: deckData.id, cardCount: cachedCardCount });
            return cachedResults;
        } else {
            logger.debug('Cached price check invalid, recalculating', { deckId: deckData.id, cachedCards: cachedCardCount, deckCards: deckCardCount });
            cachedPriceCheck = null; // Invalidate cache so we recalculate below
            cachedResults = { totalPrice: 0, cardPrices: [] };
        }
    }

    // If no cached results and no updatedCards provided, calculate prices for all cards in the deck
    let cardsToPrice = updatedCards;
    if (!cachedPriceCheck && updatedCards.length === 0 && deckData.cards) {
        logger.debug('No cached price check found, calculating prices for all cards', { deckId: deckData.id });

        // Parse cards if it's a JSON string
        if (typeof deckData.cards === 'string') {
            cardsToPrice = JSON.parse(deckData.cards);
        } else if (typeof deckData.cards === 'object' && !Array.isArray(deckData.cards)) {
            // Convert object of cards to array
            cardsToPrice = Object.entries(deckData.cards).map(([name, card]) => ({
                name: name,
                quantity: card.quantity || 1,
                ...card
            }));
        } else {
            cardsToPrice = deckData.cards;
        }
    }

    // Batch query: fetch all cards at once instead of individual queries
    const cardNames = cardsToPrice.map(card => card.name);
    const startTime = Date.now();

    const allPriceRows = await scryfallDb('cards')
        .select(
            'name',
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
        .whereIn('name', cardNames)
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

    logger.debug('Batch query completed', { durationMs: Date.now() - startTime, cardCount: cardNames.length, rowCount: allPriceRows.length });

    // Group price rows by card name for faster lookup
    const priceRowsByName = {};
    allPriceRows.forEach(row => {
        if (!priceRowsByName[row.name]) {
            priceRowsByName[row.name] = [];
        }
        priceRowsByName[row.name].push(row);
    });

    // Process each card to find cheapest price
    const updatedCardPrices = cardsToPrice.map((card) => {
        const priceRows = priceRowsByName[card.name] || [];

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
                        logger.warn('Error parsing card_faces', { error: error.message });
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
    });

    // Remove prices for removed cards
    const remainingCardPrices = cachedResults.cardPrices.filter(
        (card) => !removedCards.includes(card.name)
    );

    // Add updated card prices
    const finalCardPrices = [...remainingCardPrices, ...updatedCardPrices.filter((card) => card !== null)];

    // Recalculate the total price
    const totalPrice = finalCardPrices.reduce((sum, card) => sum + (card.price || 0), 0);

    logger.debug('Price check complete', { deckId: deckData.id, totalPrice: totalPrice.toFixed(2), cardCount: finalCardPrices.length });

    // Cache the updated price check results
    const updatedResults = { totalPrice, cardPrices: finalCardPrices };
    await redis.set(cacheKey, JSON.stringify(updatedResults), 'EX', 3600); // Cache for 1 hour

    return updatedResults;
};

module.exports = { calculateDeckPrices };