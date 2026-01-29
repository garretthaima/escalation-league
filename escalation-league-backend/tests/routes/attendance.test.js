const request = require('supertest');
const { getAuthToken, getAuthTokenWithRole } = require('../helpers/authHelper');
const { createTestLeague, addUserToLeague } = require('../helpers/leaguesHelper');
const db = require('../helpers/testDb');

jest.mock('../../models/db', () => require('../helpers/testDb'));
jest.mock('../../utils/settingsUtils', () => ({
    getSetting: jest.fn((key) => {
        if (key === 'secret_key') {
            return Promise.resolve(process.env.JWT_SECRET || 'test-secret-key');
        }
        return Promise.resolve(null);
    })
}));

// Mock Discord bot service
jest.mock('../../services/discordBot', () => ({
    updatePollMessage: jest.fn().mockResolvedValue(null)
}));

const app = require('../../server');

// Helper to create a game session
async function createGameSession(leagueId, createdBy, overrides = {}) {
    const today = new Date().toISOString().split('T')[0];
    const [id] = await db('game_sessions').insert({
        league_id: leagueId,
        session_date: overrides.session_date || today,
        name: overrides.name || 'Test Session',
        status: overrides.status || 'active',
        created_by: createdBy,
        ...overrides
    });
    return id;
}

// Helper to check in a user to a session
async function checkInUser(sessionId, userId, isActive = true) {
    const [id] = await db('session_attendance').insert({
        session_id: sessionId,
        user_id: userId,
        is_active: isActive,
        updated_via: 'test'
    });
    return id;
}

