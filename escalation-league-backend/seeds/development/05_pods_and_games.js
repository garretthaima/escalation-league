/**
 * Seed pods and games with comprehensive test scenarios
 * Includes your account (garretthaima@gmail.com) in open, active, and pending pods
 */
exports.seed = async function (knex) {
  console.log('🎮 Seeding pods and games...');

  const league = await knex('leagues').first('id');
  const users = await knex('users').select('id', 'email').orderBy('id');
  const userMap = Object.fromEntries(users.map(u => [u.email, u.id]));

  const garrettId = userMap['garretthaima@gmail.com'];
  const aliceId = userMap['alice@example.com'];
  const bobId = userMap['bob@example.com'];
  const charlieId = userMap['charlie@example.com'];
  const davidId = userMap['david@example.com'];
  const eveId = userMap['eve@example.com'];
  const frankId = userMap['frank@example.com'];
  const graceId = userMap['grace@example.com'];

  // Create pods
  const podIds = await knex('game_pods').insert([
    { league_id: league.id, creator_id: garrettId, confirmation_status: 'open' },      // Pod 1: Your open pod
    { league_id: league.id, creator_id: aliceId, confirmation_status: 'open' },        // Pod 2: Other open
    { league_id: league.id, creator_id: garrettId, confirmation_status: 'active' },    // Pod 3: Your active pod
    { league_id: league.id, creator_id: bobId, confirmation_status: 'active' },        // Pod 4: Other active
    { league_id: league.id, creator_id: graceId, confirmation_status: 'pending' },     // Pod 5: Your pending pod
    { league_id: league.id, creator_id: davidId, confirmation_status: 'pending' },     // Pod 6: Other pending
    { league_id: league.id, creator_id: eveId, confirmation_status: 'complete' },      // Pod 7: Complete
  ]).then(() => knex('game_pods').select('id').orderBy('id'));

  const [pod1, pod2, pod3, pod4, pod5, pod6, pod7] = podIds.map(p => p.id);

  // Insert game players
  await knex('game_players').insert([
    // Pod 1: OPEN - 3 players - YOUR POD - TEST OVERRIDE
    { pod_id: pod1, player_id: garrettId, result: null, confirmed: 0, turn_order: 1 },
    { pod_id: pod1, player_id: aliceId, result: null, confirmed: 0, turn_order: 2 },
    { pod_id: pod1, player_id: bobId, result: null, confirmed: 0, turn_order: 3 },

    // Pod 2: OPEN - 2 players
    { pod_id: pod2, player_id: aliceId, result: null, confirmed: 0, turn_order: 1 },
    { pod_id: pod2, player_id: charlieId, result: null, confirmed: 0, turn_order: 2 },

    // Pod 3: ACTIVE - 3 players - YOUR POD - TEST "I WON!"
    { pod_id: pod3, player_id: garrettId, result: null, confirmed: 0, turn_order: 1 },
    { pod_id: pod3, player_id: davidId, result: null, confirmed: 0, turn_order: 2 },
    { pod_id: pod3, player_id: eveId, result: null, confirmed: 0, turn_order: 3 },

    // Pod 4: ACTIVE - 4 players
    { pod_id: pod4, player_id: bobId, result: null, confirmed: 0, turn_order: 1 },
    { pod_id: pod4, player_id: frankId, result: null, confirmed: 0, turn_order: 2 },
    { pod_id: pod4, player_id: graceId, result: null, confirmed: 0, turn_order: 3 },
    { pod_id: pod4, player_id: charlieId, result: null, confirmed: 0, turn_order: 4 },

    // Pod 5: PENDING - 3 players - Grace won, YOU NEED TO CONFIRM - TEST CONFIRM
    { pod_id: pod5, player_id: graceId, result: 'win', confirmed: 1, turn_order: 1 },
    { pod_id: pod5, player_id: aliceId, result: 'loss', confirmed: 1, turn_order: 2 },
    { pod_id: pod5, player_id: garrettId, result: 'loss', confirmed: 0, turn_order: 3 },

    // Pod 6: PENDING - 4 players - Alice won, Eve hasn't confirmed
    { pod_id: pod6, player_id: aliceId, result: 'win', confirmed: 1, turn_order: 1 },
    { pod_id: pod6, player_id: davidId, result: 'loss', confirmed: 1, turn_order: 2 },
    { pod_id: pod6, player_id: bobId, result: 'loss', confirmed: 1, turn_order: 3 },
    { pod_id: pod6, player_id: eveId, result: 'loss', confirmed: 0, turn_order: 4 },

    // Pod 7: COMPLETE - 3 players - Frank won
    { pod_id: pod7, player_id: frankId, result: 'win', confirmed: 1, turn_order: 1 },
    { pod_id: pod7, player_id: charlieId, result: 'loss', confirmed: 1, turn_order: 2 },
    { pod_id: pod7, player_id: bobId, result: 'loss', confirmed: 1, turn_order: 3 },
  ]);

  // Update stats for completed games
  // Fetch league point settings (default: win=4, loss=1, draw=1)
  const leagueSettings = await knex('leagues')
    .where({ id: league.id })
    .select('points_per_win', 'points_per_loss', 'points_per_draw')
    .first();

  const winPoints = leagueSettings.points_per_win || 4;
  const lossPoints = leagueSettings.points_per_loss || 1;

  await knex('users').where({ id: frankId }).increment('wins', 1);
  await knex('users').where({ id: charlieId }).increment('losses', 1);
  await knex('users').where({ id: bobId }).increment('losses', 1);

  await knex('user_leagues').where({ user_id: frankId, league_id: league.id }).increment({
    league_wins: 1,
    total_points: winPoints
  });
  await knex('user_leagues').where({ user_id: charlieId, league_id: league.id }).increment({
    league_losses: 1,
    total_points: lossPoints
  });
  await knex('user_leagues').where({ user_id: bobId, league_id: league.id }).increment({
    league_losses: 1,
    total_points: lossPoints
  });

  console.log('✓ Pods and games seeded');
  console.log('');
  console.log('�� YOUR TEST SCENARIOS:');
  console.log('  Pod 1 (OPEN): You + Alice + Bob → TEST OVERRIDE BUTTON');
  console.log('  Pod 3 (ACTIVE): You + David + Eve → TEST "I WON!" BUTTON');
  console.log('  Pod 5 (PENDING): Grace won, you lost → TEST CONFIRM BUTTON');
};
