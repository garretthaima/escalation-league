const db = require('../models/db');

module.exports = (requiredPermissions) => {
    return async (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Unauthorized. User not authenticated.' });
        }

        try {
            // Fetch all roles inherited by the user's role
            const inheritedRoles = await db('role_hierarchy')
                .select('parent_role_id')
                .where('child_role_id', req.user.role_id);

            const roleIds = [req.user.role_id, ...inheritedRoles.map((r) => r.parent_role_id)];

            // Fetch all permissions for the user's roles
            const userPermissions = await db('role_permissions')
                .join('permissions', 'role_permissions.permission_id', 'permissions.id')
                .whereIn('role_permissions.role_id', roleIds)
                .select('permissions.name');

            const userPermissionNames = userPermissions.map((perm) => perm.name);

            // Check if the user has all required permissions
            const hasPermission = requiredPermissions.every((perm) =>
                userPermissionNames.includes(perm)
            );

            if (!hasPermission) {
                return res.status(403).json({ error: 'Access denied. Insufficient permissions.' });
            }

            next();
        } catch (err) {
            console.error('Error checking permissions:', err.message);
            res.status(500).json({ error: 'Failed to authorize permissions.' });
        }
    };
};