const db = require('../models/db');

// Sign up for a league
const signUpForLeague = async (req, res) => {
    const userId = req.user.id;
    const { league_id } = req.body;

    if (!league_id) {
        return res.status(400).json({ error: 'League ID is required.' });
    }

    try {
        // Check if the league exists
        const league = await db('leagues').where({ id: league_id }).first();
        if (!league) {
            return res.status(404).json({ error: 'League not found.' });
        }

        // Check if the user is already signed up
        const existingEntry = await db('user_leagues').where({ user_id: userId, league_id }).first();
        if (existingEntry) {
            return res.status(400).json({ error: 'User is already signed up for this league.' });
        }

        // Add the user to the league
        await db('user_leagues').insert({ user_id: userId, league_id });

        res.status(201).json({ message: 'Successfully signed up for the league.' });
    } catch (err) {
        console.error('Error signing up for league:', err.message);
        res.status(500).json({ error: 'Failed to sign up for the league.' });
    }
};

// View user's league-specific stats
const getUserLeagueStats = async (req, res) => {
    const userId = req.user.id;
    const { league_id } = req.params;

    try {
        const stats = await db('user_leagues')
            .select('league_wins', 'league_losses', 'current_commander', 'decklist_url', 'joined_at')
            .where({ user_id: userId, league_id })
            .first();

        if (!stats) {
            return res.status(404).json({ error: 'No stats found for this league.' });
        }

        res.status(200).json(stats);
    } catch (err) {
        console.error('Error fetching user league stats:', err.message);
        res.status(500).json({ error: 'Failed to fetch user league stats.' });
    }
};

// Update user's league-specific data
const updateUserLeagueData = async (req, res) => {
    const userId = req.user.id;
    const { league_id } = req.params;
    const { current_commander, decklist_url } = req.body;

    try {
        const updates = {};
        if (current_commander) updates.current_commander = current_commander;
        if (decklist_url) updates.decklist_url = decklist_url;

        const result = await db('user_leagues').where({ user_id: userId, league_id }).update(updates);

        if (result === 0) {
            return res.status(404).json({ error: 'No league data found to update.' });
        }

        res.status(200).json({ message: 'League data updated successfully.' });
    } catch (err) {
        console.error('Error updating league data:', err.message);
        res.status(500).json({ error: 'Failed to update league data.' });
    }
};

// Leave a league
const leaveLeague = async (req, res) => {
    const userId = req.user.id;
    const { league_id } = req.params;

    try {
        const result = await db('user_leagues').where({ user_id: userId, league_id }).del();

        if (result === 0) {
            return res.status(404).json({ error: 'No league data found to delete.' });
        }

        res.status(200).json({ message: 'Successfully left the league.' });
    } catch (err) {
        console.error('Error leaving league:', err.message);
        res.status(500).json({ error: 'Failed to leave the league.' });
    }
};

// View all participants in a league (league_admin only)
const getLeagueParticipants = async (req, res) => {
    const { league_id } = req.params;

    try {
        const participants = await db('user_leagues as ul')
            .join('users as u', 'ul.user_id', 'u.id')
            .select('u.id', 'u.firstname', 'u.lastname', 'u.email', 'ul.joined_at')
            .where('ul.league_id', league_id);

        res.status(200).json(participants);
    } catch (err) {
        console.error('Error fetching league participants:', err.message);
        res.status(500).json({ error: 'Failed to fetch league participants.' });
    }
};

module.exports = {
    signUpForLeague,
    getUserLeagueStats,
    updateUserLeagueData,
    leaveLeague,
    getLeagueParticipants,
};