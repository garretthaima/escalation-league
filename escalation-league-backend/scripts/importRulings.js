const fs = require('fs');
const knex = require('knex')(require('../knexfile.js').scryfall);

const importRulings = async () => {
    try {
        // Read and parse the Rulings JSON file
        const data = JSON.parse(fs.readFileSync('rulings.json', 'utf8'));

        // Counters for tracking operations
        let insertedCount = 0;
        let updatedCount = 0;

        // Iterate over each ruling
        for (const ruling of data) {
            // Insert or update the ruling in the database
            const result = await knex('rulings')
                .insert({
                    oracle_id: ruling.oracle_id,
                    published_at: ruling.published_at,
                    comment: ruling.comment,
                })
                .onConflict(['oracle_id', 'published_at', 'comment']) // Prevent duplicate rulings
                .merge();

            // Track insert or update
            if (result.rowCount === 1) {
                insertedCount++;
            } else {
                updatedCount++;
            }
        }

        // Log the results
        console.log(`Inserted ${insertedCount} new rulings.`);
        console.log(`Updated ${updatedCount} existing rulings.`);
        console.log('Rulings imported successfully!');
    } catch (error) {
        console.error('Error importing rulings:', error);
    } finally {
        knex.destroy();
    }
};

importRulings();