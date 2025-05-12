/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
    await knex.schema.table('game_players', (table) => {
        table.timestamp('confirmation_time').nullable(); // Add a nullable timestamp column
    });

    await knex.schema.table('game_pods', (table) => {
        table.boolean('confirmation_status').defaultTo(false); // Add a boolean column
    });
};

exports.down = async function (knex) {
    await knex.schema.table('game_players', (table) => {
        table.dropColumn('confirmation_time'); // Remove the column on rollback
    });

    await knex.schema.table('game_pods', (table) => {
        table.dropColumn('confirmation_status'); // Remove the column on rollback
    });
};