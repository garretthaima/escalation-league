/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
    await knex.schema.alterTable('game_pods', (table) => {
        table.dropColumn('status');
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
    await knex.schema.alterTable('game_pods', (table) => {
        table.enum('status', ['active', 'completed']).defaultTo('active');
    });
};
