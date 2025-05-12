/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
    // Add the `result` column to the `game_players` table
    await knex.schema.table('game_players', (table) => {
        table.string('result').nullable(); // Tracks individual player results (e.g., 'win', 'draw')
    });

    // Add the `result` column to the `game_pods` table
    await knex.schema.table('game_pods', (table) => {
        table.string('result').nullable(); // Tracks the final result of the pod
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
    // Remove the `result` and `confirmed` columns from the `game_players` table
    await knex.schema.table('game_players', (table) => {
        table.dropColumn('result');
    });

    // Remove the `result` column from the `game_pods` table
    await knex.schema.table('game_pods', (table) => {
        table.dropColumn('result');
    });
};