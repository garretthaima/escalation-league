const db = require('../models/db');

// Utility function to resolve roles and permissions
const resolveRolesAndPermissions = async (roleId) => {
    try {
        // Resolve all roles inherited by the user's role
        const accessibleRoles = await db.withRecursive('role_inheritance', (builder) => {
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
                this.select(db.raw('?', [roleId])); // Include the user's own role
            })
            .then((roles) => roles.map((role) => role.child_role_id));

        // Fetch permissions for all accessible roles
        const permissions = await db('role_permissions')
            .join('permissions', 'role_permissions.permission_id', 'permissions.id')
            .whereIn('role_permissions.role_id', accessibleRoles)
            .select('permissions.id', 'permissions.name');

        // Deduplicate permissions by ID
        const deduplicatedPermissions = Array.from(
            new Map(permissions.map((perm) => [perm.id, perm])).values()
        );

        return { accessibleRoles, permissions: deduplicatedPermissions };
    } catch (err) {
        console.error('Error resolving roles and permissions:', err.message);
        throw new Error('Failed to resolve roles and permissions.');
    }
};

module.exports = { resolveRolesAndPermissions };