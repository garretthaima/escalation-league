const express = require('express');
const router = express.Router();
const {
    getUserProfile,
    updateUserProfile,
    deleteUserAccount,
    changePassword,
    updateUserStats,
    getUserPermissions,
    getUserSummary,
    getUserSetting,
    updateUserSetting,
} = require('../controllers/usersController');
const authenticateToken = require('../middlewares/authentication');
const authorizePermission = require('../middlewares/authorizePermission');

// User Endpoints
router.get(
    '/profile',
    authenticateToken,
    authorizePermission(['auth_view_profile']), // Permission to view user profile
    getUserProfile
);
router.put(
    '/update',
    authenticateToken,
    authorizePermission(['auth_update_profile']), // Permission to update user profile
    updateUserProfile
);
router.delete(
    '/delete',
    authenticateToken,
    authorizePermission(['auth_delete_account']), // Permission to delete user account
    deleteUserAccount
);
router.put(
    '/change-password',
    authenticateToken,
    authorizePermission(['auth_update_profile']), // Permission to change password (treated as profile update)
    changePassword
);
router.put(
    '/update-stats',
    authenticateToken,
    authorizePermission(['auth_update_profile']), // Permission to update user stats (treated as profile update)
    updateUserStats
);

router.get(
    '/permissions',
    authenticateToken, // Ensure the user is authenticated
    getUserPermissions
);

router.get(
    '/settings',
    authenticateToken, // Ensure the user is authenticated
    getUserSetting // Controller method to fetch user settings
);

router.put(
    '/settings',
    authenticateToken, // Ensure the user is authenticated
    updateUserSetting // Controller method to update user settings
);

// Fetch basic user information
router.get(
    '/profile/:id',
    authenticateToken, // Ensure the user is authenticated
    authorizePermission(['auth_view_basic_info']), // Permission to view basic user info
    getUserSummary // Controller method to fetch basic user info
);

module.exports = router;