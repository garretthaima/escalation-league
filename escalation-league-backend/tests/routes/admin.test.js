const request = require('supertest');
const { getAuthToken, getAuthTokenWithRole } = require('../helpers/authHelper');
const { createTestUser, db } = require('../helpers/dbHelper');

jest.mock('../../models/db', () => require('../helpers/testDb'));
jest.mock('../../utils/settingsUtils', () => ({
    getSetting: jest.fn((key) => {
        if (key === 'secret_key') {
            return Promise.resolve(process.env.JWT_SECRET || 'test-secret-key');
        }
        return Promise.resolve(null);
    })
}));

// Mock redis cache
jest.mock('../../utils/redisClient', () => ({
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue('OK'),
    setex: jest.fn().mockResolvedValue('OK'),
    del: jest.fn().mockResolvedValue(1)
}));

// Mock the permissions utility to use test DB
jest.mock('../../utils/permissionsUtils', () => {
    const testDb = require('../helpers/testDb');

    return {
        resolveRolesAndPermissions: async (roleId) => {
            // Get permissions for the role using test DB
            const accessibleRoles = await testDb.withRecursive('role_inheritance', (builder) => {
                builder
                    .select('parent_role_id as role_id', 'child_role_id')
                    .from('role_hierarchy')
                    .unionAll(function () {
                        this.select('ri.role_id', 'rh.child_role_id')
                            .from('role_inheritance as ri')
                            .join('role_hierarchy as rh', 'ri.child_role_id', 'rh.parent_role_id');
                    });
            })
                .select('child_role_id')
                .from('role_inheritance')
                .where('role_id', roleId)
                .union(function () {
                    this.select(testDb.raw('?', [roleId]));
                })
                .then((roles) => roles.map((role) => role.child_role_id));

            const permissions = await testDb('role_permissions')
                .join('permissions', 'role_permissions.permission_id', 'permissions.id')
                .whereIn('role_permissions.role_id', accessibleRoles)
                .select('permissions.id', 'permissions.name');

            const deduplicatedPermissions = Array.from(
                new Map(permissions.map((perm) => [perm.id, perm])).values()
            );

            return { accessibleRoles, permissions: deduplicatedPermissions };
        }
    };
});

const app = require('../../server');

// Helper function to create role requests for testing
async function createRoleRequest(userId, requestedRoleId, status = 'pending') {
    const [requestId] = await db('role_requests').insert({
        user_id: userId,
        requested_role_id: requestedRoleId,
        status: status,
        created_at: db.fn.now()
    });
    return requestId;
}

