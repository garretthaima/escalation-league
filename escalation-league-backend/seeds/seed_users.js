/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> } 
 */
exports.seed = async function (knex) {
  await knex('users').del();
  const userIds = await getUserIds(knex);
  const leagueId = await getLeagueId(knex);

  const [userId1, userId2, userId3, userId4, userId5, userId6, userId7] = userIds;
  await knex('users').insert([
    { email: 'admin@escalationleague.com', firstname: 'Admin', lastname: 'User', role: 'admin' },
    { email: 'alice@example.com', firstname: 'Alice', lastname: 'Johnson', role: 'user' },
    { email: 'bob@example.com', firstname: 'John', lastname: 'Doe', role: 'user' },
    { email: 'charlie@example.com', firstname: 'Jane', lastname: 'Smith', role: 'user' },
    { email: 'david@example.com', firstname: 'David', lastname: 'Brown', role: 'user' },
    { email: 'eve@example.com', firstname: 'Eve', lastname: 'White', role: 'user' },
    { email: 'garretthaima@gmail.com', firstname: 'Garrett', lastname: 'Haima', role: 'user' },
  ]);

  // Associate users with the league
  await knex('user_leagues').insert([
    { user_id: userId1, league_id: leagueId, league_wins: 0, league_losses: 0 },
    { user_id: userId2, league_id: leagueId, league_wins: 0, league_losses: 0 },
    { user_id: userId3, league_id: leagueId, league_wins: 0, league_losses: 0 },
    { user_id: userId4, league_id: leagueId, league_wins: 0, league_losses: 0 },
    { user_id: userId5, league_id: leagueId, league_wins: 0, league_losses: 0 },
    { user_id: userId6, league_id: leagueId, league_wins: 0, league_losses: 0 },
    { user_id: userId7, league_id: leagueId, league_wins: 0, league_losses: 0 },
  ]);

  console.log('Users seeded successfully!');
};