/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> } 
 */
exports.seed = async function (knex) {
  await knex('win_conditions').del(); // Clear existing data

  await knex('win_conditions').insert([
    { name: 'Combat Damage', description: 'Winning by dealing lethal damage through attacking creatures.', category: 'Combat' },
    { name: 'Commander Damage', description: '21 points of combat damage from the same commander.', category: 'Combat' },
    { name: 'Poison Counters', description: 'Giving a player 10 poison counters (Infect/Toxic).', category: 'Combat' },
    { name: 'Deck Out (Mill)', description: 'Opponent attempts to draw from an empty library and loses.', category: 'Alternate' },
    { name: 'Laboratory Maniac', description: 'Win when drawing from an empty library.', category: 'Alternate' },
    { name: 'Revel in Riches', description: '10+ treasures at upkeep = win.', category: 'Alternate' },
    { name: 'Infinite Combo', description: 'Infinite damage, mill, life loss, or similar.', category: 'Combo' },
    { name: 'Lockout/Stax', description: 'Opponents cannot take meaningful game actions, leading to a win over time.', category: 'Combo' },
  ]);
};