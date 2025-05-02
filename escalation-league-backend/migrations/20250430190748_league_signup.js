/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
    return knex.schema.createTable('league_signup_requests', (table) => {
        table.increments('id').primary();
        table.integer('user_id').unsigned().notNullable().references('id').inTable('users').onDelete('CASCADE');
        table.integer('league_id').unsigned().notNullable().references('id').inTable('leagues').onDelete('CASCADE');
        table.enum('status', ['pending', 'approved', 'rejected']).defaultTo('pending');
        table.timestamp('created_at').defaultTo(knex.fn.now());
    });
};

exports.down = function (knex) {
    return knex.schema.dropTableIfExists('league_signup_requests');
};