const db = require('./testDb');
const bcrypt = require('bcrypt');

async function clearDatabase() {
    // Clear test data tables but NOT RBAC seed data
    const tables = [
        'game_players',
        'game_pods',
        'user_awards',
        'league_signup_requests',
        'user_leagues',
        'decks',
        'activity_logs',
        'user_settings',
        'role_requests',
        'notifications',        // Clear notifications
        'attendance_polls',     // Clear attendance polls
        'session_attendance',   // Clear session attendance
        'game_sessions',        // Clear game sessions
        'users',               // Clear users
        'leagues',
        'awards',
        // Do NOT clear: roles, permissions, role_permissions, role_hierarchy, settings
    ];

    // Disable foreign key checks
    await db.raw('SET FOREIGN_KEY_CHECKS = 0');

    for (const table of tables) {
        try {
            await db(table).del();
        } catch (err) {
            // Ignore errors for non-existent tables
        }
    }

    // Re-enable foreign key checks
    await db.raw('SET FOREIGN_KEY_CHECKS = 1');
}

async function createTestUser(overrides = {}) {
    // Generate unique email if not provided
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 10000);
    const defaultEmail = `test-${timestamp}-${random}@example.com`;

    // Hash the password - use the provided password or default
    const plainPassword = overrides.password || 'TestPass123!';
    const hashedPassword = await bcrypt.hash(plainPassword, 10);

    const [userId] = await db('users').insert({
        email: overrides.email || defaultEmail,
        password: hashedPassword,
        firstname: overrides.firstname || 'Test',
        lastname: overrides.lastname || 'User',
        is_active: overrides.is_active !== undefined ? overrides.is_active : 1,
        is_deleted: overrides.is_deleted !== undefined ? overrides.is_deleted : 0,
        wins: overrides.wins || 0,
        losses: overrides.losses || 0,
        draws: overrides.draws || 0,
        elo_rating: overrides.elo_rating || 1500,
        role_id: overrides.role_id || null,
    });

    return userId;
}

module.exports = {
    db,
    clearDatabase,
    createTestUser
};