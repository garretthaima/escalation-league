/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
    return knex.schema.alterTable('game_pods', (table) => {
        // Add published column - false means draft/unpublished, true means visible to players
        table.boolean('published').defaultTo(true).notNullable();

        // Add published_at timestamp for tracking when pods were published
        table.timestamp('published_at').nullable();

        // Add index for efficient filtering
        table.index(['session_id', 'published'], 'idx_game_pods_session_published');
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
    return knex.schema.alterTable('game_pods', (table) => {
        table.dropIndex(['session_id', 'published'], 'idx_game_pods_session_published');
        table.dropColumn('published_at');
        table.dropColumn('published');
    });
};
