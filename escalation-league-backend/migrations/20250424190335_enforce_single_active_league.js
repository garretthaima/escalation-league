exports.up = async function (knex) {
    console.log('Running migration on database:', await knex.raw('SELECT DATABASE()'));

    const activeLeagues = await knex('leagues').where('is_active', true);
    console.log('Active leagues:', activeLeagues);

    if (activeLeagues.length > 1) {
        await knex('leagues')
            .where('id', '!=', activeLeagues[0].id)
            .update({ is_active: false });
    }

    await knex('leagues')
        .where('is_active', false)
        .update({ is_active: null });

    // Check if the unique constraint already exists
    const [existingConstraints] = await knex.raw(`
        SELECT CONSTRAINT_NAME
        FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
        WHERE TABLE_NAME = 'leagues' AND CONSTRAINT_NAME = 'unique_active_league';
    `);

    if (existingConstraints.length === 0) {
        // Add the unique constraint if it doesn't exist
        await knex.schema.alterTable('leagues', (table) => {
            table.unique('is_active', 'unique_active_league');
        });
    } else {
        console.log('Unique constraint "unique_active_league" already exists.');
    }

    await knex('leagues')
        .whereNull('is_active')
        .update({ is_active: false });
};

exports.down = async function (knex) {
    await knex.schema.alterTable('leagues', (table) => {
        table.dropUnique('is_active', 'unique_active_league');
    });
};