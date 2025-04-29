const express = require('express');
const router = express.Router();

const userRoutes = require('./users');
const gameRoutes = require('./games');
const leagueRoutes = require('./leagues');
const userLeagueRoutes = require('./userLeagues'); // Import user league routes
const adminRoutes = require('./admin'); // Import admin routes
const notificationRoutes = require('./notifications'); // Import notifications routes
const podsRoutes = require('./pods');

// Define route prefixes
router.use('/auth', userRoutes); // Authentication and user-related routes
router.use('/games', gameRoutes); // Game-related routes
router.use('/leagues', leagueRoutes); // League-related routes
router.use('/user-leagues', userLeagueRoutes); // User-League related routes
router.use('/admin', adminRoutes); // Admin-specific routes
router.use('/notifications', notificationRoutes); // Notifications-related routes
router.use('/pods', podsRoutes);

module.exports = router;