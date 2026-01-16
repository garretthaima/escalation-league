const db = require('../models/db');
const { getLeagueMatchupMatrix, suggestPods } = require('../services/gameService');
const { postAttendancePoll, updatePollMessage, getClient, closePoll, postSessionRecap } = require('../services/discordBot');
const { emitPodCreated } = require('../utils/socketEmitter');

// Create a new game session
const createSession = async (req, res) => {
    const { league_id, session_date, name } = req.body;
    const created_by = req.user.id;

    if (!league_id || !session_date) {
        return res.status(400).json({ error: 'League ID and session date are required.' });
    }

    try {
        // Check if there's already an active/scheduled session for this league
        const existingSession = await db('game_sessions')
            .where({ league_id })
            .whereIn('status', ['scheduled', 'active'])
            .first();

        if (existingSession) {
            const sessionDate = new Date(existingSession.session_date).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                timeZone: 'UTC'
            });
            return res.status(400).json({
                error: `There's already a ${existingSession.status} session for ${existingSession.name || sessionDate}. Complete or cancel it first.`,
                existing_session_id: existingSession.id
            });
        }

        const [id] = await db('game_sessions').insert({
            league_id,
            session_date,
            name: name || null,
            status: 'scheduled',
            created_by
        });

        const session = await db('game_sessions').where({ id }).first();
        res.status(201).json(session);
    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ error: 'A session already exists for this league on this date.' });
        }
        console.error('Error creating session:', err.message);
        res.status(500).json({ error: 'Failed to create session.' });
    }
};

// Update session status
const updateSessionStatus = async (req, res) => {
    const { session_id } = req.params;
    const { status } = req.body;

    if (!['scheduled', 'active', 'locked', 'completed'].includes(status)) {
        return res.status(400).json({ error: 'Invalid status. Must be scheduled, active, locked, or completed.' });
    }

    try {
        const result = await db('game_sessions')
            .where({ id: session_id })
            .update({ status, updated_at: db.fn.now() });

        if (result === 0) {
            return res.status(404).json({ error: 'Session not found.' });
        }

        res.status(200).json({ message: 'Session status updated.' });
    } catch (err) {
        console.error('Error updating session:', err.message);
        res.status(500).json({ error: 'Failed to update session.' });
    }
};

// Admin: Add a user to attendance
const adminCheckIn = async (req, res) => {
    const { session_id } = req.params;
    const { user_id, force } = req.body;

    if (!user_id) {
        return res.status(400).json({ error: 'User ID is required.' });
    }

    try {
        const session = await db('game_sessions').where({ id: session_id }).first();
        if (!session) {
            return res.status(404).json({ error: 'Session not found.' });
        }

        // Block check-in for locked/completed sessions unless force flag is set
        if (!force && (session.status === 'locked' || session.status === 'completed')) {
            return res.status(400).json({
                error: `Session is ${session.status}. Use force=true to override.`,
                requiresForce: true
            });
        }

        const existing = await db('session_attendance')
            .where({ session_id, user_id })
            .first();

        if (existing) {
            if (!existing.is_active) {
                await db('session_attendance')
                    .where({ id: existing.id })
                    .update({ is_active: true, checked_out_at: null, updated_via: 'admin' });

                // Update Discord poll message
                updatePollMessage(session_id).catch(err => console.error('Error updating poll:', err));

                return res.status(200).json({ message: 'User re-activated.' });
            }
            return res.status(200).json({ message: 'User already checked in.' });
        }

        await db('session_attendance').insert({
            session_id,
            user_id,
            is_active: true,
            updated_via: 'admin'
        });

        // Update Discord poll message
        updatePollMessage(session_id).catch(err => console.error('Error updating poll:', err));

        res.status(201).json({ message: 'User checked in successfully.' });
    } catch (err) {
        console.error('Error admin check in:', err.message);
        res.status(500).json({ error: 'Failed to check in user.' });
    }
};

// Admin: Remove a user from attendance
const adminCheckOut = async (req, res) => {
    const { session_id } = req.params;
    const { user_id, force } = req.body;

    if (!user_id) {
        return res.status(400).json({ error: 'User ID is required.' });
    }

    try {
        // Check if session is locked/completed
        const session = await db('game_sessions').where({ id: session_id }).first();
        if (!session) {
            return res.status(404).json({ error: 'Session not found.' });
        }

        // Block check-out for locked/completed sessions unless force flag is set
        if (!force && (session.status === 'locked' || session.status === 'completed')) {
            return res.status(400).json({
                error: `Session is ${session.status}. Use force=true to override.`,
                requiresForce: true
            });
        }

        const result = await db('session_attendance')
            .where({ session_id, user_id })
            .update({
                is_active: false,
                checked_out_at: db.fn.now(),
                updated_via: 'admin'
            });

        if (result === 0) {
            return res.status(404).json({ error: 'User not checked in to this session.' });
        }

        // Update Discord poll message
        updatePollMessage(session_id).catch(err => console.error('Error updating poll:', err));

        res.status(200).json({ message: 'User checked out successfully.' });
    } catch (err) {
        console.error('Error admin check out:', err.message);
        res.status(500).json({ error: 'Failed to check out user.' });
    }
};

