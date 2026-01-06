/**
 * @fileoverview Main router file that combines all route modules.
 * This file imports and mounts individual route modules for the application.
 */

const express = require('express');
const router = express.Router();

/**
 * Mounts user-related routes at `/auth`.
 * @module routes/auth
 */
try {
    const authRoutes = require('./auth');
    router.use('/auth', authRoutes); // Authentication-related routes
} catch (err) {
    console.error('Error loading authRoutes:', err.message);
}

/**
 * Mounts user-related routes at `/users`.
 * @module routes/users
 */
try {
    const userRoutes = require('./users');
    router.use('/users', userRoutes); // Authentication and user-related routes
} catch (err) {
    console.error('Error loading userRoutes:', err.message);
}

/**
 * Mounts league-related routes at `/leagues`.
 * @module routes/leagues
 */
try {
    const leagueRoutes = require('./leagues');
    router.use('/leagues', leagueRoutes); // League-related routes
} catch (err) {
    console.error('Error loading leagueRoutes:', err.message);
}

/**
 * Mounts user-league-related routes at `/user-leagues`.
 * @module routes/userLeagues
 */
try {
    const userLeagueRoutes = require('./userLeagues');
    router.use('/user-leagues', userLeagueRoutes); // User-League related routes
} catch (err) {
    console.error('Error loading userLeagueRoutes:', err.message);
}

/**
 * Mounts admin-related routes at `/admin`.
 * @module routes/admin
 */
try {
    const adminRoutes = require('./admin');
    router.use('/admin', adminRoutes); // Admin-specific routes
} catch (err) {
    console.error('Error loading adminRoutes:', err.message);
}

/**
 * Mounts notification-related routes at `/notifications`.
 * @module routes/notifications
 */
try {
    const notificationRoutes = require('./notifications');
    router.use('/notifications', notificationRoutes); // Notifications-related routes
} catch (err) {
    console.error('Error loading notificationRoutes:', err.message);
}

/**
 * Mounts pod-related routes at `/pods`.
 * @module routes/pods
 */
try {
    const podsRoutes = require('./pods');
    router.use('/pods', podsRoutes); // Pods-related routes
} catch (err) {
    console.error('Error loading podsRoutes:', err.message);
}

/**
 * Mounts deck-related routes at `/decks`.
 * @module routes/decks
 */
try {
    const decksRoutes = require('./decks');
    router.use('/decks', decksRoutes); // Decks-related routes
} catch (err) {
    console.error('Error loading decksRoutes:', err.message);
}

/**
 * Mounts scryfall-related routes at `/scryfall`.
 * @module routes/scryfall
 */
try {
    const scryfallRoutes = require('./scryfall');
    router.use('/scryfall', scryfallRoutes); // Scryfall-related routes
} catch (err) {
    console.error('Error loading scryfallRoutes:', err.message);
}

/**
 * Mounts award-related routes at `/awards`.
 * @module routes/awards
 */
try {
    const awardsRoutes = require('./awards');
    router.use('/awards', awardsRoutes); // Awards-related routes
} catch (err) {
    console.error('Error loading awardsRoutes:', err.message);
}

/**
 * Mounts budget-related routes at `/budgets`.
 * @module routes/budgets
 */
try {
    const budgetsRoutes = require('./budgets');
    router.use('/budgets', budgetsRoutes); // Budget-related routes
} catch (err) {
    console.error('Error loading budgetsRoutes:', err.message);
}

module.exports = router;