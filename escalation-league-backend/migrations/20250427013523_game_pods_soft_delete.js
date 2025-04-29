/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
    await knex.schema.alterTable('game_pods', (table) => {
        table.timestamp('deleted_at').nullable(); // Add the deleted_at column for soft deletion
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
    await knex.schema.alterTable('game_pods', (table) => {
        table.dropColumn('deleted_at'); // Remove the deleted_at column if rolled back
    });
};