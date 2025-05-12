const db = require('../models/db');

// Create a league
const createLeague = async (req, res) => {
    const { name, start_date, end_date, description, max_players, weekly_budget, league_code } = req.body;

    if (!name || !start_date || !end_date) {
        return res.status(400).json({ error: 'Name, start_date, and end_date are required.' });
    }

    try {
        await db('leagues').insert({
            name,
            start_date,
            end_date,
            description,
            max_players,
            weekly_budget,
            league_code,
        });

        res.status(201).json({ message: 'League created successfully.' });
    } catch (err) {
        console.error('Error creating league:', err.message);
        res.status(500).json({ error: 'Failed to create league.' });
    }
};

// Set active league
const setActiveLeague = async (req, res) => {
    const { league_id } = req.body;

    if (!league_id) {
        return res.status(400).json({ error: 'League ID is required.' });
    }

    try {
        // Deactivate the currently active league
        await db('leagues').update({ is_active: false }).where({ is_active: true });

        // Activate the new league
        const result = await db('leagues').update({ is_active: true }).where({ id: league_id });

        if (result === 0) {
            return res.status(404).json({ error: 'League not found.' });
        }

        res.status(200).json({ message: 'League set as active successfully.' });
    } catch (err) {
        console.error('Error setting active league:', err.message);
        res.status(500).json({ error: 'Failed to set active league.' });
    }
};

// Update league details
const updateLeague = async (req, res) => {
    const { id } = req.params;
    const { name, start_date, end_date, description, max_players, weekly_budget, current_week } = req.body;

    if (!id) {
        return res.status(400).json({ error: 'League ID is required.' });
    }

    try {
        const updates = {};
        if (name) updates.name = name;
        if (start_date) updates.start_date = start_date;
        if (end_date) updates.end_date = end_date;
        if (description) updates.description = description;
        if (max_players) updates.max_players = max_players;
        if (weekly_budget) updates.weekly_budget = weekly_budget;
        if (current_week) updates.current_week = current_week;

        const result = await db('leagues').update(updates).where({ id });

        if (result === 0) {
            return res.status(404).json({ error: 'League not found.' });
        }

        res.status(200).json({ message: 'League updated successfully.' });
    } catch (err) {
        console.error('Error updating league:', err.message);
        res.status(500).json({ error: 'Failed to update league.' });
    }
};

// Get all leagues
const getLeagues = async (req, res) => {
    try {
        const leagues = await db('leagues').select('*').orderBy('start_date', 'desc');
        res.status(200).json(leagues);
    } catch (err) {
        console.error('Error fetching leagues:', err.message);
        res.status(500).json({ error: 'Failed to fetch leagues.' });
    }
};

// Get active league
const getActiveLeague = async (req, res) => {
    try {
        const league = await db('leagues').select('*').where({ is_active: true }).first();

        if (!league) {
            return res.status(404).json({ error: 'No active league found.' });
        }

        res.status(200).json(league);
    } catch (err) {
        console.error('Error fetching active league:', err.message);
        res.status(500).json({ error: 'Failed to fetch active league.' });
    }
};

// Get details of a specific league
const getLeagueDetails = async (req, res) => {
    const { id } = req.params;

    try {
        const league = await db('leagues').select('*').where({ id }).first();

        if (!league) {
            return res.status(404).json({ error: 'League not found.' });
        }

        res.status(200).json(league);
    } catch (err) {
        console.error('Error fetching league details:', err.message);
        res.status(500).json({ error: 'Failed to fetch league details.' });
    }
};

// Get league stats and leaderboard
const getLeagueStats = async (req, res) => {
    const { leagueId } = req.params;

    try {
        // Fetch leaderboard
        const leaderboard = await db('user_leagues as ul')
            .join('users as u', 'ul.user_id', 'u.id')
            .select(
                'u.id as player_id',
                'u.firstname as firstname',
                'u.lastname as lastname',
                'ul.league_wins as wins',
                'ul.league_losses as losses',
                'ul.league_draws as draws',
                db.raw('ul.league_wins + ul.league_losses + ul.league_draws AS total_games'),
                db.raw(`
                    ROUND(
                        (ul.league_wins / NULLIF(ul.league_wins + ul.league_losses + ul.league_draws, 0)) * 100, 2
                    ) AS win_rate
                `)
            )
            .where('ul.league_id', leagueId)
            .orderBy([
                { column: 'win_rate', order: 'desc' },
                { column: 'wins', order: 'desc' },
                { column: 'total_games', order: 'desc' }
            ]);

        // Fetch league stats
        const stats = await db('user_leagues')
            .where({ league_id: leagueId })
            .count('id as total_players')
            .first();

        res.status(200).json({ leaderboard, stats });
    } catch (err) {
        console.error('Error fetching league stats:', err.message);
        res.status(500).json({ error: 'Failed to fetch league stats.' });
    }
};

