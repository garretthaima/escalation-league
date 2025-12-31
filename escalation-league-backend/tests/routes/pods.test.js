const request = require('supertest');
const { getAuthToken, getAuthTokenWithRole } = require('../helpers/authHelper');
const { createTestLeague, addUserToLeague } = require('../helpers/leaguesHelper');
const { createTestPod, addPlayerToPod, setPodWinner } = require('../helpers/podHelper');
const { createWinCondition } = require('../helpers/winConditionHelper');

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

describe.skip('Pod Routes', () => {
    describe('POST /api/pods', () => {
        it('should create a new game pod', async () => {
            const leagueId = await createTestLeague({ is_active: 1 });
            const { token, userId } = await getAuthToken();
            await addUserToLeague(userId, leagueId);

            const res = await request(app)
                .post('/api/pods')
                .set('Authorization', `Bearer ${token}`)
                .send({
                    league_id: leagueId,
                    player_ids: [userId]
                });

            expect(res.status).toBe(201);
            expect(res.body).toHaveProperty('id');
            expect(res.body).toHaveProperty('message');
        });

        it('should reject pod creation without league enrollment', async () => {
            const leagueId = await createTestLeague({ is_active: 1 });
            const { token, userId } = await getAuthToken();

            const res = await request(app)
                .post('/api/pods')
                .set('Authorization', `Bearer ${token}`)
                .send({
                    league_id: leagueId,
                    player_ids: [userId]
                });

            expect(res.status).toBe(403);
        });

        it('should reject pod with more than 4 players', async () => {
            const leagueId = await createTestLeague({ is_active: 1 });
            const { token, userId } = await getAuthToken();
            await addUserToLeague(userId, leagueId);

            const player2 = await getAuthToken();
            const player3 = await getAuthToken();
            const player4 = await getAuthToken();
            const player5 = await getAuthToken();

            await addUserToLeague(player2.userId, leagueId);
            await addUserToLeague(player3.userId, leagueId);
            await addUserToLeague(player4.userId, leagueId);
            await addUserToLeague(player5.userId, leagueId);

            const res = await request(app)
                .post('/api/pods')
                .set('Authorization', `Bearer ${token}`)
                .send({
                    league_id: leagueId,
                    player_ids: [userId, player2.userId, player3.userId, player4.userId, player5.userId]
                });

            expect(res.status).toBe(400);
        });

        it('should reject pod for inactive league', async () => {
            const leagueId = await createTestLeague({ is_active: 0 });
            const { token, userId } = await getAuthToken();
            await addUserToLeague(userId, leagueId);

            const res = await request(app)
                .post('/api/pods')
                .set('Authorization', `Bearer ${token}`)
                .send({
                    league_id: leagueId,
                    player_ids: [userId]
                });

            expect(res.status).toBe(400);
        });

        // TODO: Test all players must be in league
        // TODO: Test duplicate player rejection
    });

    describe('GET /api/pods/:id', () => {
        it('should return pod details', async () => {
            const leagueId = await createTestLeague({ is_active: 1 });
            const { token, userId } = await getAuthToken();
            await addUserToLeague(userId, leagueId);

            const podId = await createTestPod(leagueId, userId);
            await addPlayerToPod(podId, userId);

            const res = await request(app)
                .get(`/api/pods/${podId}`)
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('id', podId);
            expect(res.body).toHaveProperty('league_id', leagueId);
            expect(res.body).toHaveProperty('players');
            expect(Array.isArray(res.body.players)).toBe(true);
        });

        it('should return 404 for non-existent pod', async () => {
            const { token } = await getAuthToken();

            const res = await request(app)
                .get('/api/pods/99999')
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(404);
        });

        // TODO: Test includes player details (names, commanders)
        // TODO: Test includes win condition
    });

    describe('POST /api/pods/:id/join', () => {
        it('should allow user to join open pod', async () => {
            const leagueId = await createTestLeague({ is_active: 1 });
            const creator = await getAuthToken();
            await addUserToLeague(creator.userId, leagueId);

            const podId = await createTestPod(leagueId, creator.userId, {
                confirmationStatus: 'open'
            });
            await addPlayerToPod(podId, creator.userId);

            const { token, userId } = await getAuthToken();
            await addUserToLeague(userId, leagueId);

            const res = await request(app)
                .post(`/api/pods/${podId}/join`)
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(200);
        });

        it('should reject joining full pod (4 players)', async () => {
            const leagueId = await createTestLeague({ is_active: 1 });
            const creator = await getAuthToken();
            await addUserToLeague(creator.userId, leagueId);

            const podId = await createTestPod(leagueId, creator.userId);
            await addPlayerToPod(podId, creator.userId);

            // Add 3 more players (total 4)
            for (let i = 0; i < 3; i++) {
                const player = await getAuthToken();
                await addUserToLeague(player.userId, leagueId);
                await addPlayerToPod(podId, player.userId);
            }

            const { token, userId } = await getAuthToken();
            await addUserToLeague(userId, leagueId);

            const res = await request(app)
                .post(`/api/pods/${podId}/join`)
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(400);
        });

        it('should reject joining if already in pod', async () => {
            const leagueId = await createTestLeague({ is_active: 1 });
            const { token, userId } = await getAuthToken();
            await addUserToLeague(userId, leagueId);

            const podId = await createTestPod(leagueId, userId);
            await addPlayerToPod(podId, userId);

            const res = await request(app)
                .post(`/api/pods/${podId}/join`)
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(400);
        });

        // TODO: Test can't join completed pod
        // TODO: Test can't join if not in league
    });

    describe('POST /api/pods/:id/confirm', () => {
        it('should confirm game result', async () => {
            const leagueId = await createTestLeague({ is_active: 1 });
            const { token, userId } = await getAuthToken();
            await addUserToLeague(userId, leagueId);

            const podId = await createTestPod(leagueId, userId, {
                confirmationStatus: 'pending'
            });
            await addPlayerToPod(podId, userId);

            const res = await request(app)
                .post(`/api/pods/${podId}/confirm`)
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(200);
        });

        it('should complete pod when all players confirm', async () => {
            const leagueId = await createTestLeague({ is_active: 1 });

            const player1 = await getAuthToken();
            const player2 = await getAuthToken();

            await addUserToLeague(player1.userId, leagueId);
            await addUserToLeague(player2.userId, leagueId);

            const podId = await createTestPod(leagueId, player1.userId, {
                confirmationStatus: 'pending'
            });
            await addPlayerToPod(podId, player1.userId);
            await addPlayerToPod(podId, player2.userId);

            // Player 1 confirms
            await request(app)
                .post(`/api/pods/${podId}/confirm`)
                .set('Authorization', `Bearer ${player1.token}`);

            // Player 2 confirms
            const res = await request(app)
                .post(`/api/pods/${podId}/confirm`)
                .set('Authorization', `Bearer ${player2.token}`);

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('message');
        });

        // TODO: Test points awarded on confirmation
        // TODO: Test stats updated on confirmation
    });

    describe('PUT /api/pods/:id/result', () => {
        it('should update game result', async () => {
            const leagueId = await createTestLeague({ is_active: 1 });
            const { token, userId } = await getAuthToken();
            await addUserToLeague(userId, leagueId);

            const winConditionId = await createWinCondition({ name: 'Combat Damage' });
            const podId = await createTestPod(leagueId, userId);
            await addPlayerToPod(podId, userId);

            const res = await request(app)
                .put(`/api/pods/${podId}/result`)
                .set('Authorization', `Bearer ${token}`)
                .send({
                    winner_id: userId,
                    win_condition_id: winConditionId,
                    turn_order: [userId]
                });

            expect(res.status).toBe(200);
        });

        it('should only allow creator to update result', async () => {
            const leagueId = await createTestLeague({ is_active: 1 });
            const creator = await getAuthToken();
            await addUserToLeague(creator.userId, leagueId);

            const podId = await createTestPod(leagueId, creator.userId);
            await addPlayerToPod(podId, creator.userId);

            const { token } = await getAuthToken(); // Different user

            const res = await request(app)
                .put(`/api/pods/${podId}/result`)
                .set('Authorization', `Bearer ${token}`)
                .send({
                    winner_id: creator.userId,
                    win_condition_id: 1
                });

            expect(res.status).toBe(403);
        });

        it('should validate winner is in pod', async () => {
            const leagueId = await createTestLeague({ is_active: 1 });
            const { token, userId } = await getAuthToken();
            await addUserToLeague(userId, leagueId);

            const otherUser = await getAuthToken();

            const podId = await createTestPod(leagueId, userId);
            await addPlayerToPod(podId, userId);

            const res = await request(app)
                .put(`/api/pods/${podId}/result`)
                .set('Authorization', `Bearer ${token}`)
                .send({
                    winner_id: otherUser.userId, // Not in pod
                    win_condition_id: 1
                });

            expect(res.status).toBe(400);
        });

        // TODO: Test validate win_condition_id exists
        // TODO: Test changes confirmation_status to pending
    });

    describe('DELETE /api/pods/:id', () => {
        it('should soft delete pod', async () => {
            const leagueId = await createTestLeague({ is_active: 1 });
            const { token, userId } = await getAuthToken();
            await addUserToLeague(userId, leagueId);

            const podId = await createTestPod(leagueId, userId);

            const res = await request(app)
                .delete(`/api/pods/${podId}`)
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(200);
        });

        it('should not allow deleting confirmed pods', async () => {
            const leagueId = await createTestLeague({ is_active: 1 });
            const { token, userId } = await getAuthToken();
            await addUserToLeague(userId, leagueId);

            const podId = await createTestPod(leagueId, userId, {
                confirmationStatus: 'complete'
            });

            const res = await request(app)
                .delete(`/api/pods/${podId}`)
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(400);
        });

        it('should only allow creator to delete', async () => {
            const leagueId = await createTestLeague({ is_active: 1 });
            const creator = await getAuthToken();
            await addUserToLeague(creator.userId, leagueId);

            const podId = await createTestPod(leagueId, creator.userId);

            const { token } = await getAuthToken(); // Different user

            const res = await request(app)
                .delete(`/api/pods/${podId}`)
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(403);
        });

        // TODO: Test admin can delete any pod
        // TODO: Test cascade to game_players
    });

    describe('GET /api/pods/league/:leagueId', () => {
        it('should return all pods for a league', async () => {
            const leagueId = await createTestLeague({ is_active: 1 });
            const { token, userId } = await getAuthToken();
            await addUserToLeague(userId, leagueId);

            await createTestPod(leagueId, userId);
            await createTestPod(leagueId, userId);

            const res = await request(app)
                .get(`/api/pods/league/${leagueId}`)
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(200);
            expect(Array.isArray(res.body)).toBe(true);
            expect(res.body.length).toBeGreaterThanOrEqual(2);
        });

        it('should filter by status', async () => {
            const leagueId = await createTestLeague({ is_active: 1 });
            const { token, userId } = await getAuthToken();
            await addUserToLeague(userId, leagueId);

            await createTestPod(leagueId, userId, { status: 'active' });
            await createTestPod(leagueId, userId, { status: 'completed' });

            const res = await request(app)
                .get(`/api/pods/league/${leagueId}`)
                .query({ status: 'active' })
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(200);
            expect(res.body.every(pod => pod.status === 'active')).toBe(true);
        });

        // TODO: Test pagination
        // TODO: Test include player details
    });
});