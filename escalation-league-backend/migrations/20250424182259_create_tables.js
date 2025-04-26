exports.up = async function (knex) {
    // Drop tables if they exist
    await knex.schema.dropTableIfExists('game_players');
    await knex.schema.dropTableIfExists('games');
    await knex.schema.dropTableIfExists('leagues');
    await knex.schema.dropTableIfExists('users');

    // Create users table
    await knex.schema.createTable('users', (table) => {
        table.increments('id').primary();
        table.string('username').unique().notNullable();
        table.string('password').notNullable();
        table.integer('wins').defaultTo(0);
        table.integer('losses').defaultTo(0);
    });

    // Create games table
    await knex.schema.createTable('games', (table) => {
        table.increments('id').primary();
        table.integer('creator_id').unsigned().notNullable();
        table.enum('result', ['win', 'loss']).notNullable();
        table.date('date').notNullable();
        table.string('win_condition').notNullable();
        table.foreign('creator_id').references('users.id');
    });

    // Create game_players table
    await knex.schema.createTable('game_players', (table) => {
        table.increments('id').primary();
        table.integer('game_id').unsigned().notNullable();
        table.integer('player_id').unsigned().notNullable();
        table.boolean('confirmed').defaultTo(false);
        table.foreign('game_id').references('games.id');
        table.foreign('player_id').references('users.id');
    });

    // Create leagues table
    await knex.schema.createTable('leagues', (table) => {
        table.increments('id').primary();
        table.string('name').notNullable();
        table.date('start_date').notNullable();
        table.date('end_date').notNullable();
        table.integer('current_week').defaultTo(1);
        table.decimal('money_accumulated', 10, 2).defaultTo(0.00);
        table.boolean('is_active').defaultTo(false);
    });
};

exports.down = async function (knex) {
    // Drop tables in reverse order
    await knex.schema.dropTableIfExists('leagues');
    await knex.schema.dropTableIfExists('game_players');
    await knex.schema.dropTableIfExists('games');
    await knex.schema.dropTableIfExists('users');
};