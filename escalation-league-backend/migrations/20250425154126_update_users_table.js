exports.up = async function (knex) {
    // Alter the users table to add the email column first
    await knex.schema.alterTable('users', (table) => {
        table.string('email').unique().notNullable().defaultTo('');
    });

    // Populate email column with unique placeholder values if empty or NULL
    await knex('users')
        .whereNull('email')
        .orWhere('email', '')
        .update({
            email: knex.raw("CONCAT('placeholder_', id, '@example.com')")
        });

    // Alter the users table to add other columns
    return knex.schema.alterTable('users', (table) => {
        table.string('firstname');
        table.string('lastname');
        table.string('picture');
        table.integer('current_league_wins').defaultTo(0);
        table.integer('current_league_losses').defaultTo(0);
        table.integer('winning_streak').defaultTo(0);
        table.integer('losing_streak').defaultTo(0);
        table.string('current_commander');
        table.text('past_commanders');
        table.decimal('opponent_win_percentage', 5, 2).defaultTo(0.0);
        table.string('most_common_win_condition');
        table.string('favorite_color');
        table.string('deck_archetype');
        table.timestamp('last_login');
        table.boolean('is_active').defaultTo(true);
        table.boolean('is_banned').defaultTo(false);
        table.text('ban_reason');
    }).then(() => {
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

exports.down = async function (knex) {
    // Drop the user_leagues table if it exists
    await knex.schema.dropTableIfExists('user_leagues');

    // Check for column existence and drop them outside the alterTable callback
    const columnsToDrop = [
        'email',
        'firstname',
        'lastname',
        'picture',
        'current_league_wins',
        'current_league_losses',
        'winning_streak',
        'losing_streak',
        'current_commander',
        'past_commanders',
        'opponent_win_percentage',
        'most_common_win_condition',
        'favorite_color',
        'deck_archetype',
        'last_login',
        'is_active',
        'is_banned',
        'ban_reason',
    ];

    for (const column of columnsToDrop) {
        const exists = await knex.schema.hasColumn('users', column);
        if (exists) {
            await knex.schema.alterTable('users', (table) => {
                table.dropColumn(column);
            });
        }
    }
};