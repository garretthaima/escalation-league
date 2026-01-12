const db = require('../models/db');
const { getLeagueMatchupMatrix, suggestPods } = require('../services/gameService');

// Create a new game session
const createSession = async (req, res) => {
    const { league_id, session_date, name } = req.body;
    const created_by = req.user.id;

    if (!league_id || !session_date) {
        return res.status(400).json({ error: 'League ID and session date are required.' });
    }

    try {
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

// Get all sessions for a league
const getLeagueSessions = async (req, res) => {
    const { league_id } = req.params;

    try {
        const sessions = await db('game_sessions')
            .where({ league_id })
            .orderBy('session_date', 'desc');

        res.status(200).json(sessions);
    } catch (err) {
        console.error('Error fetching sessions:', err.message);
        res.status(500).json({ error: 'Failed to fetch sessions.' });
    }
};

// Get a specific session with attendance
const getSession = async (req, res) => {
    const { session_id } = req.params;

    try {
        const session = await db('game_sessions').where({ id: session_id }).first();

        if (!session) {
            return res.status(404).json({ error: 'Session not found.' });
        }

        const attendance = await db('session_attendance as sa')
            .join('users as u', 'sa.user_id', 'u.id')
            .where('sa.session_id', session_id)
            .select(
                'sa.id',
                'sa.user_id',
                'u.firstname',
                'u.lastname',
                'sa.checked_in_at',
                'sa.checked_out_at',
                'sa.is_active'
            );

        res.status(200).json({ ...session, attendance });
    } catch (err) {
        console.error('Error fetching session:', err.message);
        res.status(500).json({ error: 'Failed to fetch session.' });
    }
};

// Update session status
const updateSessionStatus = async (req, res) => {
    const { session_id } = req.params;
    const { status } = req.body;

    if (!['scheduled', 'active', 'completed'].includes(status)) {
        return res.status(400).json({ error: 'Invalid status. Must be scheduled, active, or completed.' });
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

// Check in to a session (user checks themselves in)
const checkIn = async (req, res) => {
    const { session_id } = req.params;
    const user_id = req.user.id;

    try {
        // Verify session exists and is active or scheduled
        const session = await db('game_sessions').where({ id: session_id }).first();
        if (!session) {
            return res.status(404).json({ error: 'Session not found.' });
        }
        if (session.status === 'completed') {
            return res.status(400).json({ error: 'Cannot check in to a completed session.' });
        }

        // Check if already checked in
        const existing = await db('session_attendance')
            .where({ session_id, user_id })
            .first();

        if (existing) {
            // Re-activate if previously checked out
            if (!existing.is_active) {
                await db('session_attendance')
                    .where({ id: existing.id })
                    .update({ is_active: true, checked_out_at: null });
                return res.status(200).json({ message: 'Checked back in.' });
            }
            return res.status(200).json({ message: 'Already checked in.' });
        }

        await db('session_attendance').insert({
            session_id,
            user_id,
            is_active: true
        });

        res.status(201).json({ message: 'Checked in successfully.' });
    } catch (err) {
        console.error('Error checking in:', err.message);
        res.status(500).json({ error: 'Failed to check in.' });
    }
};

// Check out of a session
const checkOut = async (req, res) => {
    const { session_id } = req.params;
    const user_id = req.user.id;

    try {
        const result = await db('session_attendance')
            .where({ session_id, user_id })
            .update({
                is_active: false,
                checked_out_at: db.fn.now()
            });

        if (result === 0) {
            return res.status(404).json({ error: 'Not checked in to this session.' });
        }

        res.status(200).json({ message: 'Checked out successfully.' });
    } catch (err) {
        console.error('Error checking out:', err.message);
        res.status(500).json({ error: 'Failed to check out.' });
    }
};

// Admin: Add a user to attendance
const adminCheckIn = async (req, res) => {
    const { session_id } = req.params;
    const { user_id } = req.body;

    if (!user_id) {
        return res.status(400).json({ error: 'User ID is required.' });
    }

    try {
        const session = await db('game_sessions').where({ id: session_id }).first();
        if (!session) {
            return res.status(404).json({ error: 'Session not found.' });
        }

        const existing = await db('session_attendance')
            .where({ session_id, user_id })
            .first();

        if (existing) {
            if (!existing.is_active) {
                await db('session_attendance')
                    .where({ id: existing.id })
                    .update({ is_active: true, checked_out_at: null });
                return res.status(200).json({ message: 'User re-activated.' });
            }
            return res.status(200).json({ message: 'User already checked in.' });
        }

        await db('session_attendance').insert({
            session_id,
            user_id,
            is_active: true
        });

        res.status(201).json({ message: 'User checked in successfully.' });
    } catch (err) {
        console.error('Error admin check in:', err.message);
        res.status(500).json({ error: 'Failed to check in user.' });
    }
};

// Admin: Remove a user from attendance
const adminCheckOut = async (req, res) => {
    const { session_id } = req.params;
    const { user_id } = req.body;

    if (!user_id) {
        return res.status(400).json({ error: 'User ID is required.' });
    }

    try {
        const result = await db('session_attendance')
            .where({ session_id, user_id })
            .update({
                is_active: false,
                checked_out_at: db.fn.now()
            });

        if (result === 0) {
            return res.status(404).json({ error: 'User not checked in to this session.' });
        }

        res.status(200).json({ message: 'User checked out successfully.' });
    } catch (err) {
        console.error('Error admin check out:', err.message);
        res.status(500).json({ error: 'Failed to check out user.' });
    }
};

// Get active attendees for pod building
const getActiveAttendees = async (req, res) => {
    const { session_id } = req.params;

    try {
        const attendees = await db('session_attendance as sa')
            .join('users as u', 'sa.user_id', 'u.id')
            .leftJoin('user_leagues as ul', function () {
                this.on('sa.user_id', '=', 'ul.user_id');
            })
            .join('game_sessions as gs', 'sa.session_id', 'gs.id')
            .where('sa.session_id', session_id)
            .where('sa.is_active', true)
            .whereRaw('ul.league_id = gs.league_id')
            .select(
                'sa.user_id',
                'u.firstname',
                'u.lastname',
                'sa.checked_in_at',
                'ul.league_wins',
                'ul.league_losses',
                'ul.total_points'
            );

        res.status(200).json(attendees);
    } catch (err) {
        console.error('Error fetching active attendees:', err.message);
        res.status(500).json({ error: 'Failed to fetch active attendees.' });
    }
};

// Get or create today's session for a league
const getTodaySession = async (req, res) => {
    const { league_id } = req.params;
    const today = new Date().toISOString().split('T')[0];

    try {
        let session = await db('game_sessions')
            .where({ league_id, session_date: today })
            .first();

        if (!session) {
            const [id] = await db('game_sessions').insert({
                league_id,
                session_date: today,
                status: 'active',
                created_by: req.user.id
            });
            session = await db('game_sessions').where({ id }).first();
        }

        // Get attendance
        const attendance = await db('session_attendance as sa')
            .join('users as u', 'sa.user_id', 'u.id')
            .where('sa.session_id', session.id)
            .select(
                'sa.user_id',
                'u.firstname',
                'u.lastname',
                'sa.checked_in_at',
                'sa.is_active'
            );

        res.status(200).json({ ...session, attendance });
    } catch (err) {
        console.error('Error getting today session:', err.message);
        res.status(500).json({ error: 'Failed to get today session.' });
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

module.exports = {
    createSession,
    getLeagueSessions,
    getSession,
    updateSessionStatus,
    checkIn,
    checkOut,
    adminCheckIn,
    adminCheckOut,
    getActiveAttendees,
    getTodaySession,
    getPodSuggestions,
    getMatchupMatrix
};
