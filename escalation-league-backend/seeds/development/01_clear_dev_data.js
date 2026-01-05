/**
 * Clear all development data (users, leagues, pods, games)
 * Keeps required data (roles, permissions, settings, win_conditions)
 */
exports.seed = async function (knex) {
  console.log('🗑️  Clearing development data...');
  
  await knex.raw('SET FOREIGN_KEY_CHECKS = 0');
  await knex.raw('TRUNCATE TABLE game_players');
  await knex.raw('TRUNCATE TABLE game_pods');
  await knex.raw('TRUNCATE TABLE user_leagues');
  await knex.raw('TRUNCATE TABLE users');
  await knex.raw('TRUNCATE TABLE leagues');
  await knex.raw('SET FOREIGN_KEY_CHECKS = 1');
  
  console.log('✓ Development data cleared');
};
