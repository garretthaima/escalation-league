/**
 * Add recap_posted_at column to game_sessions table
 * Tracks when the weekly recap was posted to Discord
 */
exports.up = async function(knex) {
    const hasRecapPostedAt = await knex.schema.hasColumn('game_sessions', 'recap_posted_at');
    if (!hasRecapPostedAt) {
        await knex.schema.alterTable('game_sessions', (table) => {
            table.timestamp('recap_posted_at').nullable();
        });
    }
};

exports.down = async function(knex) {
    const hasRecapPostedAt = await knex.schema.hasColumn('game_sessions', 'recap_posted_at');
    if (hasRecapPostedAt) {
        await knex.schema.alterTable('game_sessions', (table) => {
            table.dropColumn('recap_posted_at');
        });
    }
};
