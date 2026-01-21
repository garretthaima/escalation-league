const express = require('express');
const router = express.Router();
const {
    getAllSettings,
    getSetting,
    updateSetting,
    createSetting,
    deleteSetting
} = require('../controllers/settingsAdminController');
const authenticateToken = require('../middlewares/authentication');
const authorizePermission = require('../middlewares/authorizePermission');

// All routes require authentication and settings_manage permission

// Get all settings
router.get(
    '/',
    authenticateToken,
    authorizePermission(['settings_manage']),
    getAllSettings
);

// Get a single setting by key
router.get(
    '/:key',
    authenticateToken,
    authorizePermission(['settings_manage']),
    getSetting
);

// Create a new setting
router.post(
    '/',
    authenticateToken,
    authorizePermission(['settings_manage']),
    createSetting
);

// Update a setting
router.put(
    '/:key',
    authenticateToken,
    authorizePermission(['settings_manage']),
    updateSetting
);

// Delete a setting
router.delete(
    '/:key',
    authenticateToken,
    authorizePermission(['settings_manage']),
    deleteSetting
);

module.exports = router;
