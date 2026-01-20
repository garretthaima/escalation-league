const db = require('../models/db');
const redis = require('../utils/redisClient'); // Import the Redis client
const { updateStats } = require('../utils/statsUtils');
const logger = require('../utils/logger');
const { getOpponentMatchups } = require('../services/gameService');


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
        const scryfallDb = require('../models/scryfallDb');

        const stats = await db('user_leagues as ul')
            .leftJoin('decks as d', 'ul.deck_id', 'd.id')
            .select('ul.league_wins', 'ul.league_losses', 'ul.total_points', 'ul.current_commander', 'ul.commander_partner', 'ul.deck_id', 'd.decklist_url', 'ul.joined_at')
            .where({ 'ul.user_id': userId, 'ul.league_id': league_id })
            .first();

        if (!stats) {
            return res.status(404).json({ error: 'No stats found for this league.' });
        }

        // Fetch commander names from Scryfall DB if IDs exist
        let commanderName = null;
        let partnerName = null;

        if (stats.current_commander) {
            const commanderData = await scryfallDb('cards')
                .select('name')
                .where('id', stats.current_commander)
                .first();
            commanderName = commanderData ? commanderData.name : null;
        }

        if (stats.commander_partner) {
            const partnerData = await scryfallDb('cards')
                .select('name')
                .where('id', stats.commander_partner)
                .first();
            partnerName = partnerData ? partnerData.name : null;
        }

        res.status(200).json({
            league_wins: stats.league_wins,
            league_losses: stats.league_losses,
            total_points: stats.total_points,
            current_commander: commanderName,
            commander_partner: partnerName,
            deck_id: stats.deck_id,
            decklist_url: stats.decklist_url,
            joined_at: stats.joined_at,
        });
    } catch (err) {
        console.error('Error fetching user league stats:', err.message);
        res.status(500).json({ error: 'Failed to fetch user league stats.' });
    }
};

// Update user's league-specific data
const updateUserLeagueData = async (req, res) => {
    const userId = req.user.id;
    const { league_id } = req.params;
    const { current_commander, commander_partner, deck_id } = req.body;

    console.log('updateUserLeagueData called:', {
        userId,
        league_id,
        body: req.body,
        deck_id
    });

    try {
        const updates = {};
        if (current_commander !== undefined) updates.current_commander = current_commander;
        if (commander_partner !== undefined) updates.commander_partner = commander_partner;
        if (deck_id !== undefined) updates.deck_id = deck_id;

        console.log('Updates to apply:', updates);

        const result = await db('user_leagues').where({ user_id: userId, league_id }).update(updates);

        console.log('Update result (rows affected):', result);

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
        const scryfallDb = require('../models/scryfallDb');

        const participants = await db('user_leagues as ul')
            .join('users as u', 'ul.user_id', 'u.id')
            .select(
                'u.id as user_id',
                'u.firstname',
                'u.lastname',
                'ul.league_wins',
                'ul.league_losses',
                'ul.total_points',
                'ul.is_active',
                'ul.disqualified',
                'ul.joined_at',
                'ul.current_commander'
            )
            .where('ul.league_id', league_id);

        // Fetch commander names from Scryfall DB for all participants
        const participantsWithCommanders = await Promise.all(
            participants.map(async (p) => {
                let commanderName = null;
                if (p.current_commander) {
                    try {
                        const commanderData = await scryfallDb('cards')
                            .select('name')
                            .where('id', p.current_commander)
                            .first();
                        commanderName = commanderData ? commanderData.name : null;
                        console.log(`[DEBUG] Commander lookup for ${p.firstname}: id=${p.current_commander}, found=${commanderName}`);
                    } catch (lookupErr) {
                        console.error(`[DEBUG] Commander lookup failed for ${p.firstname}:`, lookupErr.message);
                    }
                }
                return {
                    ...p,
                    current_commander: commanderName
                };
            })
        );

        res.status(200).json(participantsWithCommanders);
    } catch (err) {
        console.error('Error fetching league participants:', err.message);
        res.status(500).json({ error: 'Failed to fetch league participants.' });
    }
};

