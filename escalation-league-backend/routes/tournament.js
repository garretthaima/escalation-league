/**
 * Tournament Routes
 * Handles all tournament-related API endpoints
 * Issue #76: Finals Tournament System
 */

const express = require('express');
const {
    endRegularSeason,
    getTournamentStatus,
    getTournamentStandings,
    generateTournamentPods,
    getTournamentPods,
    getChampionshipQualifiers,
    startChampionship,
    completeTournament,
    resetTournament
} = require('../controllers/tournamentController');
const authenticateToken = require('../middlewares/authentication');
const authorizePermission = require('../middlewares/authorizePermission');
const { cacheMiddleware, CACHE_TTL } = require('../middlewares/cacheMiddleware');

const router = express.Router();

// ============================================
// Admin endpoints - require tournament_manage permission
// ============================================

// End regular season and start tournament
router.post(
    '/:id/tournament/end-regular-season',
    authenticateToken,
    authorizePermission(['tournament_manage']),
    endRegularSeason
);

// Generate all qualifying pods
router.post(
    '/:id/tournament/generate-pods',
    authenticateToken,
    authorizePermission(['tournament_manage']),
    generateTournamentPods
);

// Start championship game (create championship pod)
router.post(
    '/:id/tournament/start-championship',
    authenticateToken,
    authorizePermission(['tournament_manage']),
    startChampionship
);

// Complete tournament and record champion
router.post(
    '/:id/tournament/complete',
    authenticateToken,
    authorizePermission(['tournament_manage']),
    completeTournament
);

// Reset tournament (admin only, requires confirmation)
router.post(
    '/:id/tournament/reset',
    authenticateToken,
    authorizePermission(['tournament_manage']),
    resetTournament
);

// ============================================
// Read endpoints - require tournament_view permission
// ============================================

// Get tournament status overview
router.get(
    '/:id/tournament',
    authenticateToken,
    authorizePermission(['tournament_view']),
    cacheMiddleware(CACHE_TTL.SHORT), // Cache for 1 minute
    getTournamentStatus
);

// Get tournament standings/leaderboard
router.get(
    '/:id/tournament/standings',
    authenticateToken,
    authorizePermission(['tournament_view']),
    cacheMiddleware(CACHE_TTL.SHORT),
    getTournamentStandings
);

// Get tournament pods (optionally filtered by round)
router.get(
    '/:id/tournament/pods',
    authenticateToken,
    authorizePermission(['tournament_view']),
    cacheMiddleware(CACHE_TTL.SHORT),
    getTournamentPods
);

// Get championship qualifiers (top 4 after qualifying rounds)
router.get(
    '/:id/tournament/championship-qualifiers',
    authenticateToken,
    authorizePermission(['tournament_view']),
    cacheMiddleware(CACHE_TTL.SHORT),
    getChampionshipQualifiers
);

module.exports = router;
