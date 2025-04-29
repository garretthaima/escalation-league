/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> } 
 */
exports.seed = async function (knex) {
  await knex('leagues').del();

  await knex('leagues').insert({
    name: 'Test League',
    start_date: '2025-04-01',
    end_date: '2025-06-01',
    current_week: 1,
    weekly_budget: 100.0,
    is_active: 1,
    league_code: 'TEST123',
    description: 'A test league for development purposes.',
    max_players: 10,
  });

  console.log('Leagues seeded successfully!');
};