exports.up = function (knex) {
    return knex.schema.createTable('exclusions', (table) => {
        table.increments('id').primary(); // Primary key
        table.string('set', 10).nullable(); // Set code
        table.string('set_name', 255).nullable(); // Human-readable set name
        table.string('border_color', 50).nullable(); // Border color
        table.string('type_line', 255).nullable(); // Type line
        table.string('card_id', 36).nullable(); // Specific card ID
        table.string('rarity', 50).nullable(); // Rarity
        table.boolean('promo').nullable(); // Promotional cards
        table.boolean('oversized').nullable(); // Oversized cards
        table.text('reason').nullable(); // Reason for exclusion
        table.timestamps(true, true); // Created at and updated at timestamps
    });
};

exports.down = function (knex) {
    return knex.schema.dropTableIfExists('exclusions');
};