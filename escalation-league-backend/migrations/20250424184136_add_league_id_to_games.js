exports.up = async function (knex) {
    // Add league_id column to games table
    await knex.schema.table('games', (table) => {
        table.integer('league_id').unsigned().notNullable().defaultTo(1); // Default to 1 for existing rows
        table.foreign('league_id').references('leagues.id'); // Add foreign key constraint
    });
};

exports.down = async function (knex) {
    // Remove league_id column from games table
    await knex.schema.table('games', (table) => {
        table.dropForeign('league_id');
        table.dropColumn('league_id');
    });
};