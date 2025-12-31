const db = require('./testDb');

/**
 * Creates a permission if it doesn't exist
 */
async function createPermission(name, description = '') {
    let permission = await db('permissions').where({ name }).first();

    if (!permission) {
        const [permissionId] = await db('permissions').insert({
            name,
            description: description || `Permission for ${name}`
        });
        permission = { id: permissionId, name };
    }

    return permission;
}

/**
 * Assigns a permission to a role
 */
async function assignPermissionToRole(roleId, permissionName) {
    const permission = await createPermission(permissionName);

    // Check if already assigned
    const existing = await db('role_permissions')
        .where({ role_id: roleId, permission_id: permission.id })
        .first();

    if (!existing) {
        await db('role_permissions').insert({
            role_id: roleId,
            permission_id: permission.id
        });
    }
}

/**
 * Creates a role with all specified permissions
 */
async function createRoleWithPermissions(roleName, permissions = []) {
    // Create or get role
    let role = await db('roles').where({ name: roleName }).first();

    if (!role) {
        const [roleId] = await db('roles').insert({
            name: roleName,
            description: `Test role: ${roleName}`
            // Removed is_system_role - doesn't exist in schema
        });
        role = { id: roleId, name: roleName };
    }

    // Assign all permissions
    for (const permissionName of permissions) {
        await assignPermissionToRole(role.id, permissionName);
    }

    return role;
}

module.exports = {
    createPermission,
    assignPermissionToRole,
    createRoleWithPermissions
};