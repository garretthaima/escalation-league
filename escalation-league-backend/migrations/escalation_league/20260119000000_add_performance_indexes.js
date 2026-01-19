/**
 * Migration to add database indexes for query performance
 * Issue #74 - Backend: Add database indexes for performance
 *
 * These indexes target the most frequently queried columns based on
 * controller analysis of common WHERE, JOIN, and ORDER BY clauses.
 */

// Helper to check if an index exists
async function indexExists(knex, tableName, indexName) {
    const result = await knex.raw(`
        SELECT COUNT(*) as count
        FROM information_schema.STATISTICS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = ?
          AND INDEX_NAME = ?
    `, [tableName, indexName]);
    return result[0][0].count > 0;
}

// Helper to add index if it doesn't exist
async function addIndexIfNotExists(knex, tableName, columns, indexName) {
    const exists = await indexExists(knex, tableName, indexName);
    if (!exists) {
        const colArray = Array.isArray(columns) ? columns : [columns];
        await knex.schema.alterTable(tableName, (table) => {
            table.index(colArray, indexName);
        });
        return true;
    }
    return false;
}

// Helper to drop index if it exists
async function dropIndexIfExists(knex, tableName, indexName) {
    const exists = await indexExists(knex, tableName, indexName);
    if (exists) {
        await knex.schema.alterTable(tableName, (table) => {
            table.dropIndex([], indexName);
        });
        return true;
    }
    return false;
}

exports.up = async function (knex) {
    console.log('📊 Adding performance indexes...');

    // game_pods indexes
    await addIndexIfNotExists(knex, 'game_pods', 'league_id', 'idx_game_pods_league_id');
    await addIndexIfNotExists(knex, 'game_pods', 'confirmation_status', 'idx_game_pods_confirmation_status');
    await addIndexIfNotExists(knex, 'game_pods', 'created_at', 'idx_game_pods_created_at');
    await addIndexIfNotExists(knex, 'game_pods', ['league_id', 'confirmation_status'], 'idx_game_pods_league_status');
    console.log('✅ game_pods indexes added');

    // game_players indexes
    await addIndexIfNotExists(knex, 'game_players', 'pod_id', 'idx_game_players_pod_id');
    await addIndexIfNotExists(knex, 'game_players', 'player_id', 'idx_game_players_player_id');
    await addIndexIfNotExists(knex, 'game_players', 'result', 'idx_game_players_result');
    await addIndexIfNotExists(knex, 'game_players', ['player_id', 'result'], 'idx_game_players_player_result');
    console.log('✅ game_players indexes added');

    // user_leagues indexes
    await addIndexIfNotExists(knex, 'user_leagues', 'user_id', 'idx_user_leagues_user_id');
    await addIndexIfNotExists(knex, 'user_leagues', 'league_id', 'idx_user_leagues_league_id');
    console.log('✅ user_leagues indexes added');

    // league_signup_requests indexes
    await addIndexIfNotExists(knex, 'league_signup_requests', 'user_id', 'idx_league_signup_requests_user_id');
    await addIndexIfNotExists(knex, 'league_signup_requests', 'league_id', 'idx_league_signup_requests_league_id');
    await addIndexIfNotExists(knex, 'league_signup_requests', 'status', 'idx_league_signup_requests_status');
    console.log('✅ league_signup_requests indexes added');

    // activity_logs indexes
    await addIndexIfNotExists(knex, 'activity_logs', 'user_id', 'idx_activity_logs_user_id');
    await addIndexIfNotExists(knex, 'activity_logs', 'timestamp', 'idx_activity_logs_timestamp');
    await addIndexIfNotExists(knex, 'activity_logs', ['user_id', 'timestamp'], 'idx_activity_logs_user_timestamp');
    console.log('✅ activity_logs indexes added');

    // role_requests indexes
    await addIndexIfNotExists(knex, 'role_requests', 'user_id', 'idx_role_requests_user_id');
    await addIndexIfNotExists(knex, 'role_requests', 'status', 'idx_role_requests_status');
    await addIndexIfNotExists(knex, 'role_requests', 'requested_role_id', 'idx_role_requests_role_id');
    console.log('✅ role_requests indexes added');

    // users indexes (for filtered queries)
    await addIndexIfNotExists(knex, 'users', 'is_active', 'idx_users_is_active');
    await addIndexIfNotExists(knex, 'users', 'is_deleted', 'idx_users_is_deleted');
    console.log('✅ users indexes added');

    // decks indexes
    await addIndexIfNotExists(knex, 'decks', 'decklist_url', 'idx_decks_decklist_url');
    await addIndexIfNotExists(knex, 'decks', 'platform', 'idx_decks_platform');
    console.log('✅ decks indexes added');

    // leagues indexes
    await addIndexIfNotExists(knex, 'leagues', 'is_active', 'idx_leagues_is_active');
    await addIndexIfNotExists(knex, 'leagues', 'start_date', 'idx_leagues_start_date');
    await addIndexIfNotExists(knex, 'leagues', 'end_date', 'idx_leagues_end_date');
    console.log('✅ leagues indexes added');

    console.log('🎉 All performance indexes added successfully');
};

