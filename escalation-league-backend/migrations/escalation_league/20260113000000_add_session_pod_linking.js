/**
 * Migration to link pods to sessions and add locked status
 * - Add session_id to game_pods (nullable for backwards compatibility)
 * - Add 'locked' to game_sessions status enum
 * - Add updated_via column to session_attendance for tracking source
 */
exports.up = async function (knex) {
    console.log('📋 Adding session-pod linking and locked status...');

    // Add session_id to game_pods
    await knex.schema.alterTable('game_pods', (table) => {
        table.integer('session_id').unsigned().nullable().after('league_id');
        table.foreign('session_id').references('id').inTable('game_sessions').onDelete('SET NULL');
        table.index('session_id', 'idx_game_pods_session_id');
    });

    // Modify game_sessions status enum to include 'locked'
    // MySQL requires recreating the column to modify enum values
    await knex.raw(`
        ALTER TABLE game_sessions
        MODIFY COLUMN status ENUM('scheduled', 'active', 'locked', 'completed')
        DEFAULT 'scheduled'
    `);

    // Add updated_via column if it doesn't exist
    const hasUpdatedVia = await knex.schema.hasColumn('session_attendance', 'updated_via');
    if (!hasUpdatedVia) {
        await knex.schema.alterTable('session_attendance', (table) => {
            table.string('updated_via', 50).nullable().after('is_active'); // 'web', 'admin', 'discord'
        });
    }

    console.log('✅ Session-pod linking and locked status added successfully');
};

exports.down = async function (knex) {
    console.log('📋 Reverting session-pod linking and locked status...');

    // Remove session_id from game_pods
    await knex.schema.alterTable('game_pods', (table) => {
        table.dropForeign(['session_id']);
        table.dropIndex('idx_game_pods_session_id');
        table.dropColumn('session_id');
    });

    // Revert game_sessions status enum
    await knex.raw(`
        ALTER TABLE game_sessions
        MODIFY COLUMN status ENUM('scheduled', 'active', 'completed')
        DEFAULT 'scheduled'
    `);

    // Remove updated_via column
    const hasUpdatedVia = await knex.schema.hasColumn('session_attendance', 'updated_via');
    if (hasUpdatedVia) {
        await knex.schema.alterTable('session_attendance', (table) => {
            table.dropColumn('updated_via');
        });
    }

    console.log('✅ Session-pod linking and locked status reverted successfully');
};
