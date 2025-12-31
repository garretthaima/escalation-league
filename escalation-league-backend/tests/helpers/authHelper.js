const jwt = require('jsonwebtoken');
const { createTestUser } = require('./dbHelper');

/**
 * Creates a test user and returns a valid JWT token
 */
async function getAuthToken(userOverrides = {}) {
    const db = require('./testDb');

    // Get the 'user' role (id: 5 from seed)
    const userRole = await db('roles').where({ name: 'user' }).first();

    const userId = await createTestUser({
        role_id: userRole.id,
        ...userOverrides
    });

    // Get the created user to include all fields in token
    const user = await db('users').where({ id: userId }).first();

    const token = jwt.sign(
        {
            id: user.id,
            role_id: user.role_id,
            email: user.email
        },
        process.env.JWT_SECRET || 'test-secret-key',
        { expiresIn: '24h' }
    );

    return { token, userId };
}

/**
 * Creates a user with specific role for testing RBAC
 * @param {string} roleName - One of: 'super_admin', 'league_admin', 'pod_admin', 'user_admin', 'user', 'league_user'
 */
async function getAuthTokenWithRole(roleName = 'user') {
    const db = require('./testDb');

    // Get the role from seeded data
    const role = await db('roles').where({ name: roleName }).first();

    if (!role) {
        throw new Error(`Role '${roleName}' not found. Available roles: super_admin, league_admin, pod_admin, user_admin, user, league_user`);
    }

    // Create user with this role
    const userId = await createTestUser({ role_id: role.id });

    // Get the created user to include all fields in token
    const user = await db('users').where({ id: userId }).first();

    // Generate token with role_id and email
    const token = jwt.sign(
        {
            id: user.id,
            role_id: user.role_id,
            email: user.email
        },
        process.env.JWT_SECRET || 'test-secret-key',
        { expiresIn: '24h' }
    );

    return { token, userId, roleId: role.id };
}

module.exports = {
    getAuthToken,
    getAuthTokenWithRole
};