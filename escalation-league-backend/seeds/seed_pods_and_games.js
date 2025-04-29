/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> } 
 */
const { getUserIds, getLeagueId } = require('./helpers');

exports.seed = async function (knex) {
  await knex('game_pods').del();
  await knex('game_players').del();

  const userIds = await getUserIds(knex);
  const leagueId = await getLeagueId(knex);

  const [userId1, userId2, userId3, userId4, userId5, userId6, userId7] = userIds;

  // Fetch win_condition_ids
  const winConditions = await knex('win_conditions').select('id', 'name');
  const winConditionMap = Object.fromEntries(winConditions.map((wc) => [wc.name, wc.id]));

  // Insert game pods
  const podIds = await knex('game_pods')
    .insert([
      // Open Games
      { league_id: leagueId, creator_id: userId2, confirmation_status: 'open', result: null, win_condition_id: null },
      { league_id: leagueId, creator_id: userId3, confirmation_status: 'open', result: null, win_condition_id: null },

      // Active Games
      { league_id: leagueId, creator_id: userId4, confirmation_status: 'active', result: null, win_condition_id: null },
      { league_id: leagueId, creator_id: userId5, confirmation_status: 'active', result: null, win_condition_id: null },
      { league_id: leagueId, creator_id: userId6, confirmation_status: 'active', result: null, win_condition_id: null },

      // Pending Games
      { league_id: leagueId, creator_id: userId7, confirmation_status: 'pending', result: 'win', win_condition_id: null },
      { league_id: leagueId, creator_id: userId2, confirmation_status: 'pending', result: 'win', win_condition_id: null },
      { league_id: leagueId, creator_id: userId3, confirmation_status: 'pending', result: 'draw', win_condition_id: null },

      // Completed Games
      { league_id: leagueId, creator_id: userId4, confirmation_status: 'complete', result: 'win', win_condition_id: winConditionMap['Combat Damage'] },
      { league_id: leagueId, creator_id: userId5, confirmation_status: 'complete', result: 'win', win_condition_id: winConditionMap['Commander Damage'] },
      { league_id: leagueId, creator_id: userId6, confirmation_status: 'complete', result: 'draw', win_condition_id: null }, // Ensure null for draw
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
    { pod_id: podId9, player_id: userId4, result: 'win', confirmed: 1 },
    { pod_id: podId9, player_id: userId5, result: 'loss', confirmed: 1 },
    { pod_id: podId9, player_id: userId6, result: 'loss', confirmed: 1 },

    { pod_id: podId10, player_id: userId5, result: 'win', confirmed: 1 },
    { pod_id: podId10, player_id: userId6, result: 'loss', confirmed: 1 },
    { pod_id: podId10, player_id: userId7, result: 'loss', confirmed: 1 },

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

  console.log('Game pods, players, and user stats seeded successfully!');
};