exports.up = function (knex) {
    return knex.schema.table('cards', (table) => {
        // Add missing columns
        table.json('multiverse_ids').nullable(); // Multiverse IDs (array)
        table.integer('mtgo_id').nullable(); // MTGO ID
        table.integer('tcgplayer_id').nullable(); // TCGPlayer ID
        table.integer('cardmarket_id').nullable(); // CardMarket ID
        table.string('lang').nullable(); // Language
        table.date('released_at').nullable(); // Release date
        table.string('layout').nullable(); // Card layout (e.g., "normal", "split")
        table.boolean('highres_image').nullable(); // Whether the card has a high-res image
        table.string('image_status').nullable(); // Image status (e.g., "highres_scan")
        table.json('keywords').nullable(); // Keywords (e.g., ["Landfall"])
        table.json('all_parts').nullable(); // Related cards (e.g., combo pieces)
        table.json('games').nullable(); // Games the card is available in (e.g., ["paper", "mtgo"])
        table.boolean('reserved').nullable(); // Whether the card is reserved
        table.boolean('foil').nullable(); // Whether the card is available in foil
        table.boolean('nonfoil').nullable(); // Whether the card is available in nonfoil
        table.json('finishes').nullable(); // Available finishes (e.g., ["nonfoil", "foil"])
        table.boolean('oversized').nullable(); // Whether the card is oversized
        table.boolean('promo').nullable(); // Whether the card is a promo
        table.boolean('reprint').nullable(); // Whether the card is a reprint
        table.boolean('variation').nullable(); // Whether the card is a variation
        table.string('set_id').nullable(); // Set ID
        table.string('set_type').nullable(); // Set type (e.g., "commander")
        table.string('watermark').nullable(); // Watermark (if applicable)
        table.text('flavor_text').nullable(); // Flavor text
        table.string('card_back_id').nullable(); // Card back ID
        table.string('artist').nullable(); // Artist name
        table.json('artist_ids').nullable(); // JSON array of artist IDs
        table.string('illustration_id').nullable(); // Illustration ID
        table.string('border_color').nullable(); // Border color (e.g., "black")
        table.string('frame').nullable(); // Frame type (e.g., "2015")
        table.json('frame_effects').nullable(); // Frame effects (e.g., ["legendary"])
        table.string('security_stamp').nullable(); // Security stamp (e.g., "oval")
        table.boolean('full_art').nullable(); // Whether the card is full art
        table.boolean('textless').nullable(); // Whether the card is textless
        table.boolean('booster').nullable(); // Whether the card is available in boosters
        table.boolean('story_spotlight').nullable(); // Whether the card is a story spotlight
        table.integer('edhrec_rank').nullable(); // EDHREC rank (if applicable)
        table.json('preview').nullable(); // JSON object for preview information
        table.json('related_uris').nullable(); // JSON object for related URIs
        table.json('purchase_uris').nullable(); // JSON object for purchase URIs
    });
};

exports.down = function (knex) {
    return knex.schema.table('cards', (table) => {
        // Drop the columns added in the `up` method
        table.dropColumn('multiverse_ids');
        table.dropColumn('mtgo_id');
        table.dropColumn('tcgplayer_id');
        table.dropColumn('cardmarket_id');
        table.dropColumn('lang');
        table.dropColumn('released_at');
        table.dropColumn('layout');
        table.dropColumn('highres_image');
        table.dropColumn('image_status');
        table.dropColumn('keywords');
        table.dropColumn('all_parts');
        table.dropColumn('games');
        table.dropColumn('reserved');
        table.dropColumn('foil');
        table.dropColumn('nonfoil');
        table.dropColumn('finishes');
        table.dropColumn('oversized');
        table.dropColumn('promo');
        table.dropColumn('reprint');
        table.dropColumn('variation');
        table.dropColumn('set_id');
        table.dropColumn('set_type');
        table.dropColumn('watermark');
        table.dropColumn('flavor_text');
        table.dropColumn('card_back_id');
        table.dropColumn('artist');
        table.dropColumn('artist_ids');
        table.dropColumn('illustration_id');
        table.dropColumn('border_color');
        table.dropColumn('frame');
        table.dropColumn('frame_effects');
        table.dropColumn('security_stamp');
        table.dropColumn('full_art');
        table.dropColumn('textless');
        table.dropColumn('booster');
        table.dropColumn('story_spotlight');
        table.dropColumn('edhrec_rank');
        table.dropColumn('preview');
        table.dropColumn('related_uris');
        table.dropColumn('purchase_uris');
    });
};