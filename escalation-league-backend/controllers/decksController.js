const axios = require('axios');
const redis = require('../utils/redisClient');
const { moxfieldLimiter, archidektLimiter } = require('../utils/rateLimiter');
const db = require('../models/db'); // Database client
const scryfallDb = require('../models/scryfallDb');

// Helper function: Validate the decklist URL
const validateDecklistUrl = (decklistUrl) => {
    const moxfieldRegex = /^https:\/\/www\.moxfield\.com\/decks\/[a-zA-Z0-9-]+$/;
    const archidektRegex = /^https:\/\/archidekt\.com\/decks\/[0-9]+(\/[a-zA-Z0-9_-]+)?$/;

    if (moxfieldRegex.test(decklistUrl)) return 'Moxfield';
    if (archidektRegex.test(decklistUrl)) return 'Archidekt';
    return null;
};

// Helper function: Fetch deck data from Moxfield
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
        cards
    );
};

// Helper function: Fetch deck data from Archidekt
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
        cards
    );
};

// Helper function: Save deck data to the database
const saveDeckToDatabase = async (deckData) => {
    console.log('Saving deck to database:', deckData); // Log the deck data
    const { id, decklist_url, platform, name, commanders, cards } = deckData;

    try {
        await db('decks')
            .insert({
                id,
                decklist_url,
                platform,
                name,
                commanders: JSON.stringify(commanders), // Store commanders as JSON
                cards: JSON.stringify(cards), // Store cards as JSON
            })
            .onConflict('id') // If the deck already exists, update it
            .merge();
        console.log(`Deck ${id} saved to database.`);
    } catch (error) {
        console.error('Error saving deck to database:', error.message);
    }
};

// Helper function: Standardize deck data for storage
const standardizeDeckData = (platform, deckId, decklistUrl, name, commanders, cards) => {
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
    };
};

// Main function: Validate and cache deck data
const validateAndCacheDeck = async (req, res) => {
    const { decklistUrl } = req.body;

    if (!decklistUrl) {
        return res.status(400).json({ error: 'Decklist URL is required.' });
    }

    const platform = validateDecklistUrl(decklistUrl);
    if (!platform) {
        return res.status(400).json({ error: 'Unsupported decklist URL format.' });
    }

    try {
        const deckId = platform === 'Moxfield'
            ? decklistUrl.split('/').pop()
            : decklistUrl.match(/^https:\/\/archidekt\.com\/decks\/([0-9]+)/)[1];

        const cacheKey = `deck:${deckId}`;

        // Check if the deck is already cached
        const cachedDeck = await redis.get(cacheKey);
        let deckData;
        if (cachedDeck) {
            console.log('Deck found in cache:', deckId);
            deckData = JSON.parse(cachedDeck);

            // Save the cached deck to the database to ensure it is persisted
            await saveDeckToDatabase(deckData);
        } else {
            // Fetch deck data from the appropriate platform
            deckData = platform === 'Moxfield'
                ? await fetchMoxfieldDeck(deckId)
                : await fetchArchidektDeck(deckId);

            // Cache the deck data
            await redis.set(cacheKey, JSON.stringify(deckData), 'EX', 3600); // Cache for 1 hour
            console.log('Deck cached successfully:', deckId);

            // Save the deck data to the database
            await saveDeckToDatabase(deckData);
        }

        res.status(200).json({ deck: deckData, cached: !!cachedDeck });
    } catch (error) {
        console.error('Error validating or caching deck:', error.message);
        res.status(500).json({ error: 'Failed to validate or cache deck.' });
    }
};

