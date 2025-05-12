exports.up = function (knex) {
    return knex.schema.createTable('cards', (table) => {
        table.string('id').primary(); // Scryfall UUID
        table.string('oracle_id'); // Oracle ID
        table.string('name'); // Card name
        table.string('mana_cost'); // Mana cost
        table.float('cmc'); // Converted mana cost
        table.string('type_line'); // Type line
        table.text('oracle_text'); // Rules text
        table.json('colors'); // Colors
        table.json('color_identity'); // Color identity
        table.string('power'); // Power
        table.string('toughness'); // Toughness
        table.string('loyalty'); // Loyalty
        table.string('rarity'); // Rarity
        table.string('set_code'); // Set code
        table.string('set_name'); // Set name
        table.string('collector_number'); // Collector number
        table.json('image_uris'); // Image URIs
        table.json('legalities'); // Legalities
        table.json('prices'); // Prices
        table.timestamp('updated_at').defaultTo(knex.fn.now());
    });
};

exports.down = function (knex) {
    return knex.schema.dropTableIfExists('cards');
};