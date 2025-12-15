exports.up = function (knex) {
    return knex.schema.table('decks', (table) => {
        table.timestamp('last_synced_at').nullable(); // Track the last sync time
    });
};

exports.down = function (knex) {
    return knex.schema.table('decks', (table) => {
        table.dropColumn('last_synced_at');
    });
};