const priceCheckDeck = async (req, res) => {
    const { deckId } = req.body;

    if (!deckId) {
        return res.status(400).json({ error: 'Deck ID is required.' });
    }

    try {
        // Lookup the deck in the database using the deckId
        const deck = await db('decks')
            .select('decklist_url', 'platform', 'updated_at', 'commanders')
            .where('id', deckId)
            .first();

        if (!deck) {
            return res.status(404).json({ error: 'Deck not found.' });
        }

        const { decklist_url: decklistUrl, platform, updated_at: cachedUpdatedAt, commanders } = deck;

        const cacheKey = `deck:${deckId}`;

        // Check if the deck is already cached
        const cachedDeck = await redis.get(cacheKey);
        let deckData;
        if (cachedDeck) {
            deckData = JSON.parse(cachedDeck);

            // Verify the `updated_at` field
            const platformDeckData = platform === 'Moxfield'
                ? await fetchMoxfieldDeck(deckId)
                : await fetchArchidektDeck(deckId);

            if (new Date(platformDeckData.updated_at) > new Date(cachedUpdatedAt)) {
                // If the platform's `updated_at` is newer, update the cache
                deckData = platformDeckData;
                await redis.set(cacheKey, JSON.stringify(deckData), 'EX', 3600); // Cache for 1 hour
            }
        } else {
            // Fetch deck data from the appropriate platform
            deckData = platform === 'Moxfield'
                ? await fetchMoxfieldDeck(deckId)
                : await fetchArchidektDeck(deckId);

            // Cache the deck data
            await redis.set(cacheKey, JSON.stringify(deckData), 'EX', 3600); // Cache for 1 hour
        }

        // Append commanders to the deckData.cards array with `commander: true`
        const parsedCommanders = typeof commanders === 'string' ? JSON.parse(commanders) : commanders;

        // Check if commanders are already in deckData.cards
        const commanderNames = parsedCommanders.map((commander) => commander.name);
        deckData.cards = deckData.cards.filter((card) => !commanderNames.includes(card.name));

        // Add the commander flag and append commanders
        const commandersWithFlag = parsedCommanders.map((commander) => ({
            ...commander,
            commander: true, // Add the commander flag
        }));
        deckData.cards = [...deckData.cards, ...commandersWithFlag];

        // Lookup card prices, images, and card_faces in the Scryfall database
        const cardPrices = await Promise.all(
            deckData.cards.map(async (card) => {
                const priceRows = await scryfallDb('cards')
                    .select(
                        'id', // Include the card ID
                        'set_name', // Include the set name
                        scryfallDb.raw('JSON_EXTRACT(prices, "$.usd") AS usd'),
                        scryfallDb.raw('JSON_EXTRACT(prices, "$.usd_foil") AS usd_foil'),
                        scryfallDb.raw('JSON_EXTRACT(prices, "$.usd_etched") AS usd_etched'),
                        scryfallDb.raw('JSON_EXTRACT(image_uris, "$.large") AS image_uri'), // Use high-res images
                        'card_faces', // Include card_faces if they exist
                        'type_line', // Include type_line for filtering
                        'border_color', // Include border_color for filtering
                        'set_code', // Include set for filtering
                        'set_type', // Include set_type for filtering
                    )
                    .where('name', card.name)
                    .andWhereRaw('JSON_CONTAINS(games, \'"paper"\')') // Ensure "paper" is in the games list
                    .whereNotExists(function () {
                        this.select('*')
                            .from('exclusions')
                            .whereRaw('exclusions.set = cards.set_code')
                            .orWhereRaw('exclusions.border_color = cards.border_color')
                            .orWhereRaw('exclusions.type_line = cards.type_line')
                            .orWhereRaw('cards.type_line LIKE exclusions.type_line') // Handle patterns like "Basic Land%"
                            .orWhereRaw('exclusions.card_id = cards.id')
                            .orWhereRaw('exclusions.set_type = cards.set_type')
                    });

                if (!priceRows || priceRows.length === 0) {
                    return null; // Exclude cards with no prices or images
                }

                // Find the cheapest price across all rows
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
                        imageUri = row.image_uri; // Use the image URI from the row with the cheapest price
                        setName = row.set_name; // Use the set name from the row with the cheapest price
                        cardId = row.id; // Use the card ID from the row with the cheapest price

                        // Process card_faces if it exists
                        if (row.card_faces) {
                            try {
                                const parsedCardFaces = typeof row.card_faces === 'string' ? JSON.parse(row.card_faces) : row.card_faces;
                                cardFaces = parsedCardFaces.map((face) => ({
                                    name: face.name,
                                    image_uri: face.image_uris?.normal || null, // Extract only the normal image URI
                                }));
                            } catch (error) {
                                console.error('Error parsing card_faces:', error.message);
                                cardFaces = null; // Fallback to null if parsing fails
                            }
                        }
                    }
                });

                // If no valid price was found, return null
                if (cheapestPrice === Infinity) {
                    return null;
                }

                // Return the card data, including card_faces only if it exists
                const cardData = { name: card.name, price: cheapestPrice, image_uri: imageUri, set_name: setName, id: cardId };
                if (cardFaces) {
                    cardData.card_faces = cardFaces;
                }

                // Add the commander flag if the card is a commander
                if (card.commander) {
                    cardData.commander = true;
                }

                return cardData;
            })
        );

        // Filter out null values and Basic Lands
        const filteredCardPrices = cardPrices.filter((card) => card !== null);

        // Calculate the total price of the deck
        const totalPrice = filteredCardPrices.reduce((sum, card) => {
            return sum + (card.price || 0);
        }, 0);

        res.status(200).json({ totalPrice, cardPrices: filteredCardPrices });
    } catch (error) {
        console.error('Error during price check:', error.message);
        res.status(500).json({ error: 'Failed to perform price check.' });
    }
};
module.exports = {
    validateAndCacheDeck,
    priceCheckDeck
};