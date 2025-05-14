exports.up = async function (knex) {
    await knex.schema.table('cards', (table) => {
        table.json('card_faces').nullable(); // Add a JSON column for card faces
    });
};

exports.down = async function (knex) {
    await knex.schema.table('cards', (table) => {
        table.dropColumn('card_faces'); // Remove the column if the migration is rolled back
    });
};