// Search leagues
const searchLeagues = async (req, res) => {
    const { query } = req.query;

    if (!query) {
        return res.status(400).json({ error: 'Search query is required.' });
    }

    try {
        const leagues = await db('leagues')
            .where('name', 'like', `%${query}%`)
            .orWhere('description', 'like', `%${query}%`)
            .select('*');

        res.status(200).json(leagues);
    } catch (err) {
        console.error('Error searching leagues:', err.message);
        res.status(500).json({ error: 'Failed to search leagues.' });
    }
};

// Invite user to a league
const inviteToLeague = async (req, res) => {
    const { leagueId } = req.params;
    const { userId } = req.body;

    try {
        // Validate league
        const league = await db('leagues').where({ id: leagueId }).first();
        if (!league) {
            return res.status(404).json({ error: 'League not found.' });
        }

        // Validate user
        const user = await db('users').where({ id: userId }).first();
        if (!user) {
            return res.status(404).json({ error: 'User not found.' });
        }

        // Check if user is already in the league
        const existingEntry = await db('user_leagues').where({ user_id: userId, league_id: leagueId }).first();
        if (existingEntry) {
            return res.status(400).json({ error: 'User is already in the league.' });
        }

        // Send invitation (store in a table or send via email)
        await db('league_invitations').insert({ league_id: leagueId, user_id: userId });

        res.status(201).json({ message: 'Invitation sent successfully.' });
    } catch (err) {
        console.error('Error inviting user to league:', err.message);
        res.status(500).json({ error: 'Failed to send invitation.' });
    }
};

// Fetch all pending signup requests
const getSignupRequests = async (req, res) => {
    try {
        const requests = await db('league_signup_requests as lsr')
            .join('users as u', 'lsr.user_id', 'u.id')
            .join('leagues as l', 'lsr.league_id', 'l.id')
            .select(
                'lsr.id',
                'u.firstname',
                'u.lastname',
                'u.email',
                'l.name as league_name',
                'lsr.status',
                'lsr.created_at'
            )
            .where('lsr.status', 'pending');

        res.status(200).json(requests);
    } catch (err) {
        console.error('Error fetching signup requests:', err.message);
        res.status(500).json({ error: 'Failed to fetch signup requests.' });
    }
};

// Approve a signup request
const approveSignupRequest = async (req, res) => {
    const { id } = req.params; // ID of the signup request

    try {
        // Fetch the signup request
        const request = await db('league_signup_requests').where({ id }).first();

        if (!request) {
            return res.status(404).json({ error: 'Signup request not found.' });
        }

        // Approve the request
        await db.transaction(async (trx) => {
            // Update the signup request status to 'approved'
            await trx('league_signup_requests').where({ id }).update({ status: 'approved' });

            // Activate the corresponding user_leagues entry
            await trx('user_leagues')
                .where({ request_id: id }) // Use request_id to find the corresponding user_leagues entry
                .update({ is_active: true });
        });

        res.status(200).json({ message: 'Signup request approved successfully.' });
    } catch (err) {
        console.error('Error approving signup request:', err.message);
        res.status(500).json({ error: 'Failed to approve signup request.' });
    }
};

// Reject a signup request
const rejectSignupRequest = async (req, res) => {
    const { id } = req.params; // ID of the signup request

    try {
        // Fetch the signup request
        const request = await db('league_signup_requests').where({ id }).first();

        if (!request) {
            return res.status(404).json({ error: 'Signup request not found.' });
        }

        // Reject the request
        await db.transaction(async (trx) => {
            // Update the signup request status to 'rejected'
            await trx('league_signup_requests').where({ id }).update({ status: 'rejected' });

            // Ensure the corresponding user_leagues entry remains inactive
            await trx('user_leagues')
                .where({ request_id: id }) // Use request_id to find the corresponding user_leagues entry
                .update({ is_active: false });
        });

        res.status(200).json({ message: 'Signup request rejected successfully.' });
    } catch (err) {
        console.error('Error rejecting signup request:', err.message);
        res.status(500).json({ error: 'Failed to reject signup request.' });
    }
};

// Export all functions
module.exports = {
    createLeague,
    setActiveLeague,
    updateLeague,
    getLeagues,
    getActiveLeague,
    getLeagueDetails,
    getLeagueStats,
    searchLeagues,
    inviteToLeague,
    getSignupRequests,
    approveSignupRequest,
    rejectSignupRequest,
};