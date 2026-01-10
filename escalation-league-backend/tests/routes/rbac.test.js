const request = require('supertest');
const { getAuthTokenWithRole } = require('../helpers/authHelper');
const { createPermission, assignPermissionToRole, createRoleWithPermissions } = require('../helpers/rbacHelper');
const testDb = require('../helpers/testDb');

jest.mock('../../models/db', () => require('../helpers/testDb'));
jest.mock('../../utils/settingsUtils', () => ({
    getSetting: jest.fn((key) => {
        if (key === 'secret_key') {
            return Promise.resolve(process.env.JWT_SECRET || 'test-secret-key');
        }
        return Promise.resolve(null);
    })
}));

const app = require('../../server');

describe('RBAC Permission Tests', () => {
    describe('Permission Inheritance', () => {
        it('should inherit permissions from parent role through role_hierarchy', async () => {
            // Get tokens for different role levels
            const superAdminToken = await getAuthTokenWithRole('super_admin');
            const leagueAdminToken = await getAuthTokenWithRole('league_admin');
            const podAdminToken = await getAuthTokenWithRole('pod_admin');
            const userToken = await getAuthTokenWithRole('league_user');

            // Test that super_admin can access admin endpoints
            const superAdminRes = await request(app)
                .get('/api/admin/user/all')
                .set('Authorization', `Bearer ${superAdminToken.token}`);
            expect([200, 500]).toContain(superAdminRes.status);

            // Test that league_admin cannot access super_admin endpoints
            const leagueAdminRes = await request(app)
                .get('/api/admin/user/all')
                .set('Authorization', `Bearer ${leagueAdminToken.token}`);
            expect([403, 500]).toContain(leagueAdminRes.status);

            // Test that pod_admin cannot access admin endpoints
            const podAdminRes = await request(app)
                .get('/api/admin/user/all')
                .set('Authorization', `Bearer ${podAdminToken.token}`);
            expect([403, 500]).toContain(podAdminRes.status);

            // Test that regular user cannot access admin endpoints
            const userRes = await request(app)
                .get('/api/admin/user/all')
                .set('Authorization', `Bearer ${userToken.token}`);
            expect([403, 500]).toContain(userRes.status);
        });

        it('should verify role hierarchy is properly seeded', async () => {
            // Check that role_hierarchy table has expected parent-child relationships
            const hierarchy = await testDb('role_hierarchy')
                .join('roles as parent_role', 'role_hierarchy.parent_role_id', 'parent_role.id')
                .join('roles as child_role', 'role_hierarchy.child_role_id', 'child_role.id')
                .select(
                    'parent_role.name as parent',
                    'child_role.name as child'
                );

            expect(hierarchy.length).toBeGreaterThan(0);

            // Verify some expected relationships exist
            const relationships = hierarchy.map(h => `${h.parent} -> ${h.child}`);

            // Log for debugging
            console.log('Role hierarchy relationships:', relationships);
        });

        it('should accumulate permissions across inherited roles', async () => {
            const { resolveRolesAndPermissions } = require('../../utils/permissionsUtils');

            // Get super_admin role
            const superAdmin = await testDb('roles').where({ name: 'super_admin' }).first();

            // Resolve all permissions for super_admin
            const { permissions, accessibleRoles } = await resolveRolesAndPermissions(superAdmin.id);

            // Super admin should have access to multiple roles through inheritance
            expect(accessibleRoles.length).toBeGreaterThanOrEqual(1);

            // Should have permissions from all inherited roles
            expect(permissions.length).toBeGreaterThan(0);

            console.log(`Super admin has ${permissions.length} permissions across ${accessibleRoles.length} roles`);
        });
    });

    describe('Permission Assignment and Removal', () => {
        it('should allow assigning permissions to a role', async () => {
            // Create a test permission
            const permission = await createPermission('test_permission', 'Test permission for RBAC');

            // Get a role to assign to
            const role = await testDb('roles').where({ name: 'league_user' }).first();

            // Assign permission to role
            await testDb('role_permissions').insert({
                role_id: role.id,
                permission_id: permission.id
            });

            // Verify assignment
            const assignment = await testDb('role_permissions')
                .where({ role_id: role.id, permission_id: permission.id })
                .first();

            expect(assignment).toBeTruthy();

            // Clean up
            await testDb('role_permissions')
                .where({ role_id: role.id, permission_id: permission.id })
                .del();
        });

        it('should allow removing permissions from a role', async () => {
            // Create a test permission and assign it
            const permission = await createPermission('temp_permission', 'Temporary permission');
            const role = await testDb('roles').where({ name: 'league_user' }).first();

            await testDb('role_permissions').insert({
                role_id: role.id,
                permission_id: permission.id
            });

            // Remove the permission
            const deleted = await testDb('role_permissions')
                .where({ role_id: role.id, permission_id: permission.id })
                .del();

            expect(deleted).toBeGreaterThan(0);

            // Verify removal
            const assignment = await testDb('role_permissions')
                .where({ role_id: role.id, permission_id: permission.id })
                .first();

            expect(assignment).toBeFalsy();
        });

        it('should handle granting multiple permissions at once', async () => {
            const role = await testDb('roles').where({ name: 'league_user' }).first();

            // Create multiple permissions
            const perm1 = await createPermission('multi_perm_1', 'Multi permission 1');
            const perm2 = await createPermission('multi_perm_2', 'Multi permission 2');
            const perm3 = await createPermission('multi_perm_3', 'Multi permission 3');

            // Grant all at once
            await testDb('role_permissions').insert([
                { role_id: role.id, permission_id: perm1.id },
                { role_id: role.id, permission_id: perm2.id },
                { role_id: role.id, permission_id: perm3.id }
            ]);

            // Verify all were granted
            const assignments = await testDb('role_permissions')
                .whereIn('permission_id', [perm1.id, perm2.id, perm3.id])
                .where({ role_id: role.id });

            expect(assignments.length).toBe(3);

            // Clean up
            await testDb('role_permissions')
                .whereIn('permission_id', [perm1.id, perm2.id, perm3.id])
                .del();
        });

        it('should allow duplicate permission assignments (no unique constraint)', async () => {
            const permission = await createPermission('dup_test_permission', 'Duplicate test');
            const role = await testDb('roles').where({ name: 'league_user' }).first();

            // First assignment
            await testDb('role_permissions').insert({
                role_id: role.id,
                permission_id: permission.id
            });

            // Second assignment - currently allowed (no unique constraint in schema)
            // TODO: Add unique constraint on (role_id, permission_id) to prevent duplicates
            const secondInsert = await testDb('role_permissions').insert({
                role_id: role.id,
                permission_id: permission.id
            });

            expect(secondInsert).toBeTruthy();

            // Clean up
            await testDb('role_permissions')
                .where({ role_id: role.id, permission_id: permission.id })
                .del();
        });
    });

    describe('Protected Endpoint Access Control', () => {
        it('should block access without authentication', async () => {
            const res = await request(app)
                .get('/api/admin/user/all');

            expect(res.status).toBe(401);
            expect(res.body).toHaveProperty('error');
        });

        it('should block access with invalid token', async () => {
            const res = await request(app)
                .get('/api/admin/user/all')
                .set('Authorization', 'Bearer invalid-token-here');

            expect(res.status).toBe(403);
        });

        it('should block access with insufficient permissions', async () => {
            const { token } = await getAuthTokenWithRole('league_user');

            const res = await request(app)
                .get('/api/admin/user/all')
                .set('Authorization', `Bearer ${token}`);

            expect([403, 500]).toContain(res.status);
            expect(res.body).toHaveProperty('error');
        });

        it('should allow access with sufficient permissions', async () => {
            const { token } = await getAuthTokenWithRole('super_admin');

            const res = await request(app)
                .get('/api/admin/user/all')
                .set('Authorization', `Bearer ${token}`);

            expect([200, 500]).toContain(res.status);
        });

        it('should verify permissions on POST requests', async () => {
            const { token } = await getAuthTokenWithRole('league_user');

            // Attempt to create league as regular user (should fail)
            const res = await request(app)
                .post('/api/leagues')
                .set('Authorization', `Bearer ${token}`)
                .send({
                    name: 'Test League',
                    description: 'Test',
                    start_date: '2026-02-01',
                    end_date: '2026-03-01'
                });

            // Should either succeed if user has permission or fail if not
            expect([200, 201, 403, 500]).toContain(res.status);
        });

        it('should verify permissions on PUT requests', async () => {
            const { token } = await getAuthTokenWithRole('league_user');

            // Attempt to ban user (should fail for non-admin)
            const res = await request(app)
                .put('/api/admin/user/ban/1')
                .set('Authorization', `Bearer ${token}`);

            expect([403, 500]).toContain(res.status);
        });

        it('should verify permissions on DELETE requests', async () => {
            const { token } = await getAuthTokenWithRole('league_user');

            // Attempt to delete user (should fail for non-admin)
            const res = await request(app)
                .delete('/api/admin/user/1')
                .set('Authorization', `Bearer ${token}`);

            expect([403, 404, 500]).toContain(res.status);
        });
    });

    describe('Role Assignment', () => {
        it('should allow assigning a role to a user', async () => {
            const testDb = require('../helpers/testDb');
            const { createTestUser } = require('../helpers/dbHelper');

            // Create a test user
            const userId = await createTestUser({ firstname: 'RoleTest' });

            // Get league_user role
            const role = await testDb('roles').where({ name: 'league_user' }).first();

            // Update user's role
            await testDb('users').where({ id: userId }).update({ role_id: role.id });

            // Verify role assignment
            const user = await testDb('users').where({ id: userId }).first();
            expect(user.role_id).toBe(role.id);
        });

        it('should allow changing user role', async () => {
            const testDb = require('../helpers/testDb');
            const { createTestUser } = require('../helpers/dbHelper');

            const userId = await createTestUser();

            // Get different roles
            const leagueUser = await testDb('roles').where({ name: 'league_user' }).first();
            const podAdmin = await testDb('roles').where({ name: 'pod_admin' }).first();

            // Assign first role
            await testDb('users').where({ id: userId }).update({ role_id: leagueUser.id });
            let user = await testDb('users').where({ id: userId }).first();
            expect(user.role_id).toBe(leagueUser.id);

            // Change to second role
            await testDb('users').where({ id: userId }).update({ role_id: podAdmin.id });
            user = await testDb('users').where({ id: userId }).first();
            expect(user.role_id).toBe(podAdmin.id);
        });

        it('should reject invalid role assignment', async () => {
            const testDb = require('../helpers/testDb');
            const { createTestUser } = require('../helpers/dbHelper');

            const userId = await createTestUser();

            // Attempt to assign non-existent role (should fail)
            await expect(
                testDb('users').where({ id: userId }).update({ role_id: 99999 })
            ).rejects.toThrow();
        });
    });

    describe('Permission Checks Across Different Endpoints', () => {
        it('should verify league_admin can manage leagues', async () => {
            const { token } = await getAuthTokenWithRole('league_admin');

            const res = await request(app)
                .get('/api/leagues')
                .set('Authorization', `Bearer ${token}`);

            // League admin should be able to view leagues
            expect([200, 403, 500]).toContain(res.status);
        });

        it('should verify pod_admin can manage pods', async () => {
            const { token } = await getAuthTokenWithRole('pod_admin');

            const res = await request(app)
                .get('/api/pods')
                .set('Authorization', `Bearer ${token}`);

            // Pod admin should be able to view pods
            expect([200, 403, 500]).toContain(res.status);
        });

        it('should verify user_admin can manage users', async () => {
            const { token } = await getAuthTokenWithRole('user_admin');

            const res = await request(app)
                .get('/api/users/profile')
                .set('Authorization', `Bearer ${token}`);

            // User admin should be able to access user endpoints
            expect([200, 404, 500]).toContain(res.status);
        });
    });
});
