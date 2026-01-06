/**
 * Enroll all users in the test league
 */
exports.seed = async function (knex) {
  console.log('📋 Enrolling users in league...');

  const users = await knex('users').select('id');
  const league = await knex('leagues').first('id');

  const enrollments = users.map(user => ({
    user_id: user.id,
    league_id: league.id,
    league_wins: 0,
    league_losses: 0,
    league_draws: 0,
    total_points: 0,
  }));

  await knex('user_leagues').insert(enrollments);

  console.log(`✓ Enrolled ${users.length} users in league`);
};
