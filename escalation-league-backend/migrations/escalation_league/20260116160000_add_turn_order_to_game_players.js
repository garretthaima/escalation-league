/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
    // Check if column already exists
    const hasColumn = await knex.schema.hasColumn('game_players', 'turn_order');
    if (!hasColumn) {
        await knex.schema.alterTable('game_players', (table) => {
            // Turn order position (1-6 for players, null if not set)
            table.integer('turn_order').unsigned().nullable();
        });
    }
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
    await knex.schema.alterTable('game_players', (table) => {
        table.dropColumn('turn_order');
    });
};
