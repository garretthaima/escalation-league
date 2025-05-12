/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
    // Create the game_pods table
    await knex.schema.createTable('game_pods', (table) => {
        table.increments('id').primary(); // Pod ID
        table.integer('league_id').unsigned().notNullable(); // League ID
        table.integer('creator_id').unsigned().notNullable(); // Creator ID
        table.enum('status', ['active', 'completed']).defaultTo('active'); // Pod status
        table.timestamp('created_at').defaultTo(knex.fn.now()); // Timestamp for creation

        // Foreign keys
        table.foreign('league_id').references('id').inTable('leagues').onDelete('CASCADE');
        table.foreign('creator_id').references('id').inTable('users').onDelete('CASCADE');
    });

    // Add pod_id column to game_players table
    await knex.schema.table('game_players', (table) => {
        table.integer('pod_id').unsigned().nullable(); // Pod ID
        table.foreign('pod_id').references('id').inTable('game_pods').onDelete('CASCADE');
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
    // Remove pod_id column from game_players table
    await knex.schema.table('game_players', (table) => {
        table.dropColumn('pod_id');
    });

    // Drop the game_pods table
    await knex.schema.dropTableIfExists('game_pods');
};