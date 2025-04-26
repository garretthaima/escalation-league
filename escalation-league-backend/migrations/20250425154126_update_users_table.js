exports.up = async function (knex) {
    // Populate email column with unique placeholder values if empty or NULL
    await knex('users')
        .whereNull('email')
        .orWhere('email', '')
        .update({
            email: knex.raw("CONCAT('placeholder_', id, '@example.com')")
        });

    // Alter the users table
    return knex.schema.alterTable('users', async (table) => {
        const hasFirstname = await knex.schema.hasColumn('users', 'firstname');
        const hasLastname = await knex.schema.hasColumn('users', 'lastname');
        const hasPicture = await knex.schema.hasColumn('users', 'picture');
        const hasCurrentLeagueWins = await knex.schema.hasColumn('users', 'current_league_wins');
        const hasCurrentLeagueLosses = await knex.schema.hasColumn('users', 'current_league_losses');
        const hasWinningStreak = await knex.schema.hasColumn('users', 'winning_streak');
        const hasLosingStreak = await knex.schema.hasColumn('users', 'losing_streak');
        const hasCurrentCommander = await knex.schema.hasColumn('users', 'current_commander');
        const hasPastCommanders = await knex.schema.hasColumn('users', 'past_commanders');
        const hasOpponentWinPercentage = await knex.schema.hasColumn('users', 'opponent_win_percentage');
        const hasMostCommonWinCondition = await knex.schema.hasColumn('users', 'most_common_win_condition');
        const hasFavoriteColor = await knex.schema.hasColumn('users', 'favorite_color');
        const hasDeckArchetype = await knex.schema.hasColumn('users', 'deck_archetype');
        const hasLastLogin = await knex.schema.hasColumn('users', 'last_login');
        const hasIsActive = await knex.schema.hasColumn('users', 'is_active');
        const hasIsBanned = await knex.schema.hasColumn('users', 'is_banned');
        const hasBanReason = await knex.schema.hasColumn('users', 'ban_reason');

        if (!hasFirstname) table.string('firstname');
        if (!hasLastname) table.string('lastname');
        if (!hasPicture) table.string('picture');
        if (!hasCurrentLeagueWins) table.integer('current_league_wins').defaultTo(0);
        if (!hasCurrentLeagueLosses) table.integer('current_league_losses').defaultTo(0);
        if (!hasWinningStreak) table.integer('winning_streak').defaultTo(0);
        if (!hasLosingStreak) table.integer('losing_streak').defaultTo(0);
        if (!hasCurrentCommander) table.string('current_commander');
        if (!hasPastCommanders) table.text('past_commanders');
        if (!hasOpponentWinPercentage) table.decimal('opponent_win_percentage', 5, 2).defaultTo(0.0);
        if (!hasMostCommonWinCondition) table.string('most_common_win_condition');
        if (!hasFavoriteColor) table.string('favorite_color');
        if (!hasDeckArchetype) table.string('deck_archetype');
        if (!hasLastLogin) table.timestamp('last_login');
        if (!hasIsActive) table.boolean('is_active').defaultTo(true);
        if (!hasIsBanned) table.boolean('is_banned').defaultTo(false);
        if (!hasBanReason) table.text('ban_reason');
    })
        .then(() => {
            return knex.schema.createTable('user_leagues', (table) => {
                table.increments('id').primary();
                table.integer('user_id').unsigned().notNullable().references('id').inTable('users').onDelete('CASCADE');
                table.integer('league_id').unsigned().notNullable().references('id').inTable('leagues').onDelete('CASCADE');
                table.integer('league_wins').defaultTo(0);
                table.integer('league_losses').defaultTo(0);
                table.string('current_commander');
                table.timestamp('joined_at').defaultTo(knex.fn.now());
            });
        });
};

exports.down = function (knex) {
    return knex.schema
        .dropTableIfExists('user_leagues')
        .then(() => {
            return knex.schema.alterTable('users', (table) => {
                table.string('username'); // Re-add the username column
                table.dropColumn('email');
                table.dropColumn('google_id');
                table.dropColumn('firstname');
                table.dropColumn('lastname');
                table.dropColumn('picture');
                table.dropColumn('current_league_wins');
                table.dropColumn('current_league_losses');
                table.dropColumn('winning_streak');
                table.dropColumn('losing_streak');
                table.dropColumn('current_commander');
                table.dropColumn('past_commanders');
                table.dropColumn('opponent_win_percentage');
                table.dropColumn('most_common_win_condition');
                table.dropColumn('favorite_color');
                table.dropColumn('deck_archetype');
                table.dropColumn('last_login');
                table.dropColumn('is_active');
                table.dropColumn('is_banned');
                table.dropColumn('ban_reason');
            });
        });
};