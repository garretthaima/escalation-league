/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
    return knex.schema.table('user_leagues', function (table) {
        table.integer('league_draws').defaultTo(0).notNullable();
    });
};

exports.down = function (knex) {
    return knex.schema.table('user_leagues', function (table) {
        table.dropColumn('league_draws');
    });
};