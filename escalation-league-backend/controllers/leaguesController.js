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

// Get games in a league
const getLeagueGames = async (req, res) => {
    const { id } = req.params; // League ID

    try {
        const games = await db('games as g')
            .join('game_players as gp', 'g.id', 'gp.game_id') // Join with game_players table
            .join('users as u', 'gp.player_id', 'u.id') // Join with users table to get player details
            .select(
                'g.id as game_id',
                'g.league_id',
                'g.date_played',
                'g.result',
                db.raw('GROUP_CONCAT(u.username) as players'), // Combine player usernames into a single string
                db.raw('GROUP_CONCAT(u.id) as player_ids') // Combine player IDs into a single string
            )
            .where('g.league_id', id)
            .groupBy('g.id') // Group by game ID to aggregate player data
            .orderBy('g.date_played', 'desc'); // Order by the date the game was played

        if (games.length === 0) {
            return res.status(404).json({ error: 'No games found for this league.' });
        }

        res.status(200).json(games);
    } catch (err) {
        console.error('Error fetching league games:', err.message);
        res.status(500).json({ error: 'Failed to fetch league games.' });
    }
};

// Get leaderboard for a league
const getLeagueLeaderboard = async (req, res) => {
    const { id } = req.params;

    try {
        const leaderboard = await db('users as u')
            .join('games as g', 'g.creator_id', 'u.id')
            .select(
                'u.username',
                db.raw('SUM(CASE WHEN g.result = ? THEN 1 ELSE 0 END) AS wins', ['win']),
                db.raw('SUM(CASE WHEN g.result = ? THEN 1 ELSE 0 END) AS losses', ['loss']),
                db.raw('COUNT(g.id) AS total_games'),
                db.raw(`
                    ROUND(
                        SUM(CASE WHEN g.result = ? THEN 1 ELSE 0 END) /
                        COUNT(g.id) * 100, 2
                    ) AS win_rate
                `, ['win'])
            )
            .where('g.league_id', id)
            .groupBy('u.id')
            .orderBy([
                { column: 'win_rate', order: 'desc' },
                { column: 'wins', order: 'desc' }
            ]);

        if (leaderboard.length === 0) {
            return res.status(404).json({ error: 'No leaderboard data found for this league.' });
        }

        res.status(200).json(leaderboard);
    } catch (err) {
        console.error('Error fetching league leaderboard:', err.message);
        res.status(500).json({ error: 'Failed to fetch league leaderboard.' });
    }
};

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


const getLeagueStats = async (req, res) => {
    const { leagueId } = req.params;

    try {
        const stats = await db('games')
            .where({ league_id: leagueId })
            .count('id as total_games')
            .first();

        const mostActivePlayers = await db('user_leagues as ul')
            .join('users as u', 'ul.user_id', 'u.id')
            .select('u.username', db.raw('COUNT(ul.league_id) as games_played'))
            .where('ul.league_id', leagueId)
            .groupBy('u.id')
            .orderBy('games_played', 'desc')
            .limit(5);

        res.status(200).json({ stats, mostActivePlayers });
    } catch (err) {
        console.error('Error fetching league stats:', err.message);
        res.status(500).json({ error: 'Failed to fetch league stats.' });
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
    getLeagueGames,
    getLeagueLeaderboard,
    searchLeagues,
    inviteToLeague,
    getLeagueStats
};