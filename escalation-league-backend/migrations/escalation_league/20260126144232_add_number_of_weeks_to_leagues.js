/**
 * Add number_of_weeks column to leagues table
 * This stores the league duration in weeks, which was previously
 * only used to calculate end_date but never persisted
 */
exports.up = async function (knex) {
    await knex.schema.alterTable('leagues', (table) => {
        table.integer('number_of_weeks').nullable();
    });

    // Backfill existing leagues by calculating weeks from dates
    const leagues = await knex('leagues').select('id', 'start_date', 'end_date');
    for (const league of leagues) {
        if (league.start_date && league.end_date) {
            const start = new Date(league.start_date);
            const end = new Date(league.end_date);
            const diffMs = end - start;
            const diffDays = diffMs / (1000 * 60 * 60 * 24);
            const weeks = Math.ceil(diffDays / 7);
            await knex('leagues').where('id', league.id).update({ number_of_weeks: weeks });
        }
    }
};

exports.down = async function (knex) {
    await knex.schema.alterTable('leagues', (table) => {
        table.dropColumn('number_of_weeks');
    });
};
