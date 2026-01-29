/**
 * Add missing indexes for query optimization
 *
 * These indexes support frequently used query patterns:
 * - game_players filtered by pod_id + deleted_at (soft deletes)
 * - user_leagues filtered by league_id + is_active (leaderboard queries)
 */

exports.up = async function(knex) {
    // Check if indexes already exist before creating
    const gamePlayersIndexes = await knex.raw(`
        SHOW INDEX FROM game_players WHERE Key_name = 'idx_game_players_pod_deleted'
    `);

    const userLeaguesIndexes = await knex.raw(`
        SHOW INDEX FROM user_leagues WHERE Key_name = 'idx_user_leagues_league_active'
    `);

    const promises = [];

    // game_players: frequently filtered by pod_id + deleted_at
    if (gamePlayersIndexes[0].length === 0) {
        promises.push(
            knex.schema.alterTable('game_players', table => {
                table.index(['pod_id', 'deleted_at'], 'idx_game_players_pod_deleted');
            })
        );
    }

    // user_leagues: heavily used in leaderboard queries
    if (userLeaguesIndexes[0].length === 0) {
        promises.push(
            knex.schema.alterTable('user_leagues', table => {
                table.index(['league_id', 'is_active'], 'idx_user_leagues_league_active');
            })
        );
    }

    if (promises.length > 0) {
        await Promise.all(promises);
    }
};

exports.down = async function(knex) {
    const promises = [];

    // Check if indexes exist before dropping
    const gamePlayersIndexes = await knex.raw(`
        SHOW INDEX FROM game_players WHERE Key_name = 'idx_game_players_pod_deleted'
    `);

    const userLeaguesIndexes = await knex.raw(`
        SHOW INDEX FROM user_leagues WHERE Key_name = 'idx_user_leagues_league_active'
    `);

    if (gamePlayersIndexes[0].length > 0) {
        promises.push(
            knex.schema.alterTable('game_players', table => {
                table.dropIndex(['pod_id', 'deleted_at'], 'idx_game_players_pod_deleted');
            })
        );
    }

    if (userLeaguesIndexes[0].length > 0) {
        promises.push(
            knex.schema.alterTable('user_leagues', table => {
                table.dropIndex(['league_id', 'is_active'], 'idx_user_leagues_league_active');
            })
        );
    }

    if (promises.length > 0) {
        await Promise.all(promises);
    }
};
