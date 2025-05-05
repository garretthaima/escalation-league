const db = require('../models/db'); // Import the database connection

const authorizeLeagueAccess = async (req, res, next) => {
    try {
        const playerId = req.user.id;
        const leagueId = req.params.leagueId;

        // Check if the player is part of the league
        const leaguePlayer = await db('user_leagues') // Use the correct table name
            .where({ league_id: leagueId, user_id: playerId }) // Adjust column names if necessary
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