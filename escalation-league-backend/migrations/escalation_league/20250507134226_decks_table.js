exports.up = function (knex) {
    return knex.schema.createTable('decks', (table) => {
        table.string('id').primary(); // Deck ID (e.g., from Moxfield or Archidekt)
        table.string('decklist_url').notNullable(); // URL of the decklist
        table.string('platform').notNullable(); // Platform (e.g., Moxfield, Archidekt)
        table.string('name').notNullable(); // Name of the deck
        table.json('commanders').notNullable(); // JSON array of commanders (to handle partners)
        table.json('cards').notNullable(); // JSON array of cards (name and scryfall_id)
        table.timestamps(true, true); // Created at and updated at timestamps
    });
};

exports.down = function (knex) {
    return knex.schema.dropTableIfExists('decks');
};