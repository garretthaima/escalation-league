const db = require('../models/db');
const { getGameNightDate, calculateCurrentWeek } = require('../utils/leagueUtils');
const { updatePollMessage } = require('../services/discordBot');

// Get all sessions for a league
const getLeagueSessions = async (req, res) => {
    const { league_id } = req.params;

    try {
        const sessions = await db('game_sessions')
            .where({ league_id })
            .orderBy('session_date', 'desc');

        // Get attendance counts for each session
        const sessionIds = sessions.map(s => s.id);
        const attendanceCounts = await db('session_attendance')
            .whereIn('session_id', sessionIds)
            .select('session_id')
            .count('* as total_responses')
            .select(db.raw('SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) as attending_count'))
            .groupBy('session_id');

        // Get active poll info for each session
        const activePolls = await db('attendance_polls')
            .whereIn('session_id', sessionIds)
            .select('session_id', 'discord_message_id');

        // Create lookup maps
        const attendanceMap = {};
        attendanceCounts.forEach(ac => {
            attendanceMap[ac.session_id] = {
                attending_count: parseInt(ac.attending_count) || 0,
                total_responses: parseInt(ac.total_responses) || 0
            };
        });

        const pollMap = {};
        activePolls.forEach(p => {
            pollMap[p.session_id] = p.discord_message_id;
        });

        // Merge data
        const sessionsWithCounts = sessions.map(session => ({
            ...session,
            attending_count: attendanceMap[session.id]?.attending_count || 0,
            total_responses: attendanceMap[session.id]?.total_responses || 0,
            has_active_poll: !!pollMap[session.id],
            poll_message_id: pollMap[session.id] || null
        }));

        res.status(200).json(sessionsWithCounts);
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
                'sa.is_active',
                'sa.updated_via'
            );

        // Check if there's an active poll for this session
        const poll = await db('attendance_polls')
            .where({ session_id })
            .first();

        res.status(200).json({
            ...session,
            attendance,
            has_active_poll: !!poll,
            poll_message_id: poll?.discord_message_id || null
        });
    } catch (err) {
        console.error('Error fetching session:', err.message);
        res.status(500).json({ error: 'Failed to fetch session.' });
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
        if (session.status === 'locked') {
            return res.status(400).json({ error: 'Session is locked. Check-ins are closed.' });
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
                    .update({ is_active: true, checked_out_at: null, updated_via: 'web' });

                // Update Discord poll message
                updatePollMessage(session_id).catch(err => console.error('Error updating poll:', err));

                return res.status(200).json({ message: 'Checked back in.' });
            }
            return res.status(200).json({ message: 'Already checked in.' });
        }

        await db('session_attendance').insert({
            session_id,
            user_id,
            is_active: true,
            updated_via: 'web'
        });

        // Update Discord poll message
        updatePollMessage(session_id).catch(err => console.error('Error updating poll:', err));

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
        // Check if session is locked
        const session = await db('game_sessions').where({ id: session_id }).first();
        if (!session) {
            return res.status(404).json({ error: 'Session not found.' });
        }
        if (session.status === 'locked') {
            return res.status(400).json({ error: 'Session is locked. Check-outs are closed.' });
        }
        if (session.status === 'completed') {
            return res.status(400).json({ error: 'Cannot check out of a completed session.' });
        }

        const result = await db('session_attendance')
            .where({ session_id, user_id })
            .update({
                is_active: false,
                checked_out_at: db.fn.now(),
                updated_via: 'web'
            });

        if (result === 0) {
            return res.status(404).json({ error: 'Not checked in to this session.' });
        }

        // Update Discord poll message
        updatePollMessage(session_id).catch(err => console.error('Error updating poll:', err));

        res.status(200).json({ message: 'Checked out successfully.' });
    } catch (err) {
        console.error('Error checking out:', err.message);
        res.status(500).json({ error: 'Failed to check out.' });
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

// Get or create the current game night session for a league
// Uses the league's Thursday game night schedule
const getTodaySession = async (req, res) => {
    const { league_id } = req.params;

    try {
        // Get league to determine game night date
        const league = await db('leagues').where({ id: league_id }).first();
        if (!league) {
            return res.status(404).json({ error: 'League not found.' });
        }

        // Get the game night date (Thursday) based on league schedule
        const gameNightDate = getGameNightDate(league.start_date);
        const currentWeek = calculateCurrentWeek(league.start_date, league.end_date);

        let session = await db('game_sessions')
            .where({ league_id, session_date: gameNightDate })
            .first();

        if (!session) {
            const [id] = await db('game_sessions').insert({
                league_id,
                session_date: gameNightDate,
                name: `Week ${currentWeek} Game Night`,
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

        // Check if Discord poll exists for this session
        const discordPoll = await db('attendance_polls')
            .where({ session_id: session.id })
            .first();

        res.status(200).json({
            ...session,
            attendance,
            current_week: currentWeek,
            discord_poll_posted: !!discordPoll
        });
    } catch (err) {
        console.error('Error getting today session:', err.message);
        res.status(500).json({ error: 'Failed to get today session.' });
    }
};

// Get the active poll session for a league (only one active poll per league)
const getActivePollSession = async (req, res) => {
    const { league_id } = req.params;

    try {
        // Find the session with an active poll for this league
        const activePoll = await db('attendance_polls as ap')
            .join('game_sessions as gs', 'ap.session_id', 'gs.id')
            .where('gs.league_id', league_id)
            .select('gs.*', 'ap.discord_message_id', 'ap.discord_channel_id')
            .first();

        if (!activePoll) {
            return res.status(200).json({ session: null, message: 'No active poll for this league.' });
        }

        // Get attendance for this session
        const attendance = await db('session_attendance as sa')
            .join('users as u', 'sa.user_id', 'u.id')
            .where('sa.session_id', activePoll.id)
            .select(
                'sa.id',
                'sa.user_id',
                'u.firstname',
                'u.lastname',
                'sa.checked_in_at',
                'sa.checked_out_at',
                'sa.is_active',
                'sa.updated_via'
            );

        res.status(200).json({
            session: {
                ...activePoll,
                attendance,
                has_active_poll: true
            }
        });
    } catch (err) {
        console.error('Error fetching active poll session:', err.message);
        res.status(500).json({ error: 'Failed to fetch active poll session.' });
    }
};

module.exports = {
    getLeagueSessions,
    getSession,
    checkIn,
    checkOut,
    getActiveAttendees,
    getTodaySession,
    getActivePollSession
};
