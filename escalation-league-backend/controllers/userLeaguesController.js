const db = require('../models/db');

// Sign up for a league
const signUpForLeague = async (req, res) => {
    const { leagueId } = req.body;
    const userId = req.user.id;

    try {
        // Fetch the role ID for 'league_user'
        const leagueUserRole = await db('roles').select('id').where({ name: 'league_user' }).first();
        if (!leagueUserRole) {
            return res.status(500).json({ error: 'Role "league_user" not found in the database.' });
        }

        // Start a transaction to ensure consistency
        await db.transaction(async (trx) => {
            // Add the user to the league
            await trx('user_leagues').insert({
                user_id: userId,
                league_id: leagueId,
                league_wins: 0,
                league_losses: 0,
            });

            // Update the user's role to 'league_user'
            await trx('users').where({ id: userId }).update({ role_id: leagueUserRole.id });
        });

        res.status(200).json({ success: true, message: 'Successfully signed up for the league!' });
    } catch (err) {
        console.error('Error signing up for the league:', err.message);
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

const updateLeagueStats = async (req, res) => {
    const { userId, leagueId, result } = req.body;

    if (!userId || !leagueId || !result) {
        return res.status(400).json({ error: 'User ID, league ID, and result are required.' });
    }

    try {
        const updates = {};
        if (result === 'win') {
            updates.league_wins = db.raw('league_wins + 1');
        } else if (result === 'loss') {
            updates.league_losses = db.raw('league_losses + 1');
        } else {
            return res.status(400).json({ error: 'Invalid result value.' });
        }

        await db('user_leagues').where({ user_id: userId, league_id: leagueId }).update(updates);

        res.status(200).json({ message: 'League stats updated successfully.' });
    } catch (err) {
        console.error('Error updating league stats:', err.message);
        res.status(500).json({ error: 'Failed to update league stats.' });
    }
};

const requestSignupForLeague = async (req, res) => {
    const userId = req.user.id;
    const leagueId = req.body.league_id;

    console.log('User ID:', userId);
    console.log('League ID:', leagueId);

    try {
        if (!leagueId) {
            console.error('League ID is missing.');
            return res.status(400).json({ error: 'League ID is required.' });
        }

        const existingRequest = await db('league_signup_requests')
            .where({ user_id: userId, league_id: leagueId, status: 'pending' })
            .first();

        if (existingRequest) {
            console.warn('Existing signup request found:', existingRequest);
            return res.status(400).json({ error: 'You already have a pending signup request for this league.' });
        }

        await db('league_signup_requests').insert({
            user_id: userId,
            league_id: leagueId,
            status: 'pending',
        });

        console.log('Signup request created successfully.');
        res.status(200).json({ success: true, message: 'Signup request submitted successfully.' });
    } catch (err) {
        console.error('Error submitting signup request:', err.message);
        res.status(500).json({ error: 'Failed to submit signup request.' });
    }
};

const getUserPendingSignupRequests = async (req, res) => {
    const userId = req.user.id;

    try {
        // Fetch pending signup requests for the logged-in user
        const pendingRequests = await db('league_signup_requests')
            .join('leagues', 'league_signup_requests.league_id', 'leagues.id')
            .select('league_signup_requests.id', 'leagues.name as league_name', 'league_signup_requests.status')
            .where({ 'league_signup_requests.user_id': userId, 'league_signup_requests.status': 'pending' });

        res.status(200).json(pendingRequests);
    } catch (err) {
        console.error('Error fetching user pending signup requests:', err.message);
        res.status(500).json({ error: 'Failed to fetch pending signup requests.' });
    }
};

const isUserInLeague = async (req, res) => {
    const userId = req.user.id;

    try {
        console.log('Checking league membership for user ID:', userId);

        // Check if the user is in any league
        const userLeague = await db('user_leagues')
            .join('leagues', 'user_leagues.league_id', 'leagues.id')
            .select('leagues.id as league_id', 'leagues.name as league_name', 'user_leagues.joined_at')
            .where('user_leagues.user_id', userId)
            .first();

        console.log('Query result:', userLeague);

        if (!userLeague) {
            return res.status(404).json({ inLeague: false, message: 'User is not part of any league.' });
        }

        res.status(200).json({ inLeague: true, league: userLeague });
    } catch (err) {
        console.error('Error checking user league membership:', err.message);
        res.status(500).json({ error: 'Failed to check user league membership.' });
    }
};

module.exports = {
    signUpForLeague,
    getUserLeagueStats,
    updateUserLeagueData,
    leaveLeague,
    getLeagueParticipants,
    updateLeagueStats,
    requestSignupForLeague,
    getUserPendingSignupRequests,
    isUserInLeague
};