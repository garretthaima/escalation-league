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

  // Insert your OAuth account + 11 dummy users (12 total)
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
    { email: 'henry@example.com', firstname: 'Henry', lastname: 'Red', role_id: roleMap['league_user'], password: hashedPassword },
    { email: 'iris@example.com', firstname: 'Iris', lastname: 'Yellow', role_id: roleMap['league_user'], password: hashedPassword },
    { email: 'jack@example.com', firstname: 'Jack', lastname: 'Orange', role_id: roleMap['league_user'], password: hashedPassword },
    { email: 'kate@example.com', firstname: 'Kate', lastname: 'Purple', role_id: roleMap['league_user'], password: hashedPassword },
  ]);

  console.log('✓ Users seeded (12 total including garretthaima@gmail.com)');

  console.log('�🏆 Seeding league...');

  const leagueId = await knex('leagues').insert({
    name: 'Test League',
    start_date: '2025-04-01',
    end_date: '2025-06-01',
    current_week: 8,
    weekly_budget: 100.0,
    is_active: 1,
    league_code: 'TEST123',
    description: 'A test league for development',
    max_players: 15,
    points_per_win: 4,
    points_per_loss: 1,
    points_per_draw: 1,
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
    total_points: 0,
    is_active: 1,
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
  const henryId = userMap['henry@example.com'];
  const irisId = userMap['iris@example.com'];
  const jackId = userMap['jack@example.com'];
  const kateId = userMap['kate@example.com'];

  const allPlayerIds = [garrettId, aliceId, bobId, charlieId, davidId, eveId, frankId, graceId, henryId, irisId, jackId, kateId];

  // Fetch league point settings
  const leagueSettings = await knex('leagues')
    .where({ id: leagueId })
    .select('points_per_win', 'points_per_loss', 'points_per_draw')
    .first();

  const winPoints = leagueSettings.points_per_win || 4;
  const lossPoints = leagueSettings.points_per_loss || 1;
  const drawPoints = leagueSettings.points_per_draw || 1;

  console.log('🎲 Generating ~140 completed games (35-50 games per player)...');

  // Helper to shuffle array
  const shuffle = (arr) => arr.sort(() => Math.random() - 0.5);

  // Helper to get random int
  const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

  // Generate ~140 completed pods
  const completedPods = [];
  const completedPlayers = [];

  for (let i = 0; i < 140; i++) {
    const podSize = Math.random() > 0.5 ? 3 : 4;
    const players = shuffle([...allPlayerIds]).slice(0, podSize);
    const winnerIndex = randInt(0, podSize - 1);

    completedPods.push({
      league_id: leagueId,
      creator_id: players[0],
      confirmation_status: 'complete',
      result: 'win'
    });

    // Store player data for this pod
    players.forEach((playerId, idx) => {
      completedPlayers.push({
        pod_index: i,
        player_id: playerId,
        result: idx === winnerIndex ? 'win' : 'loss',
        confirmed: 1,
        turn_order: idx + 1
      });
    });
  }

  // Insert completed pods
  const completedPodIds = await knex('game_pods').insert(completedPods).then(() =>
    knex('game_pods').select('id').where({ league_id: leagueId, confirmation_status: 'complete' }).orderBy('id')
  );

  // Map pod_index to actual pod_id
  completedPlayers.forEach((player, idx) => {
    player.pod_id = completedPodIds[player.pod_index].id;
    delete player.pod_index;
  });

  // Insert all completed players
  await knex('game_players').insert(completedPlayers);

  // Calculate stats for each player
  console.log('📊 Calculating player stats...');
  const playerStats = {};
  allPlayerIds.forEach(id => {
    playerStats[id] = { wins: 0, losses: 0, draws: 0, points: 0 };
  });

  completedPlayers.forEach(player => {
    if (player.result === 'win') {
      playerStats[player.player_id].wins++;
      playerStats[player.player_id].points += winPoints;
    } else if (player.result === 'loss') {
      playerStats[player.player_id].losses++;
      playerStats[player.player_id].points += lossPoints;
    } else if (player.result === 'draw') {
      playerStats[player.player_id].draws++;
      playerStats[player.player_id].points += drawPoints;
    }
  });

  // Update user stats
  for (const [playerId, stats] of Object.entries(playerStats)) {
    await knex('users').where({ id: playerId }).update({
      wins: stats.wins,
      losses: stats.losses,
      draws: stats.draws
    });

    await knex('user_leagues').where({ user_id: playerId, league_id: leagueId }).update({
      league_wins: stats.wins,
      league_losses: stats.losses,
      league_draws: stats.draws,
      total_points: stats.points
    });
  }

  // Create a few test pods for your account
  const testPods = await knex('game_pods').insert([
    { league_id: leagueId, creator_id: garrettId, confirmation_status: 'open' },      // Pod for override test
    { league_id: leagueId, creator_id: garrettId, confirmation_status: 'active' },    // Pod for "I won" test
    { league_id: leagueId, creator_id: aliceId, confirmation_status: 'pending' },     // Pod for confirm test
  ]).then(() => knex('game_pods').select('id').where({ league_id: leagueId }).whereIn('confirmation_status', ['open', 'active', 'pending']).orderBy('id'));

  const [openPod, activePod, pendingPod] = testPods.map(p => p.id);

  // Insert test game players
  await knex('game_players').insert([
    // OPEN pod - 3 players - TEST OVERRIDE
    { pod_id: openPod, player_id: garrettId, result: null, confirmed: 0, turn_order: 1 },
    { pod_id: openPod, player_id: aliceId, result: null, confirmed: 0, turn_order: 2 },
    { pod_id: openPod, player_id: bobId, result: null, confirmed: 0, turn_order: 3 },

    // ACTIVE pod - 3 players - TEST "I WON!"
    { pod_id: activePod, player_id: garrettId, result: null, confirmed: 0, turn_order: 1 },
    { pod_id: activePod, player_id: davidId, result: null, confirmed: 0, turn_order: 2 },
    { pod_id: activePod, player_id: eveId, result: null, confirmed: 0, turn_order: 3 },

    // PENDING pod - 4 players - Alice won, YOU NEED TO CONFIRM
    { pod_id: pendingPod, player_id: aliceId, result: 'win', confirmed: 1, turn_order: 1 },
    { pod_id: pendingPod, player_id: garrettId, result: 'loss', confirmed: 0, turn_order: 2 },
    { pod_id: pendingPod, player_id: charlieId, result: 'loss', confirmed: 1, turn_order: 3 },
    { pod_id: pendingPod, player_id: davidId, result: 'loss', confirmed: 1, turn_order: 4 },
  ]);

  console.log('✓ Pods and games seeded');
  console.log('');
  console.log('📈 SEASON STATS:');
  console.log(`  Total Games: ${completedPods.length + 3}`);
  console.log(`  Completed: ${completedPods.length}`);
  console.log(`  In Progress: 3 (for testing)`);
  console.log(`  Games per player: ~${Math.round(completedPlayers.length / 12)} on average`);
  console.log('');
  console.log('🎮 YOUR TEST SCENARIOS:');
  console.log('  OPEN pod: You + Alice + Bob → TEST OVERRIDE BUTTON');
  console.log('  ACTIVE pod: You + David + Eve → TEST "I WON!" BUTTON');
  console.log('  PENDING pod: Alice won, you lost → TEST CONFIRM BUTTON');
  console.log('');
  console.log('✅ All development data seeded successfully!');
};