// Get pod suggestions for a session
const getPodSuggestions = async (req, res) => {
    const { session_id } = req.params;
    const { pod_size } = req.query;
    const podSize = parseInt(pod_size, 10) || 4;

    try {
        // Get session to find league
        const session = await db('game_sessions').where({ id: session_id }).first();
        if (!session) {
            return res.status(404).json({ error: 'Session not found.' });
        }

        // Get active attendees
        const attendees = await db('session_attendance')
            .where({ session_id, is_active: true })
            .select('user_id');

        const attendeeIds = attendees.map(a => a.user_id);

        if (attendeeIds.length === 0) {
            return res.status(200).json({
                pods: [],
                leftover: [],
                message: 'No active attendees'
            });
        }

        const suggestions = await suggestPods(attendeeIds, session.league_id, podSize);
        res.status(200).json(suggestions);
    } catch (err) {
        console.error('Error getting pod suggestions:', err.message);
        res.status(500).json({ error: 'Failed to get pod suggestions.' });
    }
};

// Get matchup matrix for a league
const getMatchupMatrix = async (req, res) => {
    const { league_id } = req.params;

    try {
        const matrix = await getLeagueMatchupMatrix(parseInt(league_id, 10));
        res.status(200).json(matrix);
    } catch (err) {
        console.error('Error getting matchup matrix:', err.message);
        res.status(500).json({ error: 'Failed to get matchup matrix.' });
    }
};

// Create a pod with specified players (from pod suggestions)
const createPodWithPlayers = async (req, res) => {
    const { session_id } = req.params;
    const { player_ids } = req.body;
    const creatorId = req.user.id;

    if (!player_ids || !Array.isArray(player_ids) || player_ids.length < 3) {
        return res.status(400).json({ error: 'At least 3 player IDs are required.' });
    }

    if (player_ids.length > 4) {
        return res.status(400).json({ error: 'Maximum 4 players allowed in a pod.' });
    }

    try {
        // Get session to find league
        const session = await db('game_sessions').where({ id: session_id }).first();
        if (!session) {
            return res.status(404).json({ error: 'Session not found.' });
        }

        // Verify all players are checked in to this session
        const checkedIn = await db('session_attendance')
            .where({ session_id, is_active: true })
            .whereIn('user_id', player_ids)
            .select('user_id');

        const checkedInIds = checkedIn.map(a => a.user_id);
        const notCheckedIn = player_ids.filter(id => !checkedInIds.includes(id));

        if (notCheckedIn.length > 0) {
            return res.status(400).json({
                error: 'Some players are not checked in to this session.',
                notCheckedIn
            });
        }

        // Create the pod linked to session
        const [podId] = await db('game_pods').insert({
            league_id: session.league_id,
            session_id: session_id,
            creator_id: creatorId,
            confirmation_status: 'active' // Start as active since admin created with full roster
        });

        // Add all players to the pod
        const playerInserts = player_ids.map(playerId => ({
            pod_id: podId,
            player_id: playerId
        }));
        await db('game_players').insert(playerInserts);

        // Fetch pod with participants for response
        const pod = await db('game_pods').where({ id: podId }).first();
        const participants = await db('game_players as gp')
            .join('users as u', 'gp.player_id', 'u.id')
            .where('gp.pod_id', podId)
            .select('u.id as player_id', 'u.firstname', 'u.lastname', 'u.email', 'gp.result', 'gp.confirmed');

        // Emit WebSocket event
        emitPodCreated(req.app, session.league_id, {
            id: podId,
            league_id: session.league_id,
            session_id: session_id,
            creator_id: creatorId,
            confirmation_status: 'active',
            participants
        });

        res.status(201).json({
            ...pod,
            participants
        });
    } catch (err) {
        console.error('Error creating pod with players:', err.message);
        res.status(500).json({ error: 'Failed to create pod.' });
    }
};

