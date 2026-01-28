const request = require('supertest');
const { getAuthTokenWithRole } = require('../helpers/authHelper');
const { db } = require('../helpers/dbHelper');

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

describe('Permissions Routes', () => {
    let superAdminToken;

    // Get fresh token before each test since afterEach clears users
    beforeEach(async () => {
        const { token } = await getAuthTokenWithRole('super_admin');
        superAdminToken = token;
    });

    describe('GET /api/admin/permissions', () => {
        it('should return all permissions for super_admin', async () => {
            const res = await request(app)
                .get('/api/admin/permissions')
                .set('Authorization', `Bearer ${superAdminToken}`);

            expect(res.status).toBe(200);
            expect(res.body.permissions).toBeDefined();
            expect(Array.isArray(res.body.permissions)).toBe(true);
            expect(res.body.permissions.length).toBeGreaterThan(0);
        });

        it('should reject non-super_admin access', async () => {
            const { token } = await getAuthTokenWithRole('user');

            const res = await request(app)
                .get('/api/admin/permissions')
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(403);
        });
    });

    describe('GET /api/admin/permissions/matrix', () => {
        it('should return permission matrix for super_admin', async () => {
            const res = await request(app)
                .get('/api/admin/permissions/matrix')
                .set('Authorization', `Bearer ${superAdminToken}`);

            expect(res.status).toBe(200);
            expect(res.body.roles).toBeDefined();
            expect(res.body.permissions).toBeDefined();
            expect(res.body.matrix).toBeDefined();
            expect(Array.isArray(res.body.matrix)).toBe(true);
        });

        it('should include inherited roles in matrix', async () => {
            const res = await request(app)
                .get('/api/admin/permissions/matrix')
                .set('Authorization', `Bearer ${superAdminToken}`);

            expect(res.status).toBe(200);

            // super_admin should have inherited roles
            const superAdminMatrix = res.body.matrix.find(m => m.role.name === 'super_admin');
            expect(superAdminMatrix).toBeDefined();
            expect(superAdminMatrix.inheritedRoles).toBeDefined();
        });
    });

    describe('GET /api/admin/permissions/hierarchy', () => {
        it('should return role hierarchy for super_admin', async () => {
            const res = await request(app)
                .get('/api/admin/permissions/hierarchy')
                .set('Authorization', `Bearer ${superAdminToken}`);

            expect(res.status).toBe(200);
            expect(res.body.roles).toBeDefined();
            expect(res.body.hierarchy).toBeDefined();
        });
    });

    describe('POST /api/admin/permissions/roles', () => {
        it('should create a new role', async () => {
            const roleName = `test_role_create_${Date.now()}`;
            const res = await request(app)
                .post('/api/admin/permissions/roles')
                .set('Authorization', `Bearer ${superAdminToken}`)
                .send({
                    name: roleName,
                    description: 'Test role for creation',
                    permissionIds: [],
                    parentRoleId: null
                });

            expect(res.status).toBe(201);
            expect(res.body.message).toBe('Role created successfully');
            expect(res.body.role).toBeDefined();
            expect(res.body.role.name).toBe(roleName);

            // Clean up
            await db('roles').where('name', roleName).del();
        });

        it('should create a role with parent and inherit permissions correctly', async () => {
            const roleName = `test_role_with_parent_${Date.now()}`;
            // Get user role ID
            const userRole = await db('roles').where('name', 'user').first();

            const res = await request(app)
                .post('/api/admin/permissions/roles')
                .set('Authorization', `Bearer ${superAdminToken}`)
                .send({
                    name: roleName,
                    description: 'Test role with parent',
                    permissionIds: [],
                    parentRoleId: userRole.id
                });

            expect(res.status).toBe(201);
            expect(res.body.role.name).toBe(roleName);

            // Verify hierarchy was created correctly
            const hierarchy = await db('role_hierarchy')
                .where('parent_role_id', res.body.role.id)
                .first();

            expect(hierarchy).toBeDefined();
            expect(hierarchy.child_role_id).toBe(userRole.id);

            // Clean up
            await db('role_hierarchy').where('parent_role_id', res.body.role.id).del();
            await db('roles').where('name', roleName).del();
        });

        it('should reject duplicate role names', async () => {
            const res = await request(app)
                .post('/api/admin/permissions/roles')
                .set('Authorization', `Bearer ${superAdminToken}`)
                .send({
                    name: 'user',
                    description: 'Duplicate name',
                    permissionIds: []
                });

            expect(res.status).toBe(400);
            expect(res.body.error).toContain('already exists');
        });

        it('should reject invalid role name format', async () => {
            const res = await request(app)
                .post('/api/admin/permissions/roles')
                .set('Authorization', `Bearer ${superAdminToken}`)
                .send({
                    name: 'Invalid Role Name!',
                    description: 'Invalid name',
                    permissionIds: []
                });

            expect(res.status).toBe(400);
            expect(res.body.error).toContain('lowercase');
        });
    });

    describe('PUT /api/admin/permissions/roles/:roleId/hierarchy', () => {
        let testRoleId;
        let testRoleName;

        beforeEach(async () => {
            // Use unique name to avoid conflicts across test runs
            testRoleName = `test_hierarchy_role_${Date.now()}`;
            // Create a test role
            const [roleId] = await db('roles').insert({
                name: testRoleName,
                description: 'Test role for hierarchy'
            });
            testRoleId = roleId;
        });

        afterEach(async () => {
            // Clean up
            if (testRoleId) {
                await db('role_hierarchy').where('parent_role_id', testRoleId).del();
                await db('role_hierarchy').where('child_role_id', testRoleId).del();
                await db('roles').where('id', testRoleId).del();
            }
        });

        it('should update role hierarchy', async () => {
            const userRole = await db('roles').where('name', 'user').first();

            const res = await request(app)
                .put(`/api/admin/permissions/roles/${testRoleId}/hierarchy`)
                .set('Authorization', `Bearer ${superAdminToken}`)
                .send({ parentRoleId: userRole.id });

            expect(res.status).toBe(200);
            expect(res.body.message).toBe('Role hierarchy updated successfully');

            // Verify hierarchy
            const hierarchy = await db('role_hierarchy')
                .where('parent_role_id', testRoleId)
                .first();

            expect(hierarchy).toBeDefined();
            expect(hierarchy.child_role_id).toBe(userRole.id);
        });

        it('should remove hierarchy when parentRoleId is null', async () => {
            // First add a hierarchy
            const userRole = await db('roles').where('name', 'user').first();
            await db('role_hierarchy').insert({
                parent_role_id: testRoleId,
                child_role_id: userRole.id
            });

            // Now remove it
            const res = await request(app)
                .put(`/api/admin/permissions/roles/${testRoleId}/hierarchy`)
                .set('Authorization', `Bearer ${superAdminToken}`)
                .send({ parentRoleId: null });

            expect(res.status).toBe(200);

            // Verify hierarchy is gone
            const hierarchy = await db('role_hierarchy')
                .where('parent_role_id', testRoleId)
                .first();

            expect(hierarchy).toBeUndefined();
        });

        it('should clean up backwards hierarchy entries', async () => {
            // Simulate old buggy entry where role was child instead of parent
            const userRole = await db('roles').where('name', 'user').first();
            await db('role_hierarchy').insert({
                parent_role_id: userRole.id,
                child_role_id: testRoleId
            });

            // Update hierarchy - should clean up the backwards entry
            const res = await request(app)
                .put(`/api/admin/permissions/roles/${testRoleId}/hierarchy`)
                .set('Authorization', `Bearer ${superAdminToken}`)
                .send({ parentRoleId: null });

            expect(res.status).toBe(200);

            // Verify backwards entry is gone
            const backwardsEntry = await db('role_hierarchy')
                .where('child_role_id', testRoleId)
                .first();

            expect(backwardsEntry).toBeUndefined();
        });

        it('should reject modifying super_admin hierarchy', async () => {
            const superAdminRole = await db('roles').where('name', 'super_admin').first();

            const res = await request(app)
                .put(`/api/admin/permissions/roles/${superAdminRole.id}/hierarchy`)
                .set('Authorization', `Bearer ${superAdminToken}`)
                .send({ parentRoleId: null });

            expect(res.status).toBe(400);
            expect(res.body.error).toContain('protected system role');
        });

        it('should reject modifying user hierarchy', async () => {
            const userRole = await db('roles').where('name', 'user').first();

            const res = await request(app)
                .put(`/api/admin/permissions/roles/${userRole.id}/hierarchy`)
                .set('Authorization', `Bearer ${superAdminToken}`)
                .send({ parentRoleId: null });

            expect(res.status).toBe(400);
            expect(res.body.error).toContain('protected system role');
        });

        it('should reject circular hierarchy', async () => {
            const timestamp = Date.now();
            // Create two test roles
            const [roleA] = await db('roles').insert({
                name: `test_role_a_${timestamp}`,
                description: 'Test role A'
            });
            const [roleB] = await db('roles').insert({
                name: `test_role_b_${timestamp}`,
                description: 'Test role B'
            });

            // Make roleA inherit from roleB
            await db('role_hierarchy').insert({
                parent_role_id: roleA,
                child_role_id: roleB
            });

            // Try to make roleB inherit from roleA - should fail (cycle)
            const res = await request(app)
                .put(`/api/admin/permissions/roles/${roleB}/hierarchy`)
                .set('Authorization', `Bearer ${superAdminToken}`)
                .send({ parentRoleId: roleA });

            expect(res.status).toBe(400);
            expect(res.body.error).toContain('circular hierarchy');

            // Clean up
            await db('role_hierarchy').where('parent_role_id', roleA).del();
            await db('roles').where('id', roleA).del();
            await db('roles').where('id', roleB).del();
        });
    });

    describe('DELETE /api/admin/permissions/roles/:roleId', () => {
        it('should delete a role', async () => {
            const roleName = `test_role_to_delete_${Date.now()}`;
            // Create a test role
            const [roleId] = await db('roles').insert({
                name: roleName,
                description: 'Test role for deletion'
            });

            const res = await request(app)
                .delete(`/api/admin/permissions/roles/${roleId}`)
                .set('Authorization', `Bearer ${superAdminToken}`);

            expect(res.status).toBe(200);
            expect(res.body.message).toContain('deleted successfully');

            // Verify role is gone
            const role = await db('roles').where('id', roleId).first();
            expect(role).toBeUndefined();
        });

        it('should reject deleting protected roles', async () => {
            const superAdminRole = await db('roles').where('name', 'super_admin').first();

            const res = await request(app)
                .delete(`/api/admin/permissions/roles/${superAdminRole.id}`)
                .set('Authorization', `Bearer ${superAdminToken}`);

            expect(res.status).toBe(400);
            expect(res.body.error).toContain('protected system role');
        });

        it('should reject deleting role with assigned users', async () => {
            const roleName = `test_role_with_users_${Date.now()}`;
            // Create a test role
            const [roleId] = await db('roles').insert({
                name: roleName,
                description: 'Test role with users'
            });

            // Assign a user to this role
            await db('users').insert({
                email: `test_delete_role_${Date.now()}@example.com`,
                password: 'test',
                firstname: 'Test',
                lastname: 'User',
                role_id: roleId
            });

            const res = await request(app)
                .delete(`/api/admin/permissions/roles/${roleId}`)
                .set('Authorization', `Bearer ${superAdminToken}`);

            expect(res.status).toBe(400);
            expect(res.body.error).toContain('user(s) are assigned');

            // Clean up - delete user by role_id since we used dynamic email
            await db('users').where('role_id', roleId).del();
            await db('roles').where('id', roleId).del();
        });
    });
});
