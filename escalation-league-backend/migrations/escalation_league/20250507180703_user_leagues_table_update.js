exports.up = function (knex) {
    return knex.schema.table('user_leagues', (table) => {
        table.integer('total_points').defaultTo(0); // Total points
        table.integer('matches_played').defaultTo(0); // Matches played
        table.boolean('is_active').defaultTo(true); // Active status
        table.timestamp('last_updated').defaultTo(knex.fn.now()); // Last updated timestamp
        table.integer('rank').nullable(); // Rank
        table.boolean('disqualified').defaultTo(false); // Disqualification status
        table.boolean('finals_qualified').defaultTo(false); // Qualified for finals status
        table.string('league_role', 50).defaultTo('player'); // Role in the league
    });
};

exports.down = function (knex) {
    return knex.schema.table('user_leagues', (table) => {
        table.dropColumn('total_points');
        table.dropColumn('matches_played');
        table.dropColumn('is_active');
        table.dropColumn('last_updated');
        table.dropColumn('rank');
        table.dropColumn('disqualified');
        table.dropColumn('finals_qualified');
        table.dropColumn('league_role');
    });
};