// Post a Discord attendance poll for a session
const postDiscordPoll = async (req, res) => {
    const { session_id } = req.params;
    const { custom_message } = req.body;

    try {
        // Check if Discord bot is connected
        if (!getClient()) {
            return res.status(503).json({ error: 'Discord bot is not connected.' });
        }

        // Get session details
        const session = await db('game_sessions').where({ id: session_id }).first();
        if (!session) {
            return res.status(404).json({ error: 'Session not found.' });
        }

        // Check if a poll already exists for this session
        const existingPoll = await db('attendance_polls')
            .where({ session_id })
            .first();

        if (existingPoll) {
            return res.status(400).json({
                error: 'A poll already exists for this session.',
                poll: existingPoll
            });
        }

        // Check if there's already an active poll for this league (one poll per league at a time)
        const activePollInLeague = await db('attendance_polls as ap')
            .join('game_sessions as gs', 'ap.session_id', 'gs.id')
            .where('gs.league_id', session.league_id)
            .select('ap.*', 'gs.session_date', 'gs.name as session_name')
            .first();

        if (activePollInLeague) {
            const sessionDate = new Date(activePollInLeague.session_date).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                timeZone: 'UTC'
            });
            return res.status(400).json({
                error: `There's already an active poll for ${activePollInLeague.session_name || sessionDate}. Close it first before posting a new one.`,
                existing_session_id: activePollInLeague.session_id
            });
        }

        // Post the poll to Discord
        const result = await postAttendancePoll(
            session.id,
            session.session_date,
            session.league_id,
            custom_message
        );

        res.status(201).json({
            message: 'Discord poll posted successfully.',
            messageId: result.messageId,
            channelId: result.channelId
        });
    } catch (err) {
        console.error('Error posting Discord poll:', err.message);
        res.status(500).json({ error: 'Failed to post Discord poll.' });
    }
};

// Close a Discord attendance poll for a session and lock the session
const closeDiscordPoll = async (req, res) => {
    const { session_id } = req.params;

    try {
        // Get the poll for this session
        const poll = await db('attendance_polls')
            .where({ session_id })
            .first();

        if (!poll) {
            return res.status(404).json({ error: 'No poll found for this session.' });
        }

        // Close the poll in Discord (edit message to show it's closed)
        if (getClient()) {
            await closePoll(session_id);
        }

        // Delete the poll record from database so a new one can be created
        await db('attendance_polls')
            .where({ session_id })
            .delete();

        // Lock the session to prevent further check-ins/check-outs
        await db('game_sessions')
            .where({ id: session_id })
            .update({ status: 'locked', updated_at: db.fn.now() });

        res.status(200).json({ message: 'Discord poll closed and session locked.' });
    } catch (err) {
        console.error('Error closing Discord poll:', err.message);
        res.status(500).json({ error: 'Failed to close Discord poll.' });
    }
};

// Lock a session (without closing poll)
const lockSession = async (req, res) => {
    const { session_id } = req.params;

    try {
        const session = await db('game_sessions').where({ id: session_id }).first();
        if (!session) {
            return res.status(404).json({ error: 'Session not found.' });
        }

        if (session.status === 'completed') {
            return res.status(400).json({ error: 'Cannot lock a completed session.' });
        }

        await db('game_sessions')
            .where({ id: session_id })
            .update({ status: 'locked', updated_at: db.fn.now() });

        res.status(200).json({ message: 'Session locked successfully.' });
    } catch (err) {
        console.error('Error locking session:', err.message);
        res.status(500).json({ error: 'Failed to lock session.' });
    }
};

// Reopen a locked session
const reopenSession = async (req, res) => {
    const { session_id } = req.params;

    try {
        const session = await db('game_sessions').where({ id: session_id }).first();
        if (!session) {
            return res.status(404).json({ error: 'Session not found.' });
        }

        if (session.status !== 'locked') {
            return res.status(400).json({ error: 'Session is not locked.' });
        }

        await db('game_sessions')
            .where({ id: session_id })
            .update({ status: 'active', updated_at: db.fn.now() });

        res.status(200).json({ message: 'Session reopened successfully.' });
    } catch (err) {
        console.error('Error reopening session:', err.message);
        res.status(500).json({ error: 'Failed to reopen session.' });
    }
};

// Post a session recap to Discord and mark session as completed
const postRecap = async (req, res) => {
    const { session_id } = req.params;

    try {
        // Get session details
        const session = await db('game_sessions').where({ id: session_id }).first();
        if (!session) {
            return res.status(404).json({ error: 'Session not found.' });
        }

        // Check if recap was already posted
        if (session.recap_posted_at) {
            return res.status(400).json({
                error: 'Recap has already been posted for this session.',
                recap_posted_at: session.recap_posted_at
            });
        }

        // Check if Discord bot is connected
        if (!getClient()) {
            return res.status(503).json({ error: 'Discord bot is not connected.' });
        }

        // Post the recap to Discord
        const result = await postSessionRecap(session_id);

        // Update session: mark recap as posted and set status to completed
        await db('game_sessions')
            .where({ id: session_id })
            .update({
                recap_posted_at: db.fn.now(),
                status: 'completed',
                updated_at: db.fn.now()
            });

        res.status(200).json({
            message: 'Recap posted and session completed.',
            messageId: result.messageId,
            channelId: result.channelId
        });
    } catch (err) {
        console.error('Error posting recap:', err.message);
        res.status(500).json({ error: err.message || 'Failed to post recap.' });
    }
};

module.exports = {
    createSession,
    updateSessionStatus,
    adminCheckIn,
    adminCheckOut,
    getPodSuggestions,
    getMatchupMatrix,
    createPodWithPlayers,
    postDiscordPoll,
    closeDiscordPoll,
    lockSession,
    reopenSession,
    postRecap
};
