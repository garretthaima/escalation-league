/**
 * Migration: Add pod_life_tracker table
 *
 * Stores life tracker state for active pods, including:
 * - Life totals per player
 * - Commander damage tracking
 * - Seat order mapping
 * - Change history for undo functionality
 */

exports.up = function(knex) {
    return knex.schema.createTable('pod_life_tracker', table => {
        table.increments('id').primary();
        table.integer('pod_id').unsigned().notNullable()
            .references('id').inTable('game_pods').onDelete('CASCADE');
        table.json('state');  // Full life tracker state (life totals, commander damage, seat order)
        table.timestamp('created_at').defaultTo(knex.fn.now());
        table.timestamp('updated_at').defaultTo(knex.fn.now());
        table.unique('pod_id');  // One tracker state per pod
    });
};

exports.down = function(knex) {
    return knex.schema.dropTable('pod_life_tracker');
};
