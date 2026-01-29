const express = require('express');
const router = express.Router();
const {
    getAllPermissions,
    getAllRolesWithDetails,
    getRoleHierarchy,
    getRolePermissions,
    getPermissionMatrix,
    updateRolePermissions,
    updateRoleHierarchy,
    createRole,
    deleteRole
} = require('../controllers/permissionsController');
const authenticateToken = require('../middlewares/authentication');
const authorizePermission = require('../middlewares/authorizePermission');

// All routes require super_admin role (checked via permission)
// Using a custom middleware to check if user has super_admin role
const requireSuperAdmin = async (req, res, next) => {
    const db = require('../models/db');
    try {
        const user = await db('users')
            .join('roles', 'users.role_id', 'roles.id')
            .where('users.id', req.user.id)
            .select('roles.name as role_name')
            .first();

        if (!user || user.role_name !== 'super_admin') {
            return res.status(403).json({
                error: 'Access denied. Super admin role required.'
            });
        }
        next();
    } catch (err) {
        console.error('Error checking super admin role:', err);
        res.status(500).json({ error: 'Authorization check failed' });
    }
};

// Get all permissions
router.get(
    '/',
    authenticateToken,
    requireSuperAdmin,
    getAllPermissions
);

// Get all roles with details
router.get(
    '/roles',
    authenticateToken,
    requireSuperAdmin,
    getAllRolesWithDetails
);

// Get role hierarchy tree
router.get(
    '/hierarchy',
    authenticateToken,
    requireSuperAdmin,
    getRoleHierarchy
);

// Get permission matrix (all roles x all permissions)
router.get(
    '/matrix',
    authenticateToken,
    requireSuperAdmin,
    getPermissionMatrix
);

// Get permissions for a specific role (direct + inherited)
router.get(
    '/roles/:roleId',
    authenticateToken,
    requireSuperAdmin,
    getRolePermissions
);

// Update permissions for a role
router.put(
    '/roles/:roleId',
    authenticateToken,
    requireSuperAdmin,
    updateRolePermissions
);

// Update role hierarchy (change or remove parent role)
router.put(
    '/roles/:roleId/hierarchy',
    authenticateToken,
    requireSuperAdmin,
    updateRoleHierarchy
);

// Create a new role
router.post(
    '/roles',
    authenticateToken,
    requireSuperAdmin,
    createRole
);

// Delete a role
router.delete(
    '/roles/:roleId',
    authenticateToken,
    requireSuperAdmin,
    deleteRole
);

module.exports = router;
