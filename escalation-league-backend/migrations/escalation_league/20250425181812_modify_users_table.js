exports.up = async function (knex) {
    // Remove the current_league_wins and current_league_losses columns
    await knex.schema.alterTable('users', (table) => {
        table.dropColumn('current_league_wins');
        table.dropColumn('current_league_losses');
    });
};

exports.down = async function (knex) {
    // Add the current_league_wins and current_league_losses columns back
    await knex.schema.alterTable('users', (table) => {
        table.integer('current_league_wins').defaultTo(0);
        table.integer('current_league_losses').defaultTo(0);
    });
};