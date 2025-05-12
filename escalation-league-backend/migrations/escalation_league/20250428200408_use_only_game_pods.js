exports.up = async function (knex) {
    // Remove the foreign key constraint from `game_players`
    await knex.schema.alterTable('game_players', (table) => {
        table.dropForeign('game_id'); // Drop the foreign key constraint
        table.dropColumn('game_id'); // Optionally drop the `game_id` column if it's no longer needed
    });

    // Drop the `games` table
    await knex.schema.dropTableIfExists('games');

    // Create `win_conditions` table
    await knex.schema.createTable('win_conditions', (table) => {
        table.increments('id').primary();
        table.string('name').notNullable();
        table.text('description').nullable();
        table.enum('category', ['Combat', 'Alternate', 'Combo', 'Other']).defaultTo('Other');
        table.string('scryfall_card_id').nullable();
        table.timestamps(true, true);
    });

    // Add `win_condition_id` to `game_pods`
    await knex.schema.alterTable('game_pods', (table) => {
        table.integer('win_condition_id').unsigned().nullable();
        table.foreign('win_condition_id').references('id').inTable('win_conditions').onDelete('SET NULL');
    });
};

exports.down = async function (knex) {
    // Remove `win_condition_id` from `game_pods`
    await knex.schema.alterTable('game_pods', (table) => {
        table.dropForeign('win_condition_id');
        table.dropColumn('win_condition_id');
    });

    // Drop `win_conditions` table
    await knex.schema.dropTableIfExists('win_conditions');

    // Recreate the `games` table
    await knex.schema.createTable('games', (table) => {
        table.increments('id').primary();
        table.integer('pod_id').unsigned().notNullable();
        table.integer('creator_id').unsigned().notNullable();
        table.enum('result', ['win', 'loss', 'draw']).notNullable();
        table.date('date').notNullable();
        table.string('win_condition').notNullable();
        table.integer('league_id').unsigned().notNullable().defaultTo(1);
        table.timestamp('deleted_at').nullable();
        table.foreign('pod_id').references('id').inTable('game_pods').onDelete('CASCADE');
        table.foreign('creator_id').references('id').inTable('users');
        table.foreign('league_id').references('id').inTable('leagues');
    });

    // Re-add the `game_id` column and foreign key to `game_players`
    await knex.schema.alterTable('game_players', (table) => {
        table.integer('game_id').unsigned().nullable();
        table.foreign('game_id').references('id').inTable('games').onDelete('CASCADE');
    });
};