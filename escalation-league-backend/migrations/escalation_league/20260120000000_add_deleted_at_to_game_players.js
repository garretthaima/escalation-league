/**
 * Add deleted_at column to game_players table for soft delete support
 */
exports.up = async function(knex) {
    await knex.schema.alterTable('game_players', (table) => {
        table.timestamp('deleted_at').nullable().defaultTo(null);
    });
};

exports.down = async function(knex) {
    await knex.schema.alterTable('game_players', (table) => {
        table.dropColumn('deleted_at');
    });
};
