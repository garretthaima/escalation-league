const db = require('../models/db'); // Import the database connection
const { resolveRolesAndPermissions } = require('../utils/permissionsUtils');

// Permissions that grant global league access (admin-level permissions)
const ADMIN_LEAGUE_PERMISSIONS = [
    'league_create',      // Can create leagues = can access all
    'league_delete',      // Can delete leagues = can access all
    'league_set_active',  // Can set active = can access all
];

const authorizeLeagueAccess = async (req, res, next) => {
    try {
        const playerId = req.user.id;
        const leagueId = req.params.leagueId || req.params.id;

        // Check if user has admin-level permissions that grant access to all leagues
        // This replaces the hard-coded role_id check with permission-based authorization
        const { permissions } = await resolveRolesAndPermissions(req.user.role_id);
        const userPermissionNames = permissions.map(perm => perm.name);

        // Users with any admin league permission can access any league
        const hasAdminAccess = ADMIN_LEAGUE_PERMISSIONS.some(perm =>
            userPermissionNames.includes(perm)
        );

        if (hasAdminAccess) {
            return next();
        }

        // Check if the player is part of the league
        const leaguePlayer = await db('user_leagues')
            .where({ league_id: leagueId, user_id: playerId })
            .first();

        if (!leaguePlayer) {
            return res.status(403).json({ error: 'You do not have access to this league.' });
        }

        next();
    } catch (err) {
        console.error('Error authorizing league access:', err.message);
        res.status(500).json({ error: 'Failed to authorize league access.' });
    }
};

module.exports = authorizeLeagueAccess;