describe('Admin Routes', () => {
    describe('GET /api/admin/user/all', () => {
        it('should return all users for super_admin', async () => {
            // Create test users first, then admin token
            await createTestUser({ firstname: 'User1' });
            await createTestUser({ firstname: 'User2' });
            await createTestUser({ firstname: 'User3' });

            const { token } = await getAuthTokenWithRole('super_admin');

            const res = await request(app)
                .get('/api/admin/user/all')
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(200);
            expect(Array.isArray(res.body)).toBe(true);
            // We should have at least 4 users: 3 test users + 1 admin user
            expect(res.body.length).toBeGreaterThanOrEqual(4);
        });

        it('should reject non-admin access', async () => {
            const { token } = await getAuthToken();

            const res = await request(app)
                .get('/api/admin/user/all')
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(403);
        });

        // TODO: Test pagination support
        // TODO: Test search/filter capabilities
    });

    describe('GET /api/admin/user/:id', () => {
        it('should return user details', async () => {
            // Create user first, then admin token (like ban test pattern)
            const userId = await createTestUser({ firstname: 'TestUser' });
            const { token } = await getAuthTokenWithRole('super_admin');

            const res = await request(app)
                .get(`/api/admin/user/${userId}`)
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('id', userId);
            expect(res.body).toHaveProperty('firstname', 'TestUser');
        });

        it('should reject non-admin access', async () => {
            const userId = await createTestUser();
            const { token } = await getAuthToken();

            const res = await request(app)
                .get(`/api/admin/user/${userId}`)
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(403);
        });

        it('should return 404 for non-existent user', async () => {
            const { token } = await getAuthTokenWithRole('super_admin');

            const res = await request(app)
                .get('/api/admin/user/99999')
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(404);
        });
    });

    describe('PUT /api/admin/user/ban/:id', () => {
        it('should ban a user', async () => {
            const userId = await createTestUser();
            const { token } = await getAuthTokenWithRole('super_admin');

            const res = await request(app)
                .put(`/api/admin/user/ban/${userId}`)
                .set('Authorization', `Bearer ${token}`)
                .send({ ban_reason: 'Test ban reason' });

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('message');
        });

        it('should reject non-admin access', async () => {
            const userId = await createTestUser();
            const { token } = await getAuthToken();

            const res = await request(app)
                .put(`/api/admin/user/ban/${userId}`)
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(403);
        });

        // TODO: Test banned user cannot login
    });

    describe('PUT /api/admin/user/unban/:id', () => {
        it('should unban a user', async () => {
            const userId = await createTestUser({ is_banned: 1 });
            const { token } = await getAuthTokenWithRole('super_admin');

            const res = await request(app)
                .put(`/api/admin/user/unban/${userId}`)
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('message');
        });

        it('should reject non-admin access', async () => {
            const userId = await createTestUser({ is_banned: 1 });
            const { token } = await getAuthToken();

            const res = await request(app)
                .put(`/api/admin/user/unban/${userId}`)
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(403);
        });
    });

    describe('PUT /api/admin/user/deactivate/:id', () => {
        it('should deactivate a user', async () => {
            const userId = await createTestUser({ is_active: 1 });
            const { token } = await getAuthTokenWithRole('super_admin');

            const res = await request(app)
                .put(`/api/admin/user/deactivate/${userId}`)
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('message');
        });

        it('should reject non-admin access', async () => {
            const userId = await createTestUser();
            const { token } = await getAuthToken();

            const res = await request(app)
                .put(`/api/admin/user/deactivate/${userId}`)
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(403);
        });

        // TODO: Test deactivated user cannot login
    });

    describe('PUT /api/admin/user/activate/:id', () => {
        it('should activate a user', async () => {
            const userId = await createTestUser({ is_active: 0 });
            const { token } = await getAuthTokenWithRole('super_admin');

            const res = await request(app)
                .put(`/api/admin/user/activate/${userId}`)
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('message');
        });

        it('should reject non-admin access', async () => {
            const userId = await createTestUser({ is_active: 0 });
            const { token } = await getAuthToken();

            const res = await request(app)
                .put(`/api/admin/user/activate/${userId}`)
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(403);
        });
    });

    describe('PUT /api/admin/user/reset-password/:id', () => {
        it('should reset user password', async () => {
            const userId = await createTestUser();
            const { token } = await getAuthTokenWithRole('super_admin');

            const res = await request(app)
                .put(`/api/admin/user/reset-password/${userId}`)
                .set('Authorization', `Bearer ${token}`)
                .send({ newPassword: 'NewSecurePass123!' });

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('message');
        });

        it('should reject non-admin access', async () => {
            const userId = await createTestUser();
            const { token } = await getAuthToken();

            const res = await request(app)
                .put(`/api/admin/user/reset-password/${userId}`)
                .set('Authorization', `Bearer ${token}`)
                .send({ newPassword: 'NewSecurePass123!' });

            expect(res.status).toBe(403);
        });

        // TODO: Test password complexity requirements
        // TODO: Test user can login with new password
    });

    describe('GET /api/admin/role-requests', () => {
        it('should return pending role requests', async () => {
            const { token } = await getAuthTokenWithRole('super_admin');

            const res = await request(app)
                .get('/api/admin/role-requests')
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(200);
            expect(Array.isArray(res.body)).toBe(true);
        });

        it('should reject non-admin access', async () => {
            const { token } = await getAuthToken();

            const res = await request(app)
                .get('/api/admin/role-requests')
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(403);
        });

        // TODO: Test includes user details
        // TODO: Test filtering by status
    });

    describe('POST /api/admin/role-requests/review', () => {
        it('should approve role request', async () => {
            const { token } = await getAuthTokenWithRole('super_admin');

            const res = await request(app)
                .post('/api/admin/role-requests/review')
                .set('Authorization', `Bearer ${token}`)
                .send({
                    requestId: 1,
                    status: 'approved'
                });

            // May be 200 or 404 depending on if request exists
            expect([200, 404]).toContain(res.status);
        });

        it('should reject role request', async () => {
            const { token } = await getAuthTokenWithRole('super_admin');

            const res = await request(app)
                .post('/api/admin/role-requests/review')
                .set('Authorization', `Bearer ${token}`)
                .send({
                    requestId: 1,
                    status: 'rejected'
                });

            // May be 200 or 404 depending on if request exists
            expect([200, 404]).toContain(res.status);
        });

        it('should reject non-admin access', async () => {
            const { token } = await getAuthToken();

            const res = await request(app)
                .post('/api/admin/role-requests/review')
                .set('Authorization', `Bearer ${token}`)
                .send({
                    requestId: 1,
                    action: 'approve'
                });

            expect(res.status).toBe(403);
        });

        // TODO: Test validates action (approve/reject)
        // TODO: Test user receives updated role
    });

    describe('GET /api/admin/reports/leagues', () => {
        it('should return league report', async () => {
            const { token } = await getAuthTokenWithRole('super_admin');

            const res = await request(app)
                .get('/api/admin/reports/leagues')
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(200);
            expect(Array.isArray(res.body) || typeof res.body === 'object').toBe(true);
        });

        it('should reject non-admin access', async () => {
            const { token } = await getAuthToken();

            const res = await request(app)
                .get('/api/admin/reports/leagues')
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(403);
        });

        // TODO: Test report includes league stats
        // TODO: Test date range filtering
    });

    describe('PUT /api/admin/user/:userId/role', () => {
        it('should assign role to user', async () => {
            const userId = await createTestUser({ firstname: 'RoleTest' });
            const { token } = await getAuthTokenWithRole('super_admin');

            // Get a valid role to assign (user role)
            const userRole = await db('roles').where({ name: 'user' }).first();

            const res = await request(app)
                .put(`/api/admin/user/${userId}/role`)
                .set('Authorization', `Bearer ${token}`)
                .send({ roleId: userRole.id });

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('success', true);
            expect(res.body).toHaveProperty('message');
            expect(res.body.user).toHaveProperty('role_id', userRole.id);
        });

        it('should reject non-admin access', async () => {
            const userId = await createTestUser();
            const { token } = await getAuthToken();

            const res = await request(app)
                .put(`/api/admin/user/${userId}/role`)
                .set('Authorization', `Bearer ${token}`)
                .send({ roleId: 1 });

            expect(res.status).toBe(403);
        });

        it('should return 400 when roleId is missing', async () => {
            const userId = await createTestUser();
            const { token } = await getAuthTokenWithRole('super_admin');

            const res = await request(app)
                .put(`/api/admin/user/${userId}/role`)
                .set('Authorization', `Bearer ${token}`)
                .send({});

            expect(res.status).toBe(400);
            expect(res.body).toHaveProperty('error', 'Role ID is required.');
        });

        it('should return 404 for non-existent user', async () => {
            const { token } = await getAuthTokenWithRole('super_admin');
            const userRole = await db('roles').where({ name: 'user' }).first();

            const res = await request(app)
                .put('/api/admin/user/99999/role')
                .set('Authorization', `Bearer ${token}`)
                .send({ roleId: userRole.id });

            expect(res.status).toBe(404);
            expect(res.body).toHaveProperty('error', 'User not found.');
        });

        it('should return 404 for non-existent role', async () => {
            const userId = await createTestUser();
            const { token } = await getAuthTokenWithRole('super_admin');

            const res = await request(app)
                .put(`/api/admin/user/${userId}/role`)
                .set('Authorization', `Bearer ${token}`)
                .send({ roleId: 99999 });

            expect(res.status).toBe(404);
            expect(res.body).toHaveProperty('error', 'Role not found.');
        });
    });

    describe('GET /api/admin/roles', () => {
        it('should return all roles', async () => {
            const { token } = await getAuthTokenWithRole('super_admin');

            const res = await request(app)
                .get('/api/admin/roles')
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('roles');
            expect(Array.isArray(res.body.roles)).toBe(true);
            expect(res.body.roles.length).toBeGreaterThan(0);
            // Each role should have id, name, description
            expect(res.body.roles[0]).toHaveProperty('id');
            expect(res.body.roles[0]).toHaveProperty('name');
        });

        it('should reject non-admin access', async () => {
            const { token } = await getAuthToken();

            const res = await request(app)
                .get('/api/admin/roles')
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(403);
        });
    });

    describe('PUT /api/admin/user/ban/:id - error cases', () => {
        it('should return 400 when ban_reason is missing', async () => {
            const userId = await createTestUser();
            const { token } = await getAuthTokenWithRole('super_admin');

            const res = await request(app)
                .put(`/api/admin/user/ban/${userId}`)
                .set('Authorization', `Bearer ${token}`)
                .send({});

            expect(res.status).toBe(400);
            expect(res.body).toHaveProperty('error', 'Ban reason is required.');
        });
    });

    describe('PUT /api/admin/user/reset-password/:id - error cases', () => {
        it('should return 400 when newPassword is missing', async () => {
            const userId = await createTestUser();
            const { token } = await getAuthTokenWithRole('super_admin');

            const res = await request(app)
                .put(`/api/admin/user/reset-password/${userId}`)
                .set('Authorization', `Bearer ${token}`)
                .send({});

            expect(res.status).toBe(400);
            expect(res.body).toHaveProperty('error', 'New password is required.');
        });
    });

    describe('POST /api/admin/role-requests/review - with actual role request', () => {
        it('should approve role request and update user role', async () => {
            const { token } = await getAuthTokenWithRole('super_admin');

            // Create a user and a role request
            const userId = await createTestUser({ firstname: 'RoleRequester' });
            const leagueAdminRole = await db('roles').where({ name: 'league_admin' }).first();
            const requestId = await createRoleRequest(userId, leagueAdminRole.id, 'pending');

            const res = await request(app)
                .post('/api/admin/role-requests/review')
                .set('Authorization', `Bearer ${token}`)
                .send({
                    requestId: requestId,
                    status: 'approved',
                    adminComment: 'Approved for testing'
                });

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('success', true);
            expect(res.body.message).toContain('approved');

            // Verify the user's role was updated
            const updatedUser = await db('users').where({ id: userId }).first();
            expect(updatedUser.role_id).toBe(leagueAdminRole.id);
        });

        it('should reject role request without updating user role', async () => {
            const { token } = await getAuthTokenWithRole('super_admin');

            // Create a user and a role request
            const userId = await createTestUser({ firstname: 'RoleRequester2' });
            const originalRoleId = (await db('users').where({ id: userId }).first()).role_id;
            const leagueAdminRole = await db('roles').where({ name: 'league_admin' }).first();
            const requestId = await createRoleRequest(userId, leagueAdminRole.id, 'pending');

            const res = await request(app)
                .post('/api/admin/role-requests/review')
                .set('Authorization', `Bearer ${token}`)
                .send({
                    requestId: requestId,
                    status: 'rejected',
                    adminComment: 'Not approved for testing'
                });

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('success', true);
            expect(res.body.message).toContain('rejected');

            // Verify the user's role was NOT updated
            const updatedUser = await db('users').where({ id: userId }).first();
            expect(updatedUser.role_id).toBe(originalRoleId);
        });

        it('should return 400 for invalid status', async () => {
            const { token } = await getAuthTokenWithRole('super_admin');

            const res = await request(app)
                .post('/api/admin/role-requests/review')
                .set('Authorization', `Bearer ${token}`)
                .send({
                    requestId: 1,
                    status: 'invalid_status'
                });

            expect(res.status).toBe(400);
            expect(res.body).toHaveProperty('error');
            expect(res.body.error).toContain('Invalid status');
        });

        it('should return 404 for non-existent role request', async () => {
            const { token } = await getAuthTokenWithRole('super_admin');

            const res = await request(app)
                .post('/api/admin/role-requests/review')
                .set('Authorization', `Bearer ${token}`)
                .send({
                    requestId: 99999,
                    status: 'approved'
                });

            expect(res.status).toBe(404);
            expect(res.body).toHaveProperty('error', 'Role request not found.');
        });
    });

    describe('GET /api/admin/role-requests - with actual data', () => {
        it('should return pending role requests with user details', async () => {
            const { token } = await getAuthTokenWithRole('super_admin');

            // Create a user and a role request
            const userId = await createTestUser({
                firstname: 'Pending',
                lastname: 'Requester',
                email: `pending-${Date.now()}@test.com`
            });
            const leagueAdminRole = await db('roles').where({ name: 'league_admin' }).first();
            await createRoleRequest(userId, leagueAdminRole.id, 'pending');

            const res = await request(app)
                .get('/api/admin/role-requests')
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(200);
            expect(Array.isArray(res.body)).toBe(true);
            expect(res.body.length).toBeGreaterThan(0);

            // Check that requests include user details
            const foundRequest = res.body.find(r => r.firstname === 'Pending');
            expect(foundRequest).toBeDefined();
            expect(foundRequest).toHaveProperty('lastname', 'Requester');
            expect(foundRequest).toHaveProperty('email');
            expect(foundRequest).toHaveProperty('requested_role');
            expect(foundRequest).toHaveProperty('status', 'pending');
        });
    });
});
