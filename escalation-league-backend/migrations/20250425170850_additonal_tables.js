exports.up = async function (knex) {
    // Update the game_players table to add turn_order
    await knex.schema.alterTable('game_players', (table) => {
        table.integer('turn_order').nullable(); // Add turn_order column
    });

    // Create the awards table
    await knex.schema.createTable('awards', (table) => {
        table.increments('id').primary(); // Primary key
        table.string('name').notNullable(); // Award name
        table.text('description').nullable(); // Award description
    });

    // Create the user_awards table
    await knex.schema.createTable('user_awards', (table) => {
        table.increments('id').primary(); // Primary key
        table.integer('league_id').unsigned().notNullable().references('id').inTable('leagues').onDelete('CASCADE'); // Foreign key to leagues
        table.integer('user_id').unsigned().notNullable().references('id').inTable('users').onDelete('CASCADE'); // Foreign key to users
        table.integer('award_id').unsigned().notNullable().references('id').inTable('awards').onDelete('CASCADE'); // Foreign key to awards
        table.timestamp('awarded_at').defaultTo(knex.fn.now()); // Timestamp for when the award was given
    });

    // Add decklist_url column to the user_leagues table
    await knex.schema.alterTable('user_leagues', (table) => {
        table.string('decklist_url').nullable(); // Add decklist URL column
    });
};

exports.down = async function (knex) {
    // Drop the user_awards table
    await knex.schema.dropTableIfExists('user_awards');

    // Drop the awards table
    await knex.schema.dropTableIfExists('awards');

    // Remove the turn_order column from the game_players table
    await knex.schema.alterTable('game_players', (table) => {
        table.dropColumn('turn_order');
    });

    // Remove the decklist_url column from the user_leagues table
    await knex.schema.alterTable('user_leagues', (table) => {
        table.dropColumn('decklist_url');
    });

    // Revert the games table result ENUM to remove 'draw'
    await knex.schema.raw(`
        ALTER TABLE games MODIFY result ENUM('win', 'loss') NOT NULL;
    `);
};