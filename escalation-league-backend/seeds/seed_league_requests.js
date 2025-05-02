/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> } 
 */
const { getLeagueId } = require('./helpers');

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.seed = async function (knex) {
  // Clear existing data in the league_signup_requests table
  await knex('league_signup_requests').del();

  // Fetch the league ID
  const leagueId = await getLeagueId(knex);

  // Fetch users not already in the league
  const usersNotInLeague = await knex('users')
    .leftJoin('user_leagues', function () {
      this.on('users.id', '=', 'user_leagues.user_id').andOn('user_leagues.league_id', '=', knex.raw('?', [leagueId]));
    })
    .whereNull('user_leagues.user_id') // Users not in the league
    .select('users.id');

  // Insert signup requests for these users
  const signupRequests = usersNotInLeague.map((user) => ({
    user_id: user.id,
    league_id: leagueId,
    status: 'pending',
  }));

  if (signupRequests.length > 0) {
    await knex('league_signup_requests').insert(signupRequests);
    console.log(`${signupRequests.length} league signup requests seeded successfully!`);
  } else {
    console.log('No users found to create signup requests.');
  }
};