describe('Attendance Routes', () => {
    describe('GET /api/attendance/leagues/:league_id/sessions', () => {
        it('should return all sessions for a league', async () => {
            const { token, userId } = await getAuthToken();
            const leagueId = await createTestLeague();

            await createGameSession(leagueId, userId, { name: 'Session 1' });
            await createGameSession(leagueId, userId, { name: 'Session 2', session_date: '2025-01-02' });

            const res = await request(app)
                .get(`/api/attendance/leagues/${leagueId}/sessions`)
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(200);
            expect(Array.isArray(res.body)).toBe(true);
            expect(res.body.length).toBe(2);
        });

        it('should return empty array for league with no sessions', async () => {
            const { token } = await getAuthToken();
            const leagueId = await createTestLeague();

            const res = await request(app)
                .get(`/api/attendance/leagues/${leagueId}/sessions`)
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(200);
            expect(res.body).toEqual([]);
        });

        it('should require authentication', async () => {
            const res = await request(app)
                .get('/api/attendance/leagues/1/sessions');

            expect(res.status).toBe(401);
        });
    });

    describe('GET /api/attendance/sessions/:session_id', () => {
        it('should return session with attendance', async () => {
            const { token, userId } = await getAuthToken();
            const leagueId = await createTestLeague();
            const sessionId = await createGameSession(leagueId, userId, { name: 'Test Session' });
            await checkInUser(sessionId, userId);

            const res = await request(app)
                .get(`/api/attendance/sessions/${sessionId}`)
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('name', 'Test Session');
            expect(res.body).toHaveProperty('attendance');
            expect(Array.isArray(res.body.attendance)).toBe(true);
            expect(res.body.attendance.length).toBe(1);
            expect(res.body).toHaveProperty('has_active_poll');
        });

        it('should return 404 for non-existent session', async () => {
            const { token } = await getAuthToken();

            const res = await request(app)
                .get('/api/attendance/sessions/99999')
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(404);
            expect(res.body).toHaveProperty('error', 'Session not found.');
        });

        it('should require authentication', async () => {
            const res = await request(app)
                .get('/api/attendance/sessions/1');

            expect(res.status).toBe(401);
        });
    });

    describe('POST /api/attendance/sessions/:session_id/check-in', () => {
        it('should check in user to session', async () => {
            const { token, userId } = await getAuthToken();
            const leagueId = await createTestLeague();
            const sessionId = await createGameSession(leagueId, userId);

            const res = await request(app)
                .post(`/api/attendance/sessions/${sessionId}/check-in`)
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(201);
            expect(res.body).toHaveProperty('message', 'Checked in successfully.');
        });

        it('should return already checked in message', async () => {
            const { token, userId } = await getAuthToken();
            const leagueId = await createTestLeague();
            const sessionId = await createGameSession(leagueId, userId);
            await checkInUser(sessionId, userId, true);

            const res = await request(app)
                .post(`/api/attendance/sessions/${sessionId}/check-in`)
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('message', 'Already checked in.');
        });

        it('should re-activate previously checked out user', async () => {
            const { token, userId } = await getAuthToken();
            const leagueId = await createTestLeague();
            const sessionId = await createGameSession(leagueId, userId);
            await checkInUser(sessionId, userId, false); // Inactive (checked out)

            const res = await request(app)
                .post(`/api/attendance/sessions/${sessionId}/check-in`)
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('message', 'Checked back in.');
        });

        it('should reject check-in to completed session', async () => {
            const { token, userId } = await getAuthToken();
            const leagueId = await createTestLeague();
            const sessionId = await createGameSession(leagueId, userId, { status: 'completed' });

            const res = await request(app)
                .post(`/api/attendance/sessions/${sessionId}/check-in`)
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(400);
            expect(res.body).toHaveProperty('error', 'Cannot check in to a completed session.');
        });

        it('should reject check-in to locked session', async () => {
            const { token, userId } = await getAuthToken();
            const leagueId = await createTestLeague();
            const sessionId = await createGameSession(leagueId, userId, { status: 'locked' });

            const res = await request(app)
                .post(`/api/attendance/sessions/${sessionId}/check-in`)
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(400);
            expect(res.body).toHaveProperty('error', 'Session is locked. Check-ins are closed.');
        });

        it('should return 404 for non-existent session', async () => {
            const { token } = await getAuthToken();

            const res = await request(app)
                .post('/api/attendance/sessions/99999/check-in')
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(404);
            expect(res.body).toHaveProperty('error', 'Session not found.');
        });

        it('should require authentication', async () => {
            const res = await request(app)
                .post('/api/attendance/sessions/1/check-in');

            expect(res.status).toBe(401);
        });
    });

    describe('POST /api/attendance/sessions/:session_id/check-out', () => {
        it('should check out user from session', async () => {
            const { token, userId } = await getAuthToken();
            const leagueId = await createTestLeague();
            const sessionId = await createGameSession(leagueId, userId);
            await checkInUser(sessionId, userId);

            const res = await request(app)
                .post(`/api/attendance/sessions/${sessionId}/check-out`)
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('message', 'Checked out successfully.');
        });

        it('should return 404 if not checked in', async () => {
            const { token, userId } = await getAuthToken();
            const leagueId = await createTestLeague();
            const sessionId = await createGameSession(leagueId, userId);

            const res = await request(app)
                .post(`/api/attendance/sessions/${sessionId}/check-out`)
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(404);
            expect(res.body).toHaveProperty('error', 'Not checked in to this session.');
        });

        it('should reject check-out from locked session', async () => {
            const { token, userId } = await getAuthToken();
            const leagueId = await createTestLeague();
            const sessionId = await createGameSession(leagueId, userId, { status: 'locked' });
            await checkInUser(sessionId, userId);

            const res = await request(app)
                .post(`/api/attendance/sessions/${sessionId}/check-out`)
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(400);
            expect(res.body).toHaveProperty('error', 'Session is locked. Check-outs are closed.');
        });

        it('should reject check-out from completed session', async () => {
            const { token, userId } = await getAuthToken();
            const leagueId = await createTestLeague();
            const sessionId = await createGameSession(leagueId, userId, { status: 'completed' });
            await checkInUser(sessionId, userId);

            const res = await request(app)
                .post(`/api/attendance/sessions/${sessionId}/check-out`)
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(400);
            expect(res.body).toHaveProperty('error', 'Cannot check out of a completed session.');
        });

        it('should return 404 for non-existent session', async () => {
            const { token } = await getAuthToken();

            const res = await request(app)
                .post('/api/attendance/sessions/99999/check-out')
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(404);
            expect(res.body).toHaveProperty('error', 'Session not found.');
        });

        it('should require authentication', async () => {
            const res = await request(app)
                .post('/api/attendance/sessions/1/check-out');

            expect(res.status).toBe(401);
        });
    });

    describe('GET /api/attendance/sessions/:session_id/active', () => {
        it('should return active attendees', async () => {
            const { token, userId } = await getAuthToken();
            const leagueId = await createTestLeague();
            await addUserToLeague(userId, leagueId);
            const sessionId = await createGameSession(leagueId, userId);
            await checkInUser(sessionId, userId, true);

            const res = await request(app)
                .get(`/api/attendance/sessions/${sessionId}/active`)
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(200);
            expect(Array.isArray(res.body)).toBe(true);
            expect(res.body.length).toBe(1);
            expect(res.body[0]).toHaveProperty('user_id', userId);
            expect(res.body[0]).toHaveProperty('firstname');
            expect(res.body[0]).toHaveProperty('lastname');
        });

        it('should not include checked out users', async () => {
            const { token, userId } = await getAuthToken();
            const user2 = await getAuthToken();
            const leagueId = await createTestLeague();
            await addUserToLeague(userId, leagueId);
            await addUserToLeague(user2.userId, leagueId);
            const sessionId = await createGameSession(leagueId, userId);
            await checkInUser(sessionId, userId, true); // Active
            await checkInUser(sessionId, user2.userId, false); // Inactive (checked out)

            const res = await request(app)
                .get(`/api/attendance/sessions/${sessionId}/active`)
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(200);
            expect(res.body.length).toBe(1);
            expect(res.body[0].user_id).toBe(userId);
        });

        it('should require authentication', async () => {
            const res = await request(app)
                .get('/api/attendance/sessions/1/active');

            expect(res.status).toBe(401);
        });
    });

    describe('GET /api/attendance/leagues/:league_id/today', () => {
        it('should return or create today session', async () => {
            const { token, userId } = await getAuthToken();
            const leagueId = await createTestLeague();

            const res = await request(app)
                .get(`/api/attendance/leagues/${leagueId}/today`)
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('id');
            expect(res.body).toHaveProperty('league_id', leagueId);
            expect(res.body).toHaveProperty('attendance');
            expect(res.body).toHaveProperty('current_week');
            expect(res.body).toHaveProperty('discord_poll_posted');
        });

        it('should return 404 for non-existent league', async () => {
            const { token } = await getAuthToken();

            const res = await request(app)
                .get('/api/attendance/leagues/99999/today')
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(404);
            expect(res.body).toHaveProperty('error', 'League not found.');
        });

        it('should require authentication', async () => {
            const res = await request(app)
                .get('/api/attendance/leagues/1/today');

            expect(res.status).toBe(401);
        });
    });

    describe('GET /api/attendance/leagues/:league_id/active-poll', () => {
        it('should return null session when no active poll', async () => {
            const { token, userId } = await getAuthToken();
            const leagueId = await createTestLeague();

            const res = await request(app)
                .get(`/api/attendance/leagues/${leagueId}/active-poll`)
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('session', null);
            expect(res.body).toHaveProperty('message', 'No active poll for this league.');
        });

        it('should return session with active poll', async () => {
            const { token, userId } = await getAuthToken();
            const leagueId = await createTestLeague();
            const sessionId = await createGameSession(leagueId, userId);

            // Create a poll for the session
            await db('attendance_polls').insert({
                session_id: sessionId,
                league_id: leagueId,
                discord_message_id: '123456789',
                discord_channel_id: '987654321'
            });

            const res = await request(app)
                .get(`/api/attendance/leagues/${leagueId}/active-poll`)
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('session');
            expect(res.body.session).toHaveProperty('id', sessionId);
            expect(res.body.session).toHaveProperty('has_active_poll', true);
            expect(res.body.session).toHaveProperty('attendance');
        });

        it('should require authentication', async () => {
            const res = await request(app)
                .get('/api/attendance/leagues/1/active-poll');

            expect(res.status).toBe(401);
        });
    });
});
