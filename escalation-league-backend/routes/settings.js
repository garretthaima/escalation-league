/**
 * @fileoverview Public settings routes for app-wide configuration
 */

const express = require('express');
const router = express.Router();
const { getPublicSettings } = require('../controllers/settingsController');

/**
 * GET /settings/public
 * Fetches public app settings (timezone, etc.)
 * No authentication required
 */
router.get('/public', getPublicSettings);

module.exports = router;
