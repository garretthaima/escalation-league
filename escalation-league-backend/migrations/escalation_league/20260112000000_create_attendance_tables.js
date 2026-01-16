/**
 * Migration to create attendance tracking tables
 * - game_sessions: A game night/event for a league
 * - session_attendance: Tracks who checked in for a session
 */
exports.up = async function (knex) {
    console.log('📋 Creating attendance tracking tables...');

    // Create game_sessions table
    await knex.schema.createTable('game_sessions', (table) => {
        table.increments('id').primary();
        table.integer('league_id').unsigned().notNullable();
        table.date('session_date').notNullable();
        table.string('name', 255); // Optional name like "Week 2 Game Night"
        table.enum('status', ['scheduled', 'active', 'completed']).defaultTo('scheduled');
        table.integer('created_by').unsigned();
        table.timestamp('created_at').defaultTo(knex.fn.now());
        table.timestamp('updated_at').defaultTo(knex.fn.now());

        // Foreign keys
        table.foreign('league_id').references('id').inTable('leagues').onDelete('CASCADE');
        table.foreign('created_by').references('id').inTable('users').onDelete('SET NULL');

        // Unique constraint - one session per league per date
        table.unique(['league_id', 'session_date'], 'unique_league_session_date');

        // Indexes
        table.index('league_id', 'idx_game_sessions_league_id');
        table.index('session_date', 'idx_game_sessions_date');
        table.index('status', 'idx_game_sessions_status');
    });

    // Create session_attendance table
    await knex.schema.createTable('session_attendance', (table) => {
        table.increments('id').primary();
        table.integer('session_id').unsigned().notNullable();
        table.integer('user_id').unsigned().notNullable();
        table.timestamp('checked_in_at').defaultTo(knex.fn.now());
        table.timestamp('checked_out_at').nullable();
        table.boolean('is_active').defaultTo(true); // Currently available for pods

        // Foreign keys
        table.foreign('session_id').references('id').inTable('game_sessions').onDelete('CASCADE');
        table.foreign('user_id').references('id').inTable('users').onDelete('CASCADE');

        // Unique constraint - one attendance record per user per session
        table.unique(['session_id', 'user_id'], 'unique_session_user_attendance');

        // Indexes
        table.index('session_id', 'idx_session_attendance_session_id');
        table.index('user_id', 'idx_session_attendance_user_id');
        table.index('is_active', 'idx_session_attendance_is_active');
    });

    console.log('✅ Attendance tables created successfully');
};

exports.down = async function (knex) {
    console.log('📋 Dropping attendance tracking tables...');

    await knex.schema.dropTableIfExists('session_attendance');
    await knex.schema.dropTableIfExists('game_sessions');

    console.log('✅ Attendance tables dropped successfully');
};
