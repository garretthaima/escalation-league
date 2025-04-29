const db = require('../models/db');

const authorizeGameAccess = async (req, res, next) => {
    try {
        const playerId = req.user.id; // Assuming the user ID is attached to the request
        const podId = req.params.podId || req.query.podId; // Extract podId from route params or query

        // If no podId is provided, skip this middleware
        if (!podId) {
            return next();
        }

        // Check if the player is part of the pod
        const podPlayer = await db('game_players')
            .where({ pod_id: podId, player_id: playerId })
            .first();

        if (!podPlayer) {
            return res.status(403).json({ error: 'You do not have access to this pod.' });
        }

        next();
    } catch (err) {
        console.error('Error authorizing pod access:', err.message);
        res.status(500).json({ error: 'Failed to authorize pod access.' });
    }
};

module.exports = authorizeGameAccess;