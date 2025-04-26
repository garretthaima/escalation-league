const express = require('express');
const router = express.Router();
const { getNotifications } = require('../controllers/notificationsController');
const authenticateToken = require('../middlewares/authentication');

router.get('/', authenticateToken, getNotifications); // Fetch notifications

module.exports = router;