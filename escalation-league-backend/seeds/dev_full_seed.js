const bcrypt = require('bcrypt');

/**
 * Complete development seed - clears and repopulates all test data
 * Includes your account (garretthaima@gmail.com) in test pods
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
  console.log('👥 Seeding users...');

  // Get role IDs
  const roles = await knex('roles').select('id', 'name');
  const roleMap = Object.fromEntries(roles.map((role) => [role.name, role.id]));

  const hashedPassword = await bcrypt.hash('password123', 10);

  // Insert your OAuth account + dummy users
  await knex('users').insert([
    {
      email: 'garretthaima@gmail.com',
      firstname: 'Garrett',
      lastname: 'Haima',
      role_id: roleMap['super_admin'],
      google_id: 'test_google_id'
    },
    { email: 'alice@example.com', firstname: 'Alice', lastname: 'Johnson', role_id: roleMap['league_user'], password: hashedPassword },
    { email: 'bob@example.com', firstname: 'Bob', lastname: 'Doe', role_id: roleMap['league_user'], password: hashedPassword },
    { email: 'charlie@example.com', firstname: 'Charlie', lastname: 'Smith', role_id: roleMap['league_user'], password: hashedPassword },
    { email: 'david@example.com', firstname: 'David', lastname: 'Brown', role_id: roleMap['league_user'], password: hashedPassword },
    { email: 'eve@example.com', firstname: 'Eve', lastname: 'White', role_id: roleMap['league_user'], password: hashedPassword },
    { email: 'frank@example.com', firstname: 'Frank', lastname: 'Green', role_id: roleMap['league_user'], password: hashedPassword },
    { email: 'grace@example.com', firstname: 'Grace', lastname: 'Blue', role_id: roleMap['league_user'], password: hashedPassword },
  ]);

  console.log('✓ Users seeded (8 total including garretthaima@gmail.com)');
  console.log('🏆 Seeding league...');

  const leagueId = await knex('leagues').insert({
    name: 'Test League',
    start_date: '2025-04-01',
    end_date: '2025-06-01',
    current_week: 1,
    weekly_budget: 100.0,
    is_active: 1,
    league_code: 'TEST123',
    description: 'A test league for development',
    max_players: 10,
  }).then(ids => ids[0]);

  console.log('✓ League seeded');
  console.log('📋 Enrolling users in league...');

  const users = await knex('users').select('id');
  const enrollments = users.map(user => ({
    user_id: user.id,
    league_id: leagueId,
    league_wins: 0,
    league_losses: 0,
    league_draws: 0,
  }));

  await knex('user_leagues').insert(enrollments);
  console.log(`✓ Enrolled ${users.length} users in league`);

  console.log('🎮 Seeding pods and games...');

  const userList = await knex('users').select('id', 'email').orderBy('id');
  const userMap = Object.fromEntries(userList.map(u => [u.email, u.id]));

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
    { league_id: leagueId, creator_id: garrettId, confirmation_status: 'open' },
    { league_id: leagueId, creator_id: aliceId, confirmation_status: 'open' },
    { league_id: leagueId, creator_id: garrettId, confirmation_status: 'active' },
    { league_id: leagueId, creator_id: bobId, confirmation_status: 'active' },
    { league_id: leagueId, creator_id: graceId, confirmation_status: 'pending' },
    { league_id: leagueId, creator_id: davidId, confirmation_status: 'pending' },
    { league_id: leagueId, creator_id: eveId, confirmation_status: 'complete' },
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

  // Update stats for completed games (Pod 7)
  await knex('users').where({ id: frankId }).increment('wins', 1);
  await knex('users').where({ id: charlieId }).increment('losses', 1);
  await knex('users').where({ id: bobId }).increment('losses', 1);

  await knex('user_leagues').where({ user_id: frankId, league_id: leagueId }).increment('league_wins', 1);
  await knex('user_leagues').where({ user_id: charlieId, league_id: leagueId }).increment('league_losses', 1);
  await knex('user_leagues').where({ user_id: bobId, league_id: leagueId }).increment('league_losses', 1);

  // Update stats for Pod 5 (pending - Grace and Alice already confirmed)
  await knex('users').where({ id: graceId }).increment('wins', 1);
  await knex('users').where({ id: aliceId }).increment('losses', 1);

  await knex('user_leagues').where({ user_id: graceId, league_id: leagueId }).increment('league_wins', 1);
  await knex('user_leagues').where({ user_id: aliceId, league_id: leagueId }).increment('league_losses', 1);

  console.log('✓ Pods and games seeded');
  console.log('');
  console.log('🎮 YOUR TEST SCENARIOS:');
  console.log('  Pod 1 (OPEN): You + Alice + Bob → TEST OVERRIDE BUTTON');
  console.log('  Pod 3 (ACTIVE): You + David + Eve → TEST "I WON!" BUTTON');
  console.log('  Pod 5 (PENDING): Grace won, you lost → TEST CONFIRM BUTTON');
  console.log('');
  console.log('✅ All development data seeded successfully!');
};
