const scryfallDb = require('../models/scryfallDb');

const calculateDeckPrices = async (deckData, updatedCards = [], removedCards = []) => {
    const cacheKey = `price-check:${deckData.id}`;
    const cachedPriceCheck = await redis.get(cacheKey);
    const cachedResults = cachedPriceCheck ? JSON.parse(cachedPriceCheck) : { totalPrice: 0, cardPrices: [] };

    // Update prices for the changed cards
    const updatedCardPrices = await Promise.all(
        updatedCards.map(async (card) => {
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

    // Cache the updated price check results
    const updatedResults = { totalPrice, cardPrices: finalCardPrices };
    await redis.set(cacheKey, JSON.stringify(updatedResults), 'EX', 3600); // Cache for 1 hour

    return updatedResults;
};

module.exports = { calculateDeckPrices };

module.exports = { calculateDeckPrices };