const db = require('../models/db');
const redis = require('../utils/redisClient'); // Import the Redis client
const { updateStats } = require('../utils/statsUtils');


// Sign up for a league
const signUpForLeague = async (req, res) => {
    const { leagueId, commander, commanderPartner } = req.body;
    const userId = req.user.id; // Assuming user ID is available from authentication middleware

    try {
        // Check if the user is already signed up for the league
        const existingEntry = await db('user_leagues')
            .where({ user_id: userId, league_id: leagueId })
            .first();

        if (existingEntry) {
            return res.status(400).json({ error: 'You are already signed up for this league.' });
        }

        // Concatenate commander and partner with `//`
        const currentCommander = commanderPartner
            ? `${commander} // ${commanderPartner}`
            : commander;

        // Insert the new entry into the user_leagues table
        await db('user_leagues').insert({
            user_id: userId,
            league_id: leagueId,
            current_commander: currentCommander,
            decklist_url,
        });

        res.status(201).json({ message: 'Successfully signed up for the league.' });
    } catch (error) {
        console.error('Error signing up for league:', error);
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

// Fetch detailed information about a single participant in a league
const getLeagueParticipantDetails = async (req, res) => {
    const { league_id, user_id } = req.params;

    try {
        // Fetch participant details from the database, including decklist_url from the decks table
        const participant = await db('user_leagues as ul')
            .join('users as u', 'ul.user_id', 'u.id')
            .join('decks as d', 'ul.deck_id', 'd.id') // Join with the decks table
            .select(
                'u.id as user_id',
                'u.firstname',
                'u.lastname',
                'u.email',
                'ul.current_commander',
                'ul.commander_partner',
                'ul.league_wins',
                'ul.league_losses',
                'ul.deck_id',
                'd.decklist_url', // Fetch the decklist_url from the decks table
                'ul.joined_at'
            )
            .where({ 'ul.league_id': league_id, 'ul.user_id': user_id })
            .first();

        if (!participant) {
            return res.status(404).json({ error: 'Participant not found in this league.' });
        }

        res.status(200).json({
            user_id: participant.user_id,
            firstname: participant.firstname,
            lastname: participant.lastname,
            email: participant.email,
            commander: participant.current_commander,
            commanderPartner: participant.commander_partner,
            league_wins: participant.league_wins,
            league_losses: participant.league_losses,
            decklist_url: participant.decklist_url || null, // Use the decklist_url from the decks table
            deck_id: participant.deck_id,
            joined_at: participant.joined_at,
        });
    } catch (err) {
        console.error('Error fetching participant details:', err.message);
        res.status(500).json({ error: 'Failed to fetch participant details.' });
    }
};

const updateLeagueStats = async (req, res) => {
    const { userId, leagueId, leagueWins, leagueLosses, leagueDraws } = req.body;

    if (!userId || !leagueId) {
        return res.status(400).json({ error: 'User ID and league ID are required.' });
    }

    if (leagueWins === undefined && leagueLosses === undefined && leagueDraws === undefined) {
        return res.status(400).json({ error: 'At least one of leagueWins, leagueLosses, or leagueDraws must be provided.' });
    }

    try {
        // Use the utility function to update league stats
        await updateStats(
            'user_leagues',
            { user_id: userId, league_id: leagueId },
            { league_wins: leagueWins, league_losses: leagueLosses, league_draws: leagueDraws }
        );

        res.status(200).json({ message: 'League stats updated successfully.' });
    } catch (err) {
        console.error('Error updating league stats:', err.message);
        res.status(500).json({ error: 'Failed to update league stats.' });
    }
};

const requestSignupForLeague = async (req, res) => {
    const userId = req.user.id;
    const { league_id, deck_id, current_commander, commander_partner } = req.body.data;

    console.log('Incoming request body:', req.body.data);
    console.log('Destructured values:', { league_id, deck_id, current_commander, commander_partner });
    console.log('league_id type:', typeof league_id, 'value:', league_id);
    console.log('deck_id type:', typeof deck_id, 'value:', deck_id);
    console.log('league_id is null:', league_id == null);
    console.log('deck_id is null:', deck_id == null);
    if (league_id == null || deck_id == null) {
        console.log('Missing league_id or deck_id in request body.');
        return res.status(400).json({ error: 'League ID and Deck ID are required.' });
    }
    console.log('Got passed the if check for null values.');

    try {

        // Check if the user already has a pending or approved entry
        const existingRequest = await db('league_signup_requests')
            .where({ user_id: userId, league_id })
            .whereIn('status', ['pending', 'approved'])
            .first();

        if (existingRequest) {
            return res.status(400).json({ error: 'You already have a pending or approved signup for this league.' });
        }

        // Start a transaction to ensure both tables are updated atomically
        await db.transaction(async (trx) => {
            // Insert into league_signup_requests
            const requestId = await trx('league_signup_requests').insert({
                user_id: userId,
                league_id,
                status: 'pending',
            }).then(([id]) => id);

            // Insert into user_leagues with a reference to the signup request
            await trx('user_leagues').insert({
                user_id: userId,
                league_id,
                deck_id,
                current_commander: current_commander || null,
                commander_partner: commander_partner || null,
                league_wins: 0,
                league_losses: 0,
                league_draws: 0,
                total_points: 0,
                matches_played: 0,
                is_active: false, // Set to false until approved
                rank: null,
                disqualified: false,
                league_role: 'player',
                request_id: requestId, // Reference the signup request
            });
        });

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
    isUserInLeague,
    getLeagueParticipantDetails
};