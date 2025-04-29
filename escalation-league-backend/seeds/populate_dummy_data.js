exports.seed = async function (knex) {
  // Clear existing data
  await knex('game_players').del();
  await knex('games').del();
  await knex('game_pods').del();
  await knex('user_leagues').del();
  await knex('users').del();
  await knex('leagues').del();

  // Insert leagues
  const leagueId = await knex('leagues')
    .insert({
      name: 'Test League',
      start_date: '2025-04-01',
      end_date: '2025-06-01',
      current_week: 1,
      weekly_budget: 100.0,
      is_active: 1,
      league_code: 'TEST123',
      description: 'A test league for development purposes.',
      max_players: 10,
    })
    .then((id) => id[0]);

  // Insert users
  const userIds = await knex('users')
    .insert([
      { email: 'admin@escalationleague.com', firstname: 'Admin', lastname: 'User', role: 'admin' },
      { email: 'alice@example.com', firstname: 'Alice', lastname: 'Johnson', role: 'user' },
      { email: 'bob@example.com', firstname: 'John', lastname: 'Doe', role: 'user' },
      { email: 'charlie@example.com', firstname: 'Jane', lastname: 'Smith', role: 'user' },
      { email: 'david@example.com', firstname: 'David', lastname: 'Brown', role: 'user' },
      { email: 'eve@example.com', firstname: 'Eve', lastname: 'White', role: 'user' },
      { email: 'garretthaima@gmail.com', firstname: 'Garrett', lastname: 'Haima', role: 'user' },
    ])
    .then(() => knex('users').select('id').orderBy('id', 'asc'));

  const [userId1, userId2, userId3, userId4, userId5, userId6, userId7] = userIds.map((user) => user.id);

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

  // Insert game pods
  const podIds = await knex('game_pods')
    .insert([
      // Open Games
      { league_id: leagueId, creator_id: userId2, confirmation_status: 'open', result: null },
      { league_id: leagueId, creator_id: userId3, confirmation_status: 'open', result: null },

      // Active Games
      { league_id: leagueId, creator_id: userId4, confirmation_status: 'active', result: null },
      { league_id: leagueId, creator_id: userId5, confirmation_status: 'active', result: null },
      { league_id: leagueId, creator_id: userId6, confirmation_status: 'active', result: null },

      // Pending Games
      { league_id: leagueId, creator_id: userId7, confirmation_status: 'pending', result: 'win' },
      { league_id: leagueId, creator_id: userId2, confirmation_status: 'pending', result: 'win' },
      { league_id: leagueId, creator_id: userId3, confirmation_status: 'pending', result: 'draw' },

      // Completed Games
      { league_id: leagueId, creator_id: userId4, confirmation_status: 'complete', result: 'win' },
      { league_id: leagueId, creator_id: userId5, confirmation_status: 'complete', result: 'win' },
      { league_id: leagueId, creator_id: userId6, confirmation_status: 'complete', result: 'draw' },
    ])
    .then(() => knex('game_pods').select('id').orderBy('id', 'asc'));

  const [
    podId1,
    podId2,
    podId3,
    podId4,
    podId5,
    podId6,
    podId7,
    podId8,
    podId9,
    podId10,
    podId11,
    podId12,
  ] = podIds.map((pod) => pod.id);

  // Insert game players
  await knex('game_players').insert([
    // Open Games
    { pod_id: podId1, player_id: userId2, result: null, confirmed: 0 },
    { pod_id: podId1, player_id: userId3, result: null, confirmed: 0 },
    { pod_id: podId1, player_id: userId7, result: null, confirmed: 0 }, // Garrett added to this pod

    { pod_id: podId2, player_id: userId3, result: null, confirmed: 0 },
    { pod_id: podId2, player_id: userId4, result: null, confirmed: 0 },
    { pod_id: podId2, player_id: userId5, result: null, confirmed: 0 },

    // Active Games
    { pod_id: podId3, player_id: userId4, result: null, confirmed: 0 },
    { pod_id: podId3, player_id: userId5, result: null, confirmed: 0 },
    { pod_id: podId3, player_id: userId7, result: null, confirmed: 0 },

    { pod_id: podId4, player_id: userId2, result: null, confirmed: 0 },
    { pod_id: podId4, player_id: userId3, result: null, confirmed: 0 },
    { pod_id: podId4, player_id: userId4, result: null, confirmed: 0 },
    { pod_id: podId4, player_id: userId5, result: null, confirmed: 0 },

    { pod_id: podId5, player_id: userId6, result: null, confirmed: 0 },
    { pod_id: podId5, player_id: userId7, result: null, confirmed: 0 },
    { pod_id: podId5, player_id: userId2, result: null, confirmed: 0 },
    { pod_id: podId5, player_id: userId3, result: null, confirmed: 0 },

    // Pending Games
    { pod_id: podId6, player_id: userId7, result: 'win', confirmed: 1 },
    { pod_id: podId6, player_id: userId2, result: 'loss', confirmed: 1 },
    { pod_id: podId6, player_id: userId3, result: null, confirmed: 0 }, // Requires confirmation

    { pod_id: podId7, player_id: userId2, result: 'win', confirmed: 1 },
    { pod_id: podId7, player_id: userId4, result: 'loss', confirmed: 1 },
    { pod_id: podId7, player_id: userId5, result: null, confirmed: 0 }, // Requires confirmation

    { pod_id: podId8, player_id: userId3, result: 'draw', confirmed: 1 },
    { pod_id: podId8, player_id: userId6, result: 'draw', confirmed: 1 },
    { pod_id: podId8, player_id: userId7, result: null, confirmed: 0 }, // Requires confirmation

    // Completed Games

    // Pod 9
    { pod_id: podId9, player_id: userId4, result: 'win', confirmed: 1 },
    { pod_id: podId9, player_id: userId5, result: 'loss', confirmed: 1 },
    { pod_id: podId9, player_id: userId6, result: 'loss', confirmed: 1 },

    // Pod 10
    { pod_id: podId10, player_id: userId5, result: 'win', confirmed: 1 },
    { pod_id: podId10, player_id: userId6, result: 'loss', confirmed: 1 },
    { pod_id: podId10, player_id: userId7, result: 'loss', confirmed: 1 },

    // Pod 11
    { pod_id: podId11, player_id: userId6, result: 'draw', confirmed: 1 },
    { pod_id: podId11, player_id: userId7, result: 'draw', confirmed: 1 },
    { pod_id: podId11, player_id: userId2, result: 'draw', confirmed: 1 },
  ]);

  // Update users and user_leagues for completed games
  await knex('users').where({ id: userId4 }).increment('wins', 1); // Pod 9 winner
  await knex('users').where({ id: userId5 }).increment('wins', 1); // Pod 10 winner
  await knex('users').where({ id: userId6 }).increment('draws', 1); // Pod 11 draw
  await knex('users').where({ id: userId5 }).increment('losses', 1); // Pod 9 loser
  await knex('users').where({ id: userId6 }).increment('losses', 1); // Pod 9 loser
  await knex('users').where({ id: userId6 }).increment('losses', 1); // Pod 10 loser
  await knex('users').where({ id: userId7 }).increment('losses', 1); // Pod 10 loser
  await knex('users').where({ id: userId7 }).increment('draws', 1); // Pod 11 draw
  await knex('users').where({ id: userId2 }).increment('draws', 1); // Pod 11 draw

  await knex('user_leagues')
    .where({ user_id: userId4, league_id: leagueId })
    .increment('league_wins', 1); // Pod 9 winner
  await knex('user_leagues')
    .where({ user_id: userId5, league_id: leagueId })
    .increment('league_wins', 1); // Pod 10 winner
  await knex('user_leagues')
    .where({ user_id: userId6, league_id: leagueId })
    .increment('league_draws', 1); // Pod 11 draw
  await knex('user_leagues')
    .where({ user_id: userId5, league_id: leagueId })
    .increment('league_losses', 1); // Pod 9 loser
  await knex('user_leagues')
    .where({ user_id: userId6, league_id: leagueId })
    .increment('league_losses', 1); // Pod 9 loser
  await knex('user_leagues')
    .where({ user_id: userId6, league_id: leagueId })
    .increment('league_losses', 1); // Pod 10 loser
  await knex('user_leagues')
    .where({ user_id: userId7, league_id: leagueId })
    .increment('league_losses', 1); // Pod 10 loser
  await knex('user_leagues')
    .where({ user_id: userId7, league_id: leagueId })
    .increment('league_draws', 1); // Pod 11 draw
  await knex('user_leagues')
    .where({ user_id: userId2, league_id: leagueId })
    .increment('league_draws', 1); // Pod 11 draw

  console.log('Robust dummy data inserted successfully!');
};