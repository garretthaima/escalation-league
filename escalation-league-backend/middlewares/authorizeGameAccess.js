const db = require('../models/db'); // Import the database module

const authorizeGameAccess = async (req, res, next) => {
    const userId = req.user.id;
    const { gameId } = req.params;

    try {
        // Check if the user is a league admin
        const isLeagueAdmin = req.user.role === 'league_admin';
        if (isLeagueAdmin) return next();

        // Check if the user is a participant in the game
        const participant = await db('game_players')
            .where({ game_id: gameId, player_id: userId })
            .first();

        if (!participant) {
            return res.status(403).json({ error: 'Access denied. You are not a participant in this game.' });
        }

        next();
    } catch (err) {
        console.error('Error authorizing game access:', err.message);
        res.status(500).json({ error: 'Failed to authorize access.' });
    }
};

module.exports = authorizeGameAccess;