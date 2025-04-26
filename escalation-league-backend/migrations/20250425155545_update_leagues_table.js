exports.up = async function (knex) {
    // Step 1: Add columns without constraints
    await knex.schema.alterTable('leagues', async (table) => {
        // Rename money_accumulated to weekly_budget if it exists
        const hasMoneyAccumulated = await knex.schema.hasColumn('leagues', 'money_accumulated');
        if (hasMoneyAccumulated) {
            table.renameColumn('money_accumulated', 'weekly_budget');
        }

        // Add new columns if they don't already exist
        const hasLeagueCode = await knex.schema.hasColumn('leagues', 'league_code');
        if (!hasLeagueCode) {
            table.string('league_code'); // Add league_code without unique constraint initially
        }

        const hasDescription = await knex.schema.hasColumn('leagues', 'description');
        if (!hasDescription) {
            table.text('description');
        }

        const hasMaxPlayers = await knex.schema.hasColumn('leagues', 'max_players');
        if (!hasMaxPlayers) {
            table.integer('max_players');
        }

        const hasCreatedAt = await knex.schema.hasColumn('leagues', 'created_at');
        if (!hasCreatedAt) {
            table.timestamp('created_at').defaultTo(knex.fn.now());
        }
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
    await knex.schema.alterTable('leagues', async (table) => {
        // Revert changes
        const hasWeeklyBudget = await knex.schema.hasColumn('leagues', 'weekly_budget');
        if (hasWeeklyBudget) {
            table.renameColumn('weekly_budget', 'money_accumulated');
        }

        const hasLeagueCode = await knex.schema.hasColumn('leagues', 'league_code');
        if (hasLeagueCode) {
            table.dropColumn('league_code');
        }

        const hasDescription = await knex.schema.hasColumn('leagues', 'description');
        if (hasDescription) {
            table.dropColumn('description');
        }

        const hasMaxPlayers = await knex.schema.hasColumn('leagues', 'max_players');
        if (hasMaxPlayers) {
            table.dropColumn('max_players');
        }

        const hasCreatedAt = await knex.schema.hasColumn('leagues', 'created_at');
        if (hasCreatedAt) {
            table.dropColumn('created_at');
        }
    });
};