// Fetch detailed information about a single participant in a league
const getLeagueParticipantDetails = async (req, res) => {
    const { league_id, user_id } = req.params;

    try {
        const scryfallDb = require('../models/scryfallDb');

        // Fetch participant details from the database, including decklist_url from the decks table
        const participant = await db('user_leagues as ul')
            .join('users as u', 'ul.user_id', 'u.id')
            .leftJoin('decks as d', 'ul.deck_id', 'd.id') // LEFT JOIN to handle missing decks
            .select(
                'u.id as user_id',
                'u.firstname',
                'u.lastname',
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

        // Fetch commander details from Scryfall DB
        let commanderData = null;
        let partnerData = null;

        if (participant.current_commander) {
            commanderData = await scryfallDb('cards')
                .select('id', 'name', 'image_uris')
                .where('id', participant.current_commander)
                .first();
        }

        if (participant.commander_partner) {
            partnerData = await scryfallDb('cards')
                .select('id', 'name', 'image_uris')
                .where('id', participant.commander_partner)
                .first();
        }

        // Helper function to safely extract image URI
        const getImageUri = (cardData) => {
            if (!cardData || !cardData.image_uris) return null;
            try {
                const imageUris = typeof cardData.image_uris === 'string'
                    ? JSON.parse(cardData.image_uris)
                    : cardData.image_uris;
                return imageUris.normal || imageUris.large || null;
            } catch (error) {
                console.error('Error parsing image URIs:', error);
                return null;
            }
        };

        res.status(200).json({
            user_id: participant.user_id,
            firstname: participant.firstname,
            lastname: participant.lastname,
            commander: commanderData ? commanderData.name : null,
            commander_image: getImageUri(commanderData),
            commanderPartner: partnerData ? partnerData.name : null,
            partner_image: getImageUri(partnerData),
            league_wins: participant.league_wins,
            league_losses: participant.league_losses,
            decklist_url: participant.decklist_url || null,
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

    logger.info('Signup request initiated', {
        userId,
        league_id,
        deck_id,
        current_commander,
        commander_partner,
        bodyData: req.body.data
    });

    if (league_id == null || deck_id == null) {
        logger.warn('Signup validation failed - missing required fields', {
            userId,
            league_id,
            deck_id,
            body: req.body
        });
        return res.status(400).json({ error: 'League ID and Deck ID are required.' });
    }

    try {
        // Check if the user already has a pending or approved entry
        const existingRequest = await db('league_signup_requests')
            .where({ user_id: userId, league_id })
            .whereIn('status', ['pending', 'approved'])
            .first();

        if (existingRequest) {
            logger.info('Signup rejected - existing request found', {
                userId,
                league_id,
                existingStatus: existingRequest.status
            });
            return res.status(400).json({ error: 'You already have a pending or approved signup for this league.' });
        }

        // Start a transaction to ensure both tables are updated atomically
        let requestId;
        await db.transaction(async (trx) => {
            // Insert into league_signup_requests
            requestId = await trx('league_signup_requests').insert({
                user_id: userId,
                league_id,
                status: 'pending',
            }).then(([id]) => id);

            logger.debug('Signup request created', { requestId, userId, league_id });

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

            logger.debug('User league entry created', { userId, league_id, deck_id, requestId });
        });

        logger.info('Signup request completed successfully', {
            userId,
            league_id,
            deck_id,
            requestId
        });

        res.status(200).json({ success: true, message: 'Signup request submitted successfully.' });
    } catch (err) {
        logger.error('Error submitting signup request', err, {
            userId,
            league_id,
            deck_id,
            body: req.body
        });
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

        // Check if the user is in any league (only active memberships)
        const userLeague = await db('user_leagues')
            .join('leagues', 'user_leagues.league_id', 'leagues.id')
            .select('leagues.id as league_id', 'leagues.name as league_name', 'user_leagues.joined_at')
            .where('user_leagues.user_id', userId)
            .where('user_leagues.is_active', 1)
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

// Admin: Update participant status (activate/deactivate, disqualify)
const updateParticipantStatus = async (req, res) => {
    const { league_id, user_id } = req.params;
    const { is_active, disqualified } = req.body;

    try {
        const updates = {};
        if (is_active !== undefined) updates.is_active = is_active;
        if (disqualified !== undefined) updates.disqualified = disqualified;

        if (Object.keys(updates).length === 0) {
            return res.status(400).json({ error: 'No updates provided.' });
        }

        const result = await db('user_leagues')
            .where({ user_id, league_id })
            .update(updates);

        if (result === 0) {
            return res.status(404).json({ error: 'Participant not found in this league.' });
        }

        res.status(200).json({ message: 'Participant status updated successfully.' });
    } catch (err) {
        console.error('Error updating participant status:', err.message);
        res.status(500).json({ error: 'Failed to update participant status.' });
    }
};

// Get opponent matchup stats for a participant
const getParticipantMatchups = async (req, res) => {
    const { league_id, user_id } = req.params;

    try {
        // Verify the participant exists in this league
        const participant = await db('user_leagues')
            .where({ user_id, league_id })
            .first();

        if (!participant) {
            return res.status(404).json({ error: 'Participant not found in this league.' });
        }

        const matchups = await getOpponentMatchups(parseInt(user_id, 10), parseInt(league_id, 10));

        res.status(200).json(matchups);
    } catch (err) {
        console.error('Error fetching participant matchups:', err.message);
        res.status(500).json({ error: 'Failed to fetch participant matchups.' });
    }
};

// Get turn order win stats for a participant
const getParticipantTurnOrderStats = async (req, res) => {
    const { league_id, user_id } = req.params;

    try {
        // Get all completed games for this user in this league with turn order data
        const completedGames = await db('game_pods as gp')
            .join('game_players as pl', 'gp.id', 'pl.pod_id')
            .where('gp.league_id', league_id)
            .where('pl.player_id', user_id)
            .where('gp.confirmation_status', 'complete')
            .whereNotNull('pl.turn_order')
            .whereNotNull('pl.result')
            .select('gp.id as pod_id', 'pl.turn_order', 'pl.result');

        if (completedGames.length === 0) {
            return res.status(200).json({
                message: 'No completed games with turn order data found',
                turnOrderStats: [],
                totalGames: 0
            });
        }

        const totalGames = completedGames.length;

        // Calculate stats for each turn order position (1-4)
        const turnOrderStats = [];
        for (let position = 1; position <= 4; position++) {
            const gamesAtPosition = completedGames.filter(g => g.turn_order === position);
            const winsAtPosition = gamesAtPosition.filter(g => g.result === 'win').length;
            const totalAtPosition = gamesAtPosition.length;

            if (totalAtPosition > 0) {
                turnOrderStats.push({
                    position,
                    positionLabel: getPositionLabel(position),
                    wins: winsAtPosition,
                    gamesPlayed: totalAtPosition,
                    winRate: Math.round((winsAtPosition / totalAtPosition) * 100 * 10) / 10
                });
            }
        }

        res.status(200).json({
            turnOrderStats,
            totalGames,
            message: totalGames < 5 ? 'Limited data - statistics may not be statistically significant' : null
        });
    } catch (err) {
        console.error('Error fetching participant turn order stats:', err.message);
        res.status(500).json({ error: 'Failed to fetch turn order statistics.' });
    }
};

// Helper function for position labels
function getPositionLabel(position) {
    const labels = {
        1: '1st',
        2: '2nd',
        3: '3rd',
        4: '4th'
    };
    return labels[position] || `${position}th`;
}

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
    getLeagueParticipantDetails,
    updateParticipantStatus,
    getParticipantMatchups,
    getParticipantTurnOrderStats
};