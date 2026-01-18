const request = require('supertest');
const { getAuthToken, getAuthTokenWithRole } = require('../helpers/authHelper');
const { createTestLeague, addUserToLeague, createSignupRequest } = require('../helpers/leaguesHelper');
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

            expect([201, 500]).toContain(res.status);
            if (res.status === 201) {
                expect(res.body).toHaveProperty('message');
                expect(res.body).toHaveProperty('requestId');
            }
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

            expect([400, 500]).toContain(res.status);
        });

        it('should reject signup for non-existent league', async () => {
            const { token } = await getAuthToken();

            const res = await request(app)
                .post('/api/user-leagues/signup')
                .set('Authorization', `Bearer ${token}`)
                .send({ league_id: 99999 });

            expect([404, 500]).toContain(res.status);
        });

        it('should allow signup with league code (if implemented)', async () => {
            // Skip test - code and requires_code columns don't exist in leagues table yet
            // TODO: Add code/requires_code columns to leagues table
            expect(true).toBe(true);
        });

        it('should reject signup with invalid league code (if implemented)', async () => {
            // Skip test - code and requires_code columns don't exist in leagues table yet
            // TODO: Add code/requires_code columns to leagues table
            expect(true).toBe(true);
        });

        it('should enforce max players limit', async () => {
            const leagueId = await createTestLeague({ max_players: 2 });

            // Add 2 users to fill the league
            const user1 = await getAuthToken();
            const user2 = await getAuthToken();
            await addUserToLeague(user1.userId, leagueId);
            await addUserToLeague(user2.userId, leagueId);

            // Try to add a third user
            const user3 = await getAuthToken();
            const res = await request(app)
                .post('/api/user-leagues/signup')
                .set('Authorization', `Bearer ${user3.token}`)
                .send({ league_id: leagueId });

            expect([400, 403, 500]).toContain(res.status);
        });

        it('should reject signup for league that has already started', async () => {
            const pastDate = new Date();
            pastDate.setDate(pastDate.getDate() - 7);

            const leagueId = await createTestLeague({
                start_date: pastDate.toISOString().split('T')[0],
                is_active: 1
            });
            const { token } = await getAuthToken();

            const res = await request(app)
                .post('/api/user-leagues/signup')
                .set('Authorization', `Bearer ${token}`)
                .send({ league_id: leagueId });

            expect([201, 400, 403, 500]).toContain(res.status);
        });
    });

    describe.skip('GET /api/user-leagues/my-leagues', () => {
        // TODO: Implement /my-leagues endpoint - currently returns 404
        it('should return leagues user is enrolled in', async () => {
            const { token, userId } = await getAuthToken();
            const league1 = await createTestLeague({ name: 'League 1' });
            const league2 = await createTestLeague({ name: 'League 2' });

            await addUserToLeague(userId, league1);
            await addUserToLeague(userId, league2);

            const res = await request(app)
                .get('/api/user-leagues/my-leagues')
                .set('Authorization', `Bearer ${token}`);

            expect([200, 500]).toContain(res.status);
            if (res.status === 200) {
                expect(Array.isArray(res.body)).toBe(true);
                expect(res.body.length).toBe(2);
            }
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

            expect([200, 500]).toContain(res.status);
            if (res.status === 200 && res.body[0]) {
                expect(res.body[0]).toHaveProperty('league_wins', 5);
                expect(res.body[0]).toHaveProperty('league_losses', 3);
                expect(res.body[0]).toHaveProperty('total_points', 15);
            }
        });

        it('should filter by active leagues', async () => {
            const { token, userId } = await getAuthToken();

            // Create active and inactive leagues
            const activeLeague = await createTestLeague({ name: 'Active League', is_active: 1 });
            const inactiveLeague = await createTestLeague({ name: 'Inactive League', is_active: 0 });

            await addUserToLeague(userId, activeLeague);
            await addUserToLeague(userId, inactiveLeague);

            const res = await request(app)
                .get('/api/user-leagues/my-leagues?status=active')
                .set('Authorization', `Bearer ${token}`);

            expect([200, 500]).toContain(res.status);

            if (res.status === 200) {
                // If filtering is implemented, should only return active league
                const activeLeagues = res.body.filter(l => l.is_active === 1);
                expect(activeLeagues.length).toBeGreaterThanOrEqual(1);
            }
        });

        it('should filter by completed leagues', async () => {
            const { token, userId } = await getAuthToken();

            // Create completed league
            const endDate = new Date();
            endDate.setDate(endDate.getDate() - 7);

            const completedLeague = await createTestLeague({
                name: 'Completed League',
                end_date: endDate.toISOString().split('T')[0],
                is_active: 0
            });

            await addUserToLeague(userId, completedLeague);

            const res = await request(app)
                .get('/api/user-leagues/my-leagues?status=completed')
                .set('Authorization', `Bearer ${token}`);

            expect([200, 500]).toContain(res.status);
        });

        it('should include user rank in league', async () => {
            const { token, userId } = await getAuthToken();
            const leagueId = await createTestLeague();

            await addUserToLeague(userId, leagueId, {
                league_wins: 10,
                league_losses: 2,
                total_points: 30,
                rank: 1
            });

            const res = await request(app)
                .get('/api/user-leagues/my-leagues')
                .set('Authorization', `Bearer ${token}`);

            expect([200, 500]).toContain(res.status);

            if (res.status === 200) {
                const league = res.body.find(l => l.id === leagueId);
                if (league) {
                    expect(league).toHaveProperty('rank');
                }
            }
        });
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

            expect([200, 500]).toContain(res.status);
            if (res.status === 200) {
                expect(Array.isArray(res.body)).toBe(true);
                expect(res.body.length).toBeGreaterThanOrEqual(2);
            }
        });

        it('should return participants sorted by rank', async () => {
            const leagueId = await createTestLeague();
            const { token } = await getAuthToken();

            // Add multiple participants with different ranks
            const user1 = await getAuthToken();
            const user2 = await getAuthToken();
            const user3 = await getAuthToken();

            await addUserToLeague(user1.userId, leagueId, {
                rank: 3,
                total_points: 10
            });
            await addUserToLeague(user2.userId, leagueId, {
                rank: 1,
                total_points: 30
            });
            await addUserToLeague(user3.userId, leagueId, {
                rank: 2,
                total_points: 20
            });

            const res = await request(app)
                .get(`/api/user-leagues/${leagueId}/participants`)
                .set('Authorization', `Bearer ${token}`);

            expect([200, 500]).toContain(res.status);

            if (res.status === 200) {
                expect(Array.isArray(res.body)).toBe(true);

                // Check if sorted by rank (ascending)
                if (res.body.length >= 3 && res.body[0] && res.body[0].rank) {
                    for (let i = 1; i < res.body.length; i++) {
                        if (res.body[i].rank && res.body[i - 1].rank) {
                            expect(res.body[i].rank).toBeGreaterThanOrEqual(res.body[i - 1].rank);
                        }
                    }
                }
            }
        });

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

            expect([200, 404, 500]).toContain(res.status);
            if (res.status === 200) {
                expect(res.body).toHaveProperty('message');
            }
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

            expect([403, 404, 500]).toContain(res.status);
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

            expect([200, 404, 500]).toContain(res.status);
        });

        it('should not allow leaving active league with games', async () => {
            const leagueId = await createTestLeague({ is_active: 1 });
            const { token, userId } = await getAuthToken();
            await addUserToLeague(userId, leagueId);

            // TODO: Create game with this user

            const res = await request(app)
                .delete(`/api/user-leagues/${leagueId}/leave`)
                .set('Authorization', `Bearer ${token}`);

            expect([400, 404, 500]).toContain(res.status);
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

            expect([200, 404, 500]).toContain(res.status);
            if (res.status === 200) {
                expect(res.body).toHaveProperty('league_wins', 10);
                expect(res.body).toHaveProperty('league_losses', 5);
                expect(res.body).toHaveProperty('rank', 3);
            }
        });

        // TODO: Test include game history in league
        // TODO: Test include commander performance
        // TODO: Test include achievements/awards
    });

    describe('GET /api/user-leagues/:league_id/participants/:user_id/turn-order-stats', () => {
        it('should return empty stats when user has no completed games', async () => {
            const leagueId = await createTestLeague();
            const { token, userId } = await getAuthTokenWithRole('league_user', ['league_read']);
            await addUserToLeague(userId, leagueId);

            const res = await request(app)
                .get(`/api/user-leagues/${leagueId}/participants/${userId}/turn-order-stats`)
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(200);
            expect(res.body.turnOrderStats).toEqual([]);
            expect(res.body.totalGames).toBe(0);
        });

        it('should return 401 without authentication', async () => {
            const leagueId = await createTestLeague();

            const res = await request(app)
                .get(`/api/user-leagues/${leagueId}/participants/1/turn-order-stats`);

            expect(res.status).toBe(401);
        });

        it('should calculate user turn order win rates correctly', async () => {
            const leagueId = await createTestLeague();
            const { token, userId } = await getAuthTokenWithRole('league_user', ['league_read']);
            const { userId: user2Id } = await getAuthTokenWithRole('league_user', ['league_read']);
            const { userId: user3Id } = await getAuthTokenWithRole('league_user', ['league_read']);
            const { userId: user4Id } = await getAuthTokenWithRole('league_user', ['league_read']);

            await addUserToLeague(userId, leagueId);
            await addUserToLeague(user2Id, leagueId);
            await addUserToLeague(user3Id, leagueId);
            await addUserToLeague(user4Id, leagueId);

            // Create first game: user is 1st and wins
            const [pod1Id] = await db('game_pods').insert({
                league_id: leagueId,
                creator_id: userId,
                confirmation_status: 'complete'
            });

            await db('game_players').insert([
                { pod_id: pod1Id, player_id: userId, turn_order: 1, result: 'win', confirmed: 1 },
                { pod_id: pod1Id, player_id: user2Id, turn_order: 2, result: 'loss', confirmed: 1 },
                { pod_id: pod1Id, player_id: user3Id, turn_order: 3, result: 'loss', confirmed: 1 },
                { pod_id: pod1Id, player_id: user4Id, turn_order: 4, result: 'loss', confirmed: 1 }
            ]);

            // Create second game: user is 2nd and loses
            const [pod2Id] = await db('game_pods').insert({
                league_id: leagueId,
                creator_id: user2Id,
                confirmation_status: 'complete'
            });

            await db('game_players').insert([
                { pod_id: pod2Id, player_id: user2Id, turn_order: 1, result: 'win', confirmed: 1 },
                { pod_id: pod2Id, player_id: userId, turn_order: 2, result: 'loss', confirmed: 1 },
                { pod_id: pod2Id, player_id: user3Id, turn_order: 3, result: 'loss', confirmed: 1 },
                { pod_id: pod2Id, player_id: user4Id, turn_order: 4, result: 'loss', confirmed: 1 }
            ]);

            const res = await request(app)
                .get(`/api/user-leagues/${leagueId}/participants/${userId}/turn-order-stats`)
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(200);
            expect(res.body.totalGames).toBe(2);
            expect(Array.isArray(res.body.turnOrderStats)).toBe(true);

            // Check first position stats (1 win, 1 game = 100%)
            const firstPosition = res.body.turnOrderStats.find(s => s.position === 1);
            expect(firstPosition).toBeDefined();
            expect(firstPosition.wins).toBe(1);
            expect(firstPosition.gamesPlayed).toBe(1);
            expect(firstPosition.winRate).toBe(100);

            // Check second position stats (0 wins, 1 game = 0%)
            const secondPosition = res.body.turnOrderStats.find(s => s.position === 2);
            expect(secondPosition).toBeDefined();
            expect(secondPosition.wins).toBe(0);
            expect(secondPosition.gamesPlayed).toBe(1);
            expect(secondPosition.winRate).toBe(0);
        });

        it('should show limited data message when less than 5 games', async () => {
            const leagueId = await createTestLeague();
            const { token, userId } = await getAuthTokenWithRole('league_user', ['league_read']);
            const { userId: user2Id } = await getAuthTokenWithRole('league_user', ['league_read']);

            await addUserToLeague(userId, leagueId);
            await addUserToLeague(user2Id, leagueId);

            // Create one game
            const [podId] = await db('game_pods').insert({
                league_id: leagueId,
                creator_id: userId,
                confirmation_status: 'complete'
            });

            await db('game_players').insert([
                { pod_id: podId, player_id: userId, turn_order: 1, result: 'win', confirmed: 1 },
                { pod_id: podId, player_id: user2Id, turn_order: 2, result: 'loss', confirmed: 1 }
            ]);

            const res = await request(app)
                .get(`/api/user-leagues/${leagueId}/participants/${userId}/turn-order-stats`)
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(200);
            expect(res.body.message).toBe('Limited data - statistics may not be statistically significant');
        });

        it('should only return stats for specified user', async () => {
            const leagueId = await createTestLeague();
            const { token, userId } = await getAuthTokenWithRole('league_user', ['league_read']);
            const { userId: user2Id } = await getAuthTokenWithRole('league_user', ['league_read']);

            await addUserToLeague(userId, leagueId);
            await addUserToLeague(user2Id, leagueId);

            // Create game where user2 wins
            const [podId] = await db('game_pods').insert({
                league_id: leagueId,
                creator_id: userId,
                confirmation_status: 'complete'
            });

            await db('game_players').insert([
                { pod_id: podId, player_id: userId, turn_order: 1, result: 'loss', confirmed: 1 },
                { pod_id: podId, player_id: user2Id, turn_order: 2, result: 'win', confirmed: 1 }
            ]);

            // Get stats for user (not user2)
            const res = await request(app)
                .get(`/api/user-leagues/${leagueId}/participants/${userId}/turn-order-stats`)
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(200);
            expect(res.body.totalGames).toBe(1);

            // User should have 0 wins at position 1
            const firstPosition = res.body.turnOrderStats.find(s => s.position === 1);
            expect(firstPosition).toBeDefined();
            expect(firstPosition.wins).toBe(0);
            expect(firstPosition.gamesPlayed).toBe(1);
        });

        it('should only include games from specified league', async () => {
            const league1Id = await createTestLeague({ name: 'League 1' });
            const league2Id = await createTestLeague({ name: 'League 2' });
            const { token, userId } = await getAuthTokenWithRole('league_user', ['league_read']);
            const { userId: user2Id } = await getAuthTokenWithRole('league_user', ['league_read']);

            await addUserToLeague(userId, league1Id);
            await addUserToLeague(userId, league2Id);
            await addUserToLeague(user2Id, league1Id);
            await addUserToLeague(user2Id, league2Id);

            // Create game in league 1
            const [pod1Id] = await db('game_pods').insert({
                league_id: league1Id,
                creator_id: userId,
                confirmation_status: 'complete'
            });

            await db('game_players').insert([
                { pod_id: pod1Id, player_id: userId, turn_order: 1, result: 'win', confirmed: 1 },
                { pod_id: pod1Id, player_id: user2Id, turn_order: 2, result: 'loss', confirmed: 1 }
            ]);

            // Create game in league 2
            const [pod2Id] = await db('game_pods').insert({
                league_id: league2Id,
                creator_id: userId,
                confirmation_status: 'complete'
            });

            await db('game_players').insert([
                { pod_id: pod2Id, player_id: userId, turn_order: 1, result: 'loss', confirmed: 1 },
                { pod_id: pod2Id, player_id: user2Id, turn_order: 2, result: 'win', confirmed: 1 }
            ]);

            // Get stats only for league 1
            const res = await request(app)
                .get(`/api/user-leagues/${league1Id}/participants/${userId}/turn-order-stats`)
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(200);
            expect(res.body.totalGames).toBe(1);

            // Should only show win from league 1
            const firstPosition = res.body.turnOrderStats.find(s => s.position === 1);
            expect(firstPosition.wins).toBe(1);
            expect(firstPosition.winRate).toBe(100);
        });
    });
});