exports.down = async function (knex) {
    console.log('📊 Removing performance indexes...');

    // game_pods indexes
    await dropIndexIfExists(knex, 'game_pods', 'idx_game_pods_league_id');
    await dropIndexIfExists(knex, 'game_pods', 'idx_game_pods_confirmation_status');
    await dropIndexIfExists(knex, 'game_pods', 'idx_game_pods_created_at');
    await dropIndexIfExists(knex, 'game_pods', 'idx_game_pods_league_status');

    // game_players indexes
    await dropIndexIfExists(knex, 'game_players', 'idx_game_players_pod_id');
    await dropIndexIfExists(knex, 'game_players', 'idx_game_players_player_id');
    await dropIndexIfExists(knex, 'game_players', 'idx_game_players_result');
    await dropIndexIfExists(knex, 'game_players', 'idx_game_players_player_result');

    // user_leagues indexes
    await dropIndexIfExists(knex, 'user_leagues', 'idx_user_leagues_user_id');
    await dropIndexIfExists(knex, 'user_leagues', 'idx_user_leagues_league_id');

    // league_signup_requests indexes
    await dropIndexIfExists(knex, 'league_signup_requests', 'idx_league_signup_requests_user_id');
    await dropIndexIfExists(knex, 'league_signup_requests', 'idx_league_signup_requests_league_id');
    await dropIndexIfExists(knex, 'league_signup_requests', 'idx_league_signup_requests_status');

    // activity_logs indexes
    await dropIndexIfExists(knex, 'activity_logs', 'idx_activity_logs_user_id');
    await dropIndexIfExists(knex, 'activity_logs', 'idx_activity_logs_timestamp');
    await dropIndexIfExists(knex, 'activity_logs', 'idx_activity_logs_user_timestamp');

    // role_requests indexes
    await dropIndexIfExists(knex, 'role_requests', 'idx_role_requests_user_id');
    await dropIndexIfExists(knex, 'role_requests', 'idx_role_requests_status');
    await dropIndexIfExists(knex, 'role_requests', 'idx_role_requests_role_id');

    // users indexes
    await dropIndexIfExists(knex, 'users', 'idx_users_is_active');
    await dropIndexIfExists(knex, 'users', 'idx_users_is_deleted');

    // decks indexes
    await dropIndexIfExists(knex, 'decks', 'idx_decks_decklist_url');
    await dropIndexIfExists(knex, 'decks', 'idx_decks_platform');

    // leagues indexes
    await dropIndexIfExists(knex, 'leagues', 'idx_leagues_is_active');
    await dropIndexIfExists(knex, 'leagues', 'idx_leagues_start_date');
    await dropIndexIfExists(knex, 'leagues', 'idx_leagues_end_date');

    console.log('✅ Performance indexes removed');
};
