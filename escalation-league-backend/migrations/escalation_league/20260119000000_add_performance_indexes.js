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
        table.index('status', 'idx_user_leagues_status');
        table.index(['league_id', 'status'], 'idx_user_leagues_league_status');
    });
    console.log('✅ user_leagues indexes added');

    // league_signup_requests indexes
    await knex.schema.alterTable('league_signup_requests', (table) => {
        table.index('user_id', 'idx_league_signup_requests_user_id');
        table.index('league_id', 'idx_league_signup_requests_league_id');
        table.index('status', 'idx_league_signup_requests_status');
    });
    console.log('✅ league_signup_requests indexes added');

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
        table.dropIndex([], 'idx_user_leagues_status');
        table.dropIndex([], 'idx_user_leagues_league_status');
    });

    // league_signup_requests indexes
    await knex.schema.alterTable('league_signup_requests', (table) => {
        table.dropIndex([], 'idx_league_signup_requests_user_id');
        table.dropIndex([], 'idx_league_signup_requests_league_id');
        table.dropIndex([], 'idx_league_signup_requests_status');
    });

    console.log('✅ Performance indexes removed');
};
