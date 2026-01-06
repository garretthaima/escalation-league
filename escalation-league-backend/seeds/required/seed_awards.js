/**
 * Seed awards - Required seed data
 */
exports.seed = async function (knex) {
    console.log('🏅 Seeding awards...');

    // Check if awards already exist
    const existingAwards = await knex('awards').select('id');

    if (existingAwards.length === 0) {
        await knex('awards').insert([
            { id: 1, name: 'League Winner', description: '1st place in the league' },
            { id: 2, name: 'Finished Top 4', description: 'Finished in the top 4 of the league' },
            { id: 3, name: 'MVP', description: 'Most Valuable Player of the season' },
            { id: 4, name: 'Highest Win Rate', description: 'Player with the highest win percentage' },
            { id: 5, name: 'Most Annoying Deck', description: 'The deck everyone loves to hate' },
        ]);
        console.log('✓ Awards seeded');
    } else {
        console.log('✓ Awards already exist, skipping');
    }
};
