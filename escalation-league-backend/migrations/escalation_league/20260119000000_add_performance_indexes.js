/**
 * Migration to add database indexes for query performance
 * Issue #74 - Backend: Add database indexes for performance
 *
 * These indexes target the most frequently queried columns based on
 * controller analysis of common WHERE, JOIN, and ORDER BY clauses.
 */
exports.up = async function (knex) {
    console.log('📊 Adding performance indexes...');

    // game_pods indexes
    await knex.schema.alterTable('game_pods', (table) => {
        table.index('league_id', 'idx_game_pods_league_id');
        table.index('confirmation_status', 'idx_game_pods_confirmation_status');
        table.index('created_at', 'idx_game_pods_created_at');
        table.index(['league_id', 'confirmation_status'], 'idx_game_pods_league_status');
    });
    console.log('✅ game_pods indexes added');

    // game_players indexes
    await knex.schema.alterTable('game_players', (table) => {
        table.index('pod_id', 'idx_game_players_pod_id');
        table.index('player_id', 'idx_game_players_player_id');
        table.index('result', 'idx_game_players_result');
        table.index(['player_id', 'result'], 'idx_game_players_player_result');
    });
    console.log('✅ game_players indexes added');

    // user_leagues indexes
    await knex.schema.alterTable('user_leagues', (table) => {
        table.index('user_id', 'idx_user_leagues_user_id');
        table.index('league_id', 'idx_user_leagues_league_id');
    });
    console.log('✅ user_leagues indexes added');

    // league_signup_requests indexes
    await knex.schema.alterTable('league_signup_requests', (table) => {
        table.index('user_id', 'idx_league_signup_requests_user_id');
        table.index('league_id', 'idx_league_signup_requests_league_id');
        table.index('status', 'idx_league_signup_requests_status');
    });
    console.log('✅ league_signup_requests indexes added');

    // activity_logs indexes
    await knex.schema.alterTable('activity_logs', (table) => {
        table.index('user_id', 'idx_activity_logs_user_id');
        table.index('timestamp', 'idx_activity_logs_timestamp');
        table.index(['user_id', 'timestamp'], 'idx_activity_logs_user_timestamp');
    });
    console.log('✅ activity_logs indexes added');

    // role_requests indexes
    await knex.schema.alterTable('role_requests', (table) => {
        table.index('user_id', 'idx_role_requests_user_id');
        table.index('status', 'idx_role_requests_status');
        table.index('requested_role_id', 'idx_role_requests_role_id');
    });
    console.log('✅ role_requests indexes added');

    // users indexes (for filtered queries)
    await knex.schema.alterTable('users', (table) => {
        table.index('is_active', 'idx_users_is_active');
        table.index('is_deleted', 'idx_users_is_deleted');
    });
    console.log('✅ users indexes added');

    // decks indexes
    await knex.schema.alterTable('decks', (table) => {
        table.index('decklist_url', 'idx_decks_decklist_url');
        table.index('platform', 'idx_decks_platform');
    });
    console.log('✅ decks indexes added');

    // leagues indexes
    await knex.schema.alterTable('leagues', (table) => {
        table.index('is_active', 'idx_leagues_is_active');
        table.index('start_date', 'idx_leagues_start_date');
        table.index('end_date', 'idx_leagues_end_date');
    });
    console.log('✅ leagues indexes added');

    console.log('🎉 All performance indexes added successfully');
};

exports.down = async function (knex) {
    console.log('📊 Removing performance indexes...');

    // game_pods indexes
    await knex.schema.alterTable('game_pods', (table) => {
        table.dropIndex([], 'idx_game_pods_league_id');
        table.dropIndex([], 'idx_game_pods_confirmation_status');
        table.dropIndex([], 'idx_game_pods_created_at');
        table.dropIndex([], 'idx_game_pods_league_status');
    });

    // game_players indexes
    await knex.schema.alterTable('game_players', (table) => {
        table.dropIndex([], 'idx_game_players_pod_id');
        table.dropIndex([], 'idx_game_players_player_id');
        table.dropIndex([], 'idx_game_players_result');
        table.dropIndex([], 'idx_game_players_player_result');
    });

    // user_leagues indexes
    await knex.schema.alterTable('user_leagues', (table) => {
        table.dropIndex([], 'idx_user_leagues_user_id');
        table.dropIndex([], 'idx_user_leagues_league_id');
    });

    // league_signup_requests indexes
    await knex.schema.alterTable('league_signup_requests', (table) => {
        table.dropIndex([], 'idx_league_signup_requests_user_id');
        table.dropIndex([], 'idx_league_signup_requests_league_id');
        table.dropIndex([], 'idx_league_signup_requests_status');
    });

    // activity_logs indexes
    await knex.schema.alterTable('activity_logs', (table) => {
        table.dropIndex([], 'idx_activity_logs_user_id');
        table.dropIndex([], 'idx_activity_logs_timestamp');
        table.dropIndex([], 'idx_activity_logs_user_timestamp');
    });

    // role_requests indexes
    await knex.schema.alterTable('role_requests', (table) => {
        table.dropIndex([], 'idx_role_requests_user_id');
        table.dropIndex([], 'idx_role_requests_status');
        table.dropIndex([], 'idx_role_requests_role_id');
    });

    // users indexes
    await knex.schema.alterTable('users', (table) => {
        table.dropIndex([], 'idx_users_is_active');
        table.dropIndex([], 'idx_users_is_deleted');
    });

    // decks indexes
    await knex.schema.alterTable('decks', (table) => {
        table.dropIndex([], 'idx_decks_decklist_url');
        table.dropIndex([], 'idx_decks_platform');
    });

    // leagues indexes
    await knex.schema.alterTable('leagues', (table) => {
        table.dropIndex([], 'idx_leagues_is_active');
        table.dropIndex([], 'idx_leagues_start_date');
        table.dropIndex([], 'idx_leagues_end_date');
    });

    console.log('✅ Performance indexes removed');
};
