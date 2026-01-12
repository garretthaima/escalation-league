/**
 * Add Discord integration columns and tables
 * - discord_id column on users table for linking Discord accounts
 * - attendance_polls table to track poll messages for reaction monitoring
 */
exports.up = async function(knex) {
    // Add discord columns to users table (if they don't exist)
    const hasDiscordId = await knex.schema.hasColumn('users', 'discord_id');
    if (!hasDiscordId) {
        await knex.schema.alterTable('users', (table) => {
            table.string('discord_id', 255).nullable().unique();
        });
    }

    const hasDiscordUsername = await knex.schema.hasColumn('users', 'discord_username');
    if (!hasDiscordUsername) {
        await knex.schema.alterTable('users', (table) => {
            table.string('discord_username', 255).nullable();
        });
    }

    const hasDiscordAvatar = await knex.schema.hasColumn('users', 'discord_avatar');
    if (!hasDiscordAvatar) {
        await knex.schema.alterTable('users', (table) => {
            table.string('discord_avatar', 255).nullable();
        });
    }

    // Create attendance_polls table to track Discord poll messages (if it doesn't exist)
    const hasAttendancePolls = await knex.schema.hasTable('attendance_polls');
    if (!hasAttendancePolls) {
        await knex.schema.createTable('attendance_polls', (table) => {
            table.increments('id').primary();
            table.integer('session_id').unsigned().notNullable();
            table.integer('league_id').unsigned().notNullable();
            table.string('discord_message_id', 255).notNullable();
            table.string('discord_channel_id', 255).notNullable();
            table.timestamp('created_at').defaultTo(knex.fn.now());

            // Foreign keys - references game_sessions table from attendance migration
            table.foreign('session_id').references('id').inTable('game_sessions').onDelete('CASCADE');
            table.foreign('league_id').references('id').inTable('leagues').onDelete('CASCADE');

            // Index for looking up by message ID
            table.index('discord_message_id');
        });
    }

    // Add updated_via column to session_attendance to track source of updates (if it doesn't exist)
    const hasUpdatedVia = await knex.schema.hasColumn('session_attendance', 'updated_via');
    if (!hasUpdatedVia) {
        await knex.schema.alterTable('session_attendance', (table) => {
            table.string('updated_via', 50).nullable().defaultTo('web');
        });
    }
};

exports.down = async function(knex) {
    // Remove updated_via column
    const hasUpdatedVia = await knex.schema.hasColumn('session_attendance', 'updated_via');
    if (hasUpdatedVia) {
        await knex.schema.alterTable('session_attendance', (table) => {
            table.dropColumn('updated_via');
        });
    }

    // Drop attendance_polls table
    await knex.schema.dropTableIfExists('attendance_polls');

    // Remove discord columns from users
    const hasDiscordAvatar = await knex.schema.hasColumn('users', 'discord_avatar');
    if (hasDiscordAvatar) {
        await knex.schema.alterTable('users', (table) => {
            table.dropColumn('discord_avatar');
        });
    }

    const hasDiscordUsername = await knex.schema.hasColumn('users', 'discord_username');
    if (hasDiscordUsername) {
        await knex.schema.alterTable('users', (table) => {
            table.dropColumn('discord_username');
        });
    }

    const hasDiscordId = await knex.schema.hasColumn('users', 'discord_id');
    if (hasDiscordId) {
        await knex.schema.alterTable('users', (table) => {
            table.dropColumn('discord_id');
        });
    }
};
