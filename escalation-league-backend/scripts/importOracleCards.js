const fs = require('fs');
const knex = require('knex')(require('../knexfile.js').scryfall);

const importOracleCards = async (filePath) => {
    try {
        if (!filePath) {
            throw new Error('File path is required.');
        }

        // Read and parse the Oracle Cards JSON file
        const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

        // Track Commander-legal card IDs
        const commanderLegalIds = new Set();

        // Counters for tracking operations
        let insertedCount = 0;
        let updatedCount = 0;

        // Iterate over each card
        for (const card of data) {
            // Skip cards that are not legal in Commander
            if (card.legalities.commander !== 'legal') {
                continue;
            }

            // Add the card ID to the set of Commander-legal IDs
            commanderLegalIds.add(card.id);

            // Prepare the card_faces data
            const cardFaces = card.card_faces ? JSON.stringify(card.card_faces) : null;

            // Insert or update the card in the database
            const result = await knex('cards')
                .insert({
                    id: card.id,
                    oracle_id: card.oracle_id,
                    multiverse_ids: JSON.stringify(card.multiverse_ids || []),
                    mtgo_id: card.mtgo_id || null,
                    tcgplayer_id: card.tcgplayer_id || null,
                    cardmarket_id: card.cardmarket_id || null,
                    name: card.name,
                    lang: card.lang,
                    prices: JSON.stringify(card.prices || {}),
                    released_at: card.released_at,
                    layout: card.layout,
                    highres_image: card.highres_image,
                    image_status: card.image_status,
                    image_uris: card.image_uris ? JSON.stringify(card.image_uris) : null, // Single-face cards
                    card_faces: cardFaces, // Multi-face cards
                    mana_cost: card.mana_cost,
                    cmc: card.cmc,
                    type_line: card.type_line,
                    oracle_text: card.oracle_text,
                    power: card.power || null,
                    toughness: card.toughness || null,
                    loyalty: card.loyalty || null,
                    colors: JSON.stringify(card.colors || []),
                    color_identity: JSON.stringify(card.color_identity || []),
                    keywords: JSON.stringify(card.keywords || []),
                    all_parts: JSON.stringify(card.all_parts || []),
                    legalities: JSON.stringify(card.legalities || {}),
                    games: JSON.stringify(card.games || []),
                    reserved: card.reserved,
                    foil: card.foil,
                    nonfoil: card.nonfoil,
                    finishes: JSON.stringify(card.finishes || []),
                    oversized: card.oversized,
                    promo: card.promo,
                    reprint: card.reprint,
                    variation: card.variation,
                    set_id: card.set_id,
                    set_code: card.set,
                    set_name: card.set_name,
                    set_type: card.set_type,
                    collector_number: card.collector_number,
                    rarity: card.rarity,
                    watermark: card.watermark || null,
                    flavor_text: card.flavor_text || null,
                    card_back_id: card.card_back_id,
                    artist: card.artist,
                    artist_ids: JSON.stringify(card.artist_ids || []),
                    illustration_id: card.illustration_id || null,
                    border_color: card.border_color,
                    frame: card.frame,
                    frame_effects: JSON.stringify(card.frame_effects || []),
                    security_stamp: card.security_stamp || null,
                    full_art: card.full_art,
                    textless: card.textless,
                    booster: card.booster,
                    story_spotlight: card.story_spotlight,
                    edhrec_rank: card.edhrec_rank || null,
                    preview: JSON.stringify(card.preview || {}),
                    related_uris: JSON.stringify(card.related_uris || {}),
                    purchase_uris: JSON.stringify(card.purchase_uris || {}),
                })
                .onConflict('id')
                .merge();

            // Track insert or update
            if (result.rowCount === 1) {
                insertedCount++;
            } else {
                updatedCount++;
            }
        }

        // Remove cards that are no longer Commander-legal
        const existingIds = await knex('cards').pluck('id');
        const idsToRemove = existingIds.filter((id) => !commanderLegalIds.has(id));

        let removedCount = 0;
        if (idsToRemove.length > 0) {
            await knex('cards').whereIn('id', idsToRemove).del();
            removedCount = idsToRemove.length;
        }

        // Log the results
        console.log(`Inserted ${insertedCount} new cards.`);
        console.log(`Updated ${updatedCount} existing cards.`);
        console.log(`Removed ${removedCount} cards that are no longer Commander-legal.`);
        console.log('Oracle Cards imported successfully!');
    } catch (error) {
        console.error('Error importing Oracle Cards:', error);
    } finally {
        knex.destroy();
    }
};

// Get the file path from the command-line arguments
const filePath = process.argv[2];
importOracleCards(filePath);