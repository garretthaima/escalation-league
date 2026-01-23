/**
 * Migration: Add ELO Rating System
 *
 * Adds ELO rating columns for both global (users) and per-league (user_leagues) tracking,
 * plus history tracking in game_players for audit trail.
 */

exports.up = async function (knex) {
    // Add global ELO to users table
    await knex.schema.alterTable('users', (table) => {
        table.integer('elo_rating').defaultTo(1500).notNullable();
    });

    // Add league ELO to user_leagues table
    await knex.schema.alterTable('user_leagues', (table) => {
        table.integer('elo_rating').defaultTo(1500).notNullable();
    });

    // Add ELO change tracking to game_players for history
    await knex.schema.alterTable('game_players', (table) => {
        table.integer('elo_change').nullable();  // +/- ELO from this game
        table.integer('elo_before').nullable();  // ELO snapshot before this game
    });
};

exports.down = async function (knex) {
    await knex.schema.alterTable('users', (table) => {
        table.dropColumn('elo_rating');
    });

    await knex.schema.alterTable('user_leagues', (table) => {
        table.dropColumn('elo_rating');
    });

    await knex.schema.alterTable('game_players', (table) => {
        table.dropColumn('elo_change');
        table.dropColumn('elo_before');
    });
};
