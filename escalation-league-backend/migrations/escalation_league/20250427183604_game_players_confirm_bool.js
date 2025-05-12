/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
    await knex.schema.alterTable('game_players', (table) => {
        table.boolean('confirmed').defaultTo(false).alter();
    });
};

exports.down = async function (knex) {
    await knex.schema.alterTable('game_players', (table) => {
        table.integer('confirmed').defaultTo(0).alter();
    });
};