const express = require('express');
const router = express.Router();
const {
    getAllUsers,
    deactivateUser,
    activateUser,
    banUser,
    unbanUser,
    getUserDetails,
    resetUserPassword,
    getLeagueReport,
    getPendingRoleRequests,
    reviewRoleRequest,
    assignUserRole,
    getAllRoles
} = require('../controllers/adminController');
const authenticateToken = require('../middlewares/authentication');
const authorizePermission = require('../middlewares/authorizePermission');

// Import podsAdmin routes
const podsAdminRoutes = require('./podsAdmin');

// Admin Endpoints
router.get(
    '/user/all',
    authenticateToken,
    authorizePermission(['admin_user_read']), // Permission to read all users
    getAllUsers
);
router.put(
    '/user/deactivate/:id',
    authenticateToken,
    authorizePermission(['admin_user_update']), // Permission to deactivate a user
    deactivateUser
);
router.put(
    '/user/activate/:id',
    authenticateToken,
    authorizePermission(['admin_user_update']), // Permission to activate a user
    activateUser
);
router.put(
    '/user/ban/:id',
    authenticateToken,
    authorizePermission(['admin_user_update']), // Permission to ban a user
    banUser
);
router.put(
    '/user/unban/:id',
    authenticateToken,
    authorizePermission(['admin_user_update']), // Permission to unban a user
    unbanUser
);
router.get(
    '/user/:id',
    authenticateToken,
    authorizePermission(['admin_user_read']), // Permission to view user details
    getUserDetails
);
router.put(
    '/user/reset-password/:id',
    authenticateToken,
    authorizePermission(['admin_user_update']), // Permission to reset a user's password
    resetUserPassword
);
router.get(
    '/reports/leagues',
    authenticateToken,
    authorizePermission(['admin_generate_reports']), // Permission to generate league reports
    getLeagueReport
);
router.get(
    '/role-requests',
    authenticateToken,
    authorizePermission(['admin_user_read']), // Permission to view role requests
    getPendingRoleRequests
);
router.post(
    '/role-requests/review',
    authenticateToken,
    authorizePermission(['admin_user_update']), // Permission to review role requests
    reviewRoleRequest
);
router.put(
    '/user/:userId/role',
    authenticateToken,
    authorizePermission(['admin_user_update']), // Permission to assign roles
    assignUserRole
);
router.get(
    '/roles',
    authenticateToken,
    authorizePermission(['admin_user_read']), // Permission to view roles
    getAllRoles
);

// Add podsAdmin routes as a subroute
router.use('/pods', podsAdminRoutes);

module.exports = router;