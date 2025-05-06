const { resolveRolesAndPermissions } = require('../utils/permissionsUtils');

module.exports = (requiredPermissions) => {
    return async (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Unauthorized. User not authenticated.' });
        }

        try {
            const { permissions } = await resolveRolesAndPermissions(req.user.role_id);

            const userPermissionNames = permissions.map((perm) => perm.name);

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