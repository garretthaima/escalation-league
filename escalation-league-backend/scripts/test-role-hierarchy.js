/**
 * Script to test if role hierarchy is working correctly
 */
const { resolveRolesAndPermissions } = require('../utils/permissionsUtils');
const db = require('../models/db');

async function testRoleHierarchy() {
    console.log('Testing Role Hierarchy...\n');

    // Get role IDs
    const roles = await db('roles').select('id', 'name');
    const roleMap = {};
    roles.forEach(role => roleMap[role.name] = role.id);

    console.log('Role IDs:', roleMap, '\n');

    // Test league_admin (should inherit from user)
    console.log('=== Testing league_admin (role', roleMap.league_admin, ') ===');
    const leagueAdminResult = await resolveRolesAndPermissions(roleMap.league_admin);
    console.log('Accessible roles:', leagueAdminResult.accessibleRoles);
    console.log('Permissions:', leagueAdminResult.permissions.map(p => p.name).sort());
    console.log('Has league_read?', leagueAdminResult.permissions.some(p => p.name === 'league_read'));
    console.log('Has league_view_active?', leagueAdminResult.permissions.some(p => p.name === 'league_view_active'));
    console.log('Has league_view_details?', leagueAdminResult.permissions.some(p => p.name === 'league_view_details'));
    console.log('');

    // Test pod_admin (should inherit from user)
    console.log('=== Testing pod_admin (role', roleMap.pod_admin, ') ===');
    const podAdminResult = await resolveRolesAndPermissions(roleMap.pod_admin);
    console.log('Accessible roles:', podAdminResult.accessibleRoles);
    console.log('Permissions:', podAdminResult.permissions.map(p => p.name).sort());
    console.log('Has league_read?', podAdminResult.permissions.some(p => p.name === 'league_read'));
    console.log('Has league_view_active?', podAdminResult.permissions.some(p => p.name === 'league_view_active'));
    console.log('Has league_view_details?', podAdminResult.permissions.some(p => p.name === 'league_view_details'));
    console.log('');

    // Test user (base role)
    console.log('=== Testing user (role', roleMap.user, ') ===');
    const userResult = await resolveRolesAndPermissions(roleMap.user);
    console.log('Accessible roles:', userResult.accessibleRoles);
    console.log('Permissions:', userResult.permissions.map(p => p.name).sort());
    console.log('');

    // Show role hierarchy
    console.log('=== Role Hierarchy Table ===');
    const hierarchy = await db('role_hierarchy')
        .join('roles as parent', 'role_hierarchy.parent_role_id', 'parent.id')
        .join('roles as child', 'role_hierarchy.child_role_id', 'child.id')
        .select('parent.name as parent', 'child.name as child');
    hierarchy.forEach(h => console.log(`${h.parent} -> ${h.child}`));

    await db.destroy();
}

testRoleHierarchy().catch(err => {
    console.error('Error:', err);
    process.exit(1);
});
