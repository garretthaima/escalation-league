const request = require('supertest');
const { getAuthToken, getAuthTokenWithRole } = require('../helpers/authHelper');
const { createTestLeague, addUserToLeague, createSignupRequest } = require('../helpers/leaguesHelper');

jest.mock('../../models/db', () => require('../helpers/testDb'));
jest.mock('../../utils/settingsUtils', () => ({
    getSetting: jest.fn((key) => {
        if (key === 'secret_key') {
            return Promise.resolve(process.env.JWT_SECRET || 'test-secret-key');
        }
        return Promise.resolve(null);
    })
}));

const app = require('../../server');

describe('User-League Routes', () => {
    describe('POST /api/user-leagues/signup', () => {
        it('should create league signup request', async () => {
            const leagueId = await createTestLeague();
            const { token, userId } = await getAuthToken();

            const res = await request(app)
                .post('/api/user-leagues/signup')
                .set('Authorization', `Bearer ${token}`)
                .send({ league_id: leagueId });

            expect(res.status).toBe(201);
            expect(res.body).toHaveProperty('message');
            expect(res.body).toHaveProperty('requestId');
        });

        it('should reject duplicate signup request', async () => {
            const leagueId = await createTestLeague();
            const { token, userId } = await getAuthToken();

            // First request
            await request(app)
                .post('/api/user-leagues/signup')
                .set('Authorization', `Bearer ${token}`)
                .send({ league_id: leagueId });

            // Second request
            const res = await request(app)
                .post('/api/user-leagues/signup')
                .set('Authorization', `Bearer ${token}`)
                .send({ league_id: leagueId });

            expect(res.status).toBe(400);
        });

        it('should reject signup for non-existent league', async () => {
            const { token } = await getAuthToken();

            const res = await request(app)
                .post('/api/user-leagues/signup')
                .set('Authorization', `Bearer ${token}`)
                .send({ league_id: 99999 });

            expect(res.status).toBe(404);
        });

        // TODO: Test signup with league code
        // TODO: Test max players limit
        // TODO: Test league start date restriction
    });

    describe('GET /api/user-leagues/my-leagues', () => {
        it('should return leagues user is enrolled in', async () => {
            const { token, userId } = await getAuthToken();
            const league1 = await createTestLeague({ name: 'League 1' });
            const league2 = await createTestLeague({ name: 'League 2' });

            await addUserToLeague(userId, league1);
            await addUserToLeague(userId, league2);

            const res = await request(app)
                .get('/api/user-leagues/my-leagues')
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(200);
            expect(Array.isArray(res.body)).toBe(true);
            expect(res.body.length).toBe(2);
        });

        it('should include league statistics', async () => {
            const { token, userId } = await getAuthToken();
            const leagueId = await createTestLeague();

            await addUserToLeague(userId, leagueId, {
                league_wins: 5,
                league_losses: 3,
                total_points: 15
            });

            const res = await request(app)
                .get('/api/user-leagues/my-leagues')
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(200);
            expect(res.body[0]).toHaveProperty('league_wins', 5);
            expect(res.body[0]).toHaveProperty('league_losses', 3);
            expect(res.body[0]).toHaveProperty('total_points', 15);
        });

        // TODO: Test filter by active/completed
        // TODO: Test include user rank in league
    });

    describe('GET /api/user-leagues/:leagueId/participants', () => {
        it('should return all participants in a league', async () => {
            const leagueId = await createTestLeague();
            const { token } = await getAuthToken();

            // Add multiple participants
            const user1 = await getAuthToken();
            const user2 = await getAuthToken();
            await addUserToLeague(user1.userId, leagueId);
            await addUserToLeague(user2.userId, leagueId);

            const res = await request(app)
                .get(`/api/user-leagues/${leagueId}/participants`)
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(200);
            expect(Array.isArray(res.body)).toBe(true);
            expect(res.body.length).toBeGreaterThanOrEqual(2);
        });

        // TODO: Test participants sorted by rank
        // TODO: Test include current deck/commander
        // TODO: Test pagination for large leagues
    });

    describe('PUT /api/user-leagues/:leagueId/deck', () => {
        it('should update user deck for league', async () => {
            const leagueId = await createTestLeague();
            const { token, userId } = await getAuthToken();
            await addUserToLeague(userId, leagueId);

            const res = await request(app)
                .put(`/api/user-leagues/${leagueId}/deck`)
                .set('Authorization', `Bearer ${token}`)
                .send({
                    deck_id: 'archidekt-12345',
                    current_commander: 'Atraxa, Praetors\' Voice'
                });

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('message');
        });

        it('should reject if user not in league', async () => {
            const leagueId = await createTestLeague();
            const { token } = await getAuthToken();

            const res = await request(app)
                .put(`/api/user-leagues/${leagueId}/deck`)
                .set('Authorization', `Bearer ${token}`)
                .send({
                    deck_id: 'archidekt-12345',
                    current_commander: 'Atraxa'
                });

            expect(res.status).toBe(403);
        });

        // TODO: Test validate deck exists
        // TODO: Test deck budget validation
        // TODO: Test commander partner support
    });

    describe('DELETE /api/user-leagues/:leagueId/leave', () => {
        it('should allow user to leave league', async () => {
            const leagueId = await createTestLeague();
            const { token, userId } = await getAuthToken();
            await addUserToLeague(userId, leagueId);

            const res = await request(app)
                .delete(`/api/user-leagues/${leagueId}/leave`)
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(200);
        });

        it('should not allow leaving active league with games', async () => {
            const leagueId = await createTestLeague({ is_active: 1 });
            const { token, userId } = await getAuthToken();
            await addUserToLeague(userId, leagueId);

            // TODO: Create game with this user

            const res = await request(app)
                .delete(`/api/user-leagues/${leagueId}/leave`)
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(400);
        });

        // TODO: Test admin can remove users
        // TODO: Test refund handling if applicable
    });

    describe('GET /api/user-leagues/:leagueId/my-stats', () => {
        it('should return user stats for specific league', async () => {
            const leagueId = await createTestLeague();
            const { token, userId } = await getAuthToken();
            await addUserToLeague(userId, leagueId, {
                league_wins: 10,
                league_losses: 5,
                total_points: 30,
                rank: 3
            });

            const res = await request(app)
                .get(`/api/user-leagues/${leagueId}/my-stats`)
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('league_wins', 10);
            expect(res.body).toHaveProperty('league_losses', 5);
            expect(res.body).toHaveProperty('rank', 3);
        });

        // TODO: Test include game history in league
        // TODO: Test include commander performance
        // TODO: Test include achievements/awards
    });
});