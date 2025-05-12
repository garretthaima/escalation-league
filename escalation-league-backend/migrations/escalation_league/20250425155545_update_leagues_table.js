exports.up = async function (knex) {
    // Step 1: Rename column and add new columns
    const hasColumn = await knex.schema.hasColumn('leagues', 'money_accumulated');
    if (hasColumn) {
        await knex.schema.alterTable('leagues', (table) => {
            table.renameColumn('money_accumulated', 'weekly_budget');
        });
    }

    await knex.schema.alterTable('leagues', (table) => {
        // Add new columns
        table.string('league_code'); // Add league_code without unique constraint initially
        table.text('description');
        table.integer('max_players');
        table.timestamp('created_at').defaultTo(knex.fn.now());
    });

    // Step 2: Populate league_code with unique values for existing rows
    const leagues = await knex('leagues').select('id', 'name');
    for (const league of leagues) {
        const uniqueCode = league.name.replace(/\s+/g, '_').toUpperCase() + '_' + league.id;
        await knex('leagues')
            .where({ id: league.id })
            .update({ league_code: uniqueCode });
    }

    // Step 3: Add unique constraint to league_code
    await knex.schema.alterTable('leagues', (table) => {
        table.unique(['league_code']);
    });
};

exports.down = async function (knex) {
    // Step 1: Drop unique constraint and columns
    await knex.schema.alterTable('leagues', (table) => {
        table.dropUnique(['league_code']);
        table.dropColumn('league_code');
        table.dropColumn('description');
        table.dropColumn('max_players');
        table.dropColumn('created_at');
    });

    // Step 2: Rename weekly_budget back to money_accumulated if it exists
    const hasColumn = await knex.schema.hasColumn('leagues', 'weekly_budget');
    if (hasColumn) {
        await knex.schema.alterTable('leagues', (table) => {
            table.renameColumn('weekly_budget', 'money_accumulated');
        });
    }
};