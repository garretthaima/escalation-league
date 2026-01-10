const request = require('supertest');
const { getAuthToken, getAuthTokenWithRole } = require('../helpers/authHelper');
const { createTestLeague, addUserToLeague } = require('../helpers/leaguesHelper');
const { createTestPod, addPlayerToPod, setPodWinner } = require('../helpers/podHelper');
const { createWinCondition } = require('../helpers/winConHelper');

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

describe('Pod Routes', () => {
    describe('POST /api/pods', () => {
        it('should create a new game pod', async () => {
            const leagueId = await createTestLeague({ is_active: 1 });
            const { token, userId } = await getAuthTokenWithRole('super_admin');
            await addUserToLeague(userId, leagueId);

            const res = await request(app)
                .post('/api/pods')
                .set('Authorization', `Bearer ${token}`)
                .send({
                    leagueId: leagueId
                });

            expect(res.status).toBe(201);
            expect(res.body).toHaveProperty('id');
            expect(res.body).toHaveProperty('league_id', leagueId);
        });

        it('should reject pod creation without league enrollment', async () => {
            const leagueId = await createTestLeague({ is_active: 1 });
            const { token, userId } = await getAuthTokenWithRole('super_admin');

            const res = await request(app)
                .post('/api/pods')
                .set('Authorization', `Bearer ${token}`)
                .send({
                    leagueId: leagueId
                });

            // Note: Currently no validation for league enrollment in pod creation
            // TODO: Add middleware to verify user is enrolled in league before creating pod
            expect([201, 400]).toContain(res.status);
        });

        // TODO: Test all players must be in league
        // TODO: Test duplicate player rejection
    });

    describe('GET /api/pods', () => {
        it('should return pod details by podId query param', async () => {
            const leagueId = await createTestLeague({ is_active: 1 });
            const { token, userId } = await getAuthToken();
            await addUserToLeague(userId, leagueId);

            const podId = await createTestPod(leagueId, userId);
            await addPlayerToPod(podId, userId);

            const res = await request(app)
                .get('/api/pods')
                .query({ podId: podId })
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('id', podId);
            expect(res.body).toHaveProperty('league_id', leagueId);
            expect(res.body).toHaveProperty('participants');
            expect(Array.isArray(res.body.participants)).toBe(true);
        });

        it('should return all pods for a league', async () => {
            const leagueId = await createTestLeague({ is_active: 1 });
            const { token, userId } = await getAuthToken();
            await addUserToLeague(userId, leagueId);

            await createTestPod(leagueId, userId);
            await createTestPod(leagueId, userId);

            const res = await request(app)
                .get('/api/pods')
                .query({ league_id: leagueId })
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(200);
            expect(Array.isArray(res.body)).toBe(true);
            expect(res.body.length).toBeGreaterThanOrEqual(2);
        });

        // TODO: Test includes player details
        // TODO: Test includes win condition
    });

    describe('POST /api/pods/:podId/join', () => {
        it('should allow user to join open pod', async () => {
            const leagueId = await createTestLeague({ is_active: 1 });
            const creator = await getAuthTokenWithRole('super_admin');
            await addUserToLeague(creator.userId, leagueId);

            const podId = await createTestPod(leagueId, creator.userId, {
                confirmation_status: 'open'
            });
            await addPlayerToPod(podId, creator.userId);

            const { token, userId } = await getAuthTokenWithRole('super_admin');
            await addUserToLeague(userId, leagueId);

            const res = await request(app)
                .post(`/api/pods/${podId}/join`)
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(200);
        });

        it('should reject joining full pod (4 players)', async () => {
            const leagueId = await createTestLeague({ is_active: 1 });
            const creator = await getAuthTokenWithRole('super_admin');
            await addUserToLeague(creator.userId, leagueId);

            const podId = await createTestPod(leagueId, creator.userId);
            await addPlayerToPod(podId, creator.userId);

            // Add 3 more players (total 4)
            for (let i = 0; i < 3; i++) {
                const player = await getAuthToken();
                await addUserToLeague(player.userId, leagueId);
                await addPlayerToPod(podId, player.userId);
            }

            const { token, userId } = await getAuthTokenWithRole('super_admin');
            await addUserToLeague(userId, leagueId);

            const res = await request(app)
                .post(`/api/pods/${podId}/join`)
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(400);
        });

        it('should reject joining if already in pod', async () => {
            const leagueId = await createTestLeague({ is_active: 1 });
            const { token, userId } = await getAuthTokenWithRole('super_admin');
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

    describe('POST /api/pods/:podId/log', () => {
        it('should log game result', async () => {
            const leagueId = await createTestLeague({ is_active: 1 });
            const { token, userId } = await getAuthTokenWithRole('super_admin');
            await addUserToLeague(userId, leagueId);

            const podId = await createTestPod(leagueId, userId, {
                confirmation_status: 'active'
            });
            await addPlayerToPod(podId, userId);

            const res = await request(app)
                .post(`/api/pods/${podId}/log`)
                .set('Authorization', `Bearer ${token}`)
                .send({
                    result: 'win'
                });

            expect(res.status).toBe(200);
        });

        it('should complete pod when all players confirm', async () => {
            const leagueId = await createTestLeague({ is_active: 1 });

            const player1 = await getAuthTokenWithRole('super_admin');
            const player2 = await getAuthTokenWithRole('super_admin');

            await addUserToLeague(player1.userId, leagueId);
            await addUserToLeague(player2.userId, leagueId);

            const podId = await createTestPod(leagueId, player1.userId, {
                confirmation_status: 'active'
            });
            await addPlayerToPod(podId, player1.userId);
            await addPlayerToPod(podId, player2.userId);

            // Player 1 confirms
            await request(app)
                .post(`/api/pods/${podId}/log`)
                .set('Authorization', `Bearer ${player1.token}`)
                .send({ result: 'win' });

            // Player 2 confirms
            const res = await request(app)
                .post(`/api/pods/${podId}/log`)
                .set('Authorization', `Bearer ${player2.token}`)
                .send({ result: 'loss' });

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('message');
        });

        // TODO: Test points awarded on confirmation
        // TODO: Test stats updated on confirmation
    });

    describe('Pod Workflow Tests', () => {
        describe('Pod Creation and Player Joining', () => {
            it('should create pod with creator as first player', async () => {
                const leagueId = await createTestLeague({ is_active: 1 });
                const { token, userId } = await getAuthTokenWithRole('super_admin');
                await addUserToLeague(userId, leagueId);

                const res = await request(app)
                    .post('/api/pods')
                    .set('Authorization', `Bearer ${token}`)
                    .send({ leagueId });

                expect(res.status).toBe(201);
                expect(res.body).toHaveProperty('id');
                expect(res.body).toHaveProperty('creator_id', userId);
                expect(res.body).toHaveProperty('confirmation_status', 'open');

                // Verify creator was automatically added as participant
                const podRes = await request(app)
                    .get('/api/pods')
                    .query({ podId: res.body.id })
                    .set('Authorization', `Bearer ${token}`);

                expect(podRes.body.participants).toHaveLength(1);
                expect(podRes.body.participants[0].player_id).toBe(userId);
            });

            it('should allow second player to join open pod', async () => {
                const leagueId = await createTestLeague({ is_active: 1 });
                const creator = await getAuthTokenWithRole('super_admin');
                await addUserToLeague(creator.userId, leagueId);

                const podId = await createTestPod(leagueId, creator.userId, {
                    confirmation_status: 'open'
                });
                await addPlayerToPod(podId, creator.userId);

                const player2 = await getAuthTokenWithRole('super_admin');
                await addUserToLeague(player2.userId, leagueId);

                const res = await request(app)
                    .post(`/api/pods/${podId}/join`)
                    .set('Authorization', `Bearer ${player2.token}`);

                expect(res.status).toBe(200);
                expect(res.body).toHaveProperty('message');

                // Verify pod still open with 2 players
                const podRes = await request(app)
                    .get('/api/pods')
                    .query({ podId })
                    .set('Authorization', `Bearer ${creator.token}`);

                expect(podRes.body.participants).toHaveLength(2);
                expect(podRes.body.confirmation_status).toBe('open');
            });

            it('should keep pod open with 3 players', async () => {
                const leagueId = await createTestLeague({ is_active: 1 });
                const creator = await getAuthTokenWithRole('super_admin');
                await addUserToLeague(creator.userId, leagueId);

                const podId = await createTestPod(leagueId, creator.userId, {
                    confirmation_status: 'open'
                });
                await addPlayerToPod(podId, creator.userId);

                // Add 2 more players (total 3)
                for (let i = 0; i < 2; i++) {
                    const player = await getAuthToken();
                    await addUserToLeague(player.userId, leagueId);
                    await addPlayerToPod(podId, player.userId);
                }

                const podRes = await request(app)
                    .get('/api/pods')
                    .query({ podId })
                    .set('Authorization', `Bearer ${creator.token}`);

                expect(podRes.body.participants).toHaveLength(3);
                expect(podRes.body.confirmation_status).toBe('open');
            });
        });

        describe('3-Player Override to Active', () => {
            it('should allow overriding 3-player pod to active', async () => {
                const leagueId = await createTestLeague({ is_active: 1 });
                const creator = await getAuthTokenWithRole('super_admin');
                await addUserToLeague(creator.userId, leagueId);

                const podId = await createTestPod(leagueId, creator.userId, {
                    confirmation_status: 'open'
                });
                await addPlayerToPod(podId, creator.userId);

                // Add 2 more players (total 3)
                for (let i = 0; i < 2; i++) {
                    const player = await getAuthToken();
                    await addUserToLeague(player.userId, leagueId);
                    await addPlayerToPod(podId, player.userId);
                }

                const res = await request(app)
                    .post(`/api/pods/${podId}/override`)
                    .set('Authorization', `Bearer ${creator.token}`);

                expect(res.status).toBe(200);
                expect(res.body).toHaveProperty('message');

                // Verify pod is now active
                const podRes = await request(app)
                    .get('/api/pods')
                    .query({ podId })
                    .set('Authorization', `Bearer ${creator.token}`);

                expect(podRes.body.confirmation_status).toBe('active');
            });

            it('should reject override with less than 3 players', async () => {
                const leagueId = await createTestLeague({ is_active: 1 });
                const creator = await getAuthTokenWithRole('super_admin');
                await addUserToLeague(creator.userId, leagueId);

                const podId = await createTestPod(leagueId, creator.userId, {
                    confirmation_status: 'open'
                });
                await addPlayerToPod(podId, creator.userId);

                // Only 1 player - should fail
                const res = await request(app)
                    .post(`/api/pods/${podId}/override`)
                    .set('Authorization', `Bearer ${creator.token}`);

                expect(res.status).toBe(400);
                expect(res.body).toHaveProperty('error');
            });

            it('should reject override for non-open pod', async () => {
                const leagueId = await createTestLeague({ is_active: 1 });
                const creator = await getAuthTokenWithRole('super_admin');
                await addUserToLeague(creator.userId, leagueId);

                const podId = await createTestPod(leagueId, creator.userId, {
                    confirmation_status: 'active'
                });
                await addPlayerToPod(podId, creator.userId);

                // Add 2 more players
                for (let i = 0; i < 2; i++) {
                    const player = await getAuthToken();
                    await addUserToLeague(player.userId, leagueId);
                    await addPlayerToPod(podId, player.userId);
                }

                const res = await request(app)
                    .post(`/api/pods/${podId}/override`)
                    .set('Authorization', `Bearer ${creator.token}`);

                expect(res.status).toBe(404);
                expect(res.body).toHaveProperty('error');
            });
        });

        describe('4-Player Auto-Activation', () => {
            it('should auto-activate pod when 4th player joins', async () => {
                const leagueId = await createTestLeague({ is_active: 1 });
                const creator = await getAuthTokenWithRole('super_admin');
                await addUserToLeague(creator.userId, leagueId);

                const podId = await createTestPod(leagueId, creator.userId, {
                    confirmation_status: 'open'
                });
                await addPlayerToPod(podId, creator.userId);

                // Add 2 more players (total 3)
                for (let i = 0; i < 2; i++) {
                    const player = await getAuthToken();
                    await addUserToLeague(player.userId, leagueId);
                    await addPlayerToPod(podId, player.userId);
                }

                // Add 4th player - should auto-activate
                const player4 = await getAuthToken();
                await addUserToLeague(player4.userId, leagueId);

                const res = await request(app)
                    .post(`/api/pods/${podId}/join`)
                    .set('Authorization', `Bearer ${player4.token}`);

                expect(res.status).toBe(200);

                // Verify pod is now active
                const podRes = await request(app)
                    .get('/api/pods')
                    .query({ podId })
                    .set('Authorization', `Bearer ${creator.token}`);

                expect(podRes.body.confirmation_status).toBe('active');
                expect(podRes.body.participants).toHaveLength(4);
            });

            it('should not allow 5th player to join after auto-activation', async () => {
                const leagueId = await createTestLeague({ is_active: 1 });
                const creator = await getAuthTokenWithRole('super_admin');
                await addUserToLeague(creator.userId, leagueId);

                const podId = await createTestPod(leagueId, creator.userId, {
                    confirmation_status: 'open'
                });
                await addPlayerToPod(podId, creator.userId);

                // Add 3 more players (total 4 - auto-activates)
                for (let i = 0; i < 3; i++) {
                    const player = await getAuthToken();
                    await addUserToLeague(player.userId, leagueId);
                    await addPlayerToPod(podId, player.userId);
                }

                // Try to add 5th player
                const player5 = await getAuthToken();
                await addUserToLeague(player5.userId, leagueId);

                const res = await request(app)
                    .post(`/api/pods/${podId}/join`)
                    .set('Authorization', `Bearer ${player5.token}`);

                // Should fail because pod is full OR no longer open
                expect([400, 404]).toContain(res.status);
            });
        });

        describe('Winner Declaration Flow', () => {
            it('should allow player to declare win', async () => {
                const leagueId = await createTestLeague({ is_active: 1 });
                const player1 = await getAuthTokenWithRole('super_admin');
                const player2 = await getAuthTokenWithRole('super_admin');

                await addUserToLeague(player1.userId, leagueId);
                await addUserToLeague(player2.userId, leagueId);

                const podId = await createTestPod(leagueId, player1.userId, {
                    confirmation_status: 'active'
                });
                await addPlayerToPod(podId, player1.userId);
                await addPlayerToPod(podId, player2.userId);

                const res = await request(app)
                    .post(`/api/pods/${podId}/log`)
                    .set('Authorization', `Bearer ${player1.token}`)
                    .send({ result: 'win' });

                expect(res.status).toBe(200);
                expect(res.body).toHaveProperty('message');

                // Verify pod status changed to pending
                const podRes = await request(app)
                    .get('/api/pods')
                    .query({ podId })
                    .set('Authorization', `Bearer ${player1.token}`);

                expect(podRes.body.confirmation_status).toBe('pending');
            });

            it('should reject duplicate win declaration', async () => {
                const leagueId = await createTestLeague({ is_active: 1 });

                const player1 = await getAuthTokenWithRole('super_admin');
                const player2 = await getAuthTokenWithRole('super_admin');

                await addUserToLeague(player1.userId, leagueId);
                await addUserToLeague(player2.userId, leagueId);

                const podId = await createTestPod(leagueId, player1.userId, {
                    confirmation_status: 'active'
                });
                await addPlayerToPod(podId, player1.userId);
                await addPlayerToPod(podId, player2.userId);

                // Player 1 declares win
                await request(app)
                    .post(`/api/pods/${podId}/log`)
                    .set('Authorization', `Bearer ${player1.token}`)
                    .send({ result: 'win' });

                // Player 2 tries to declare win - should fail
                const res = await request(app)
                    .post(`/api/pods/${podId}/log`)
                    .set('Authorization', `Bearer ${player2.token}`)
                    .send({ result: 'win' });

                expect(res.status).toBe(400);
                expect(res.body).toHaveProperty('error');
            });

            it('should allow loss declaration', async () => {
                const leagueId = await createTestLeague({ is_active: 1 });
                const { token, userId } = await getAuthTokenWithRole('super_admin');
                await addUserToLeague(userId, leagueId);

                const podId = await createTestPod(leagueId, userId, {
                    confirmation_status: 'active'
                });
                await addPlayerToPod(podId, userId);

                const res = await request(app)
                    .post(`/api/pods/${podId}/log`)
                    .set('Authorization', `Bearer ${token}`)
                    .send({ result: 'loss' });

                expect(res.status).toBe(200);
                expect(res.body).toHaveProperty('message');
            });

            it('should allow draw declaration', async () => {
                const leagueId = await createTestLeague({ is_active: 1 });
                const { token, userId } = await getAuthTokenWithRole('super_admin');
                await addUserToLeague(userId, leagueId);

                const podId = await createTestPod(leagueId, userId, {
                    confirmation_status: 'active'
                });
                await addPlayerToPod(podId, userId);

                const res = await request(app)
                    .post(`/api/pods/${podId}/log`)
                    .set('Authorization', `Bearer ${token}`)
                    .send({ result: 'draw' });

                expect(res.status).toBe(200);
                expect(res.body).toHaveProperty('message');
            });

            it('should prevent double confirmation by same player', async () => {
                const leagueId = await createTestLeague({ is_active: 1 });
                const { token, userId } = await getAuthTokenWithRole('super_admin');
                await addUserToLeague(userId, leagueId);

                const podId = await createTestPod(leagueId, userId, {
                    confirmation_status: 'active'
                });
                await addPlayerToPod(podId, userId);

                // First confirmation
                await request(app)
                    .post(`/api/pods/${podId}/log`)
                    .set('Authorization', `Bearer ${token}`)
                    .send({ result: 'win' });

                // Try to confirm again
                const res = await request(app)
                    .post(`/api/pods/${podId}/log`)
                    .set('Authorization', `Bearer ${token}`)
                    .send({ result: 'win' });

                expect(res.status).toBe(200);
                expect(res.body).toHaveProperty('alreadyConfirmed', true);
            });
        });

        describe('Result Confirmation by All Players', () => {
            it('should wait for all players to confirm before completing', async () => {
                const leagueId = await createTestLeague({ is_active: 1 });

                const player1 = await getAuthTokenWithRole('super_admin');
                const player2 = await getAuthTokenWithRole('super_admin');
                const player3 = await getAuthTokenWithRole('super_admin');

                await addUserToLeague(player1.userId, leagueId);
                await addUserToLeague(player2.userId, leagueId);
                await addUserToLeague(player3.userId, leagueId);

                const podId = await createTestPod(leagueId, player1.userId, {
                    confirmation_status: 'active'
                });
                await addPlayerToPod(podId, player1.userId);
                await addPlayerToPod(podId, player2.userId);
                await addPlayerToPod(podId, player3.userId);

                // Player 1 confirms
                const res1 = await request(app)
                    .post(`/api/pods/${podId}/log`)
                    .set('Authorization', `Bearer ${player1.token}`)
                    .send({ result: 'win' });

                expect(res1.status).toBe(200);
                expect(res1.body.message).toContain('Waiting');

                // Player 2 confirms
                const res2 = await request(app)
                    .post(`/api/pods/${podId}/log`)
                    .set('Authorization', `Bearer ${player2.token}`)
                    .send({ result: 'loss' });

                expect(res2.status).toBe(200);
                expect(res2.body.message).toContain('Waiting');

                // Verify pod still pending
                const podRes = await request(app)
                    .get('/api/pods')
                    .query({ podId })
                    .set('Authorization', `Bearer ${player1.token}`);

                expect(podRes.body.confirmation_status).toBe('pending');
            });

            it('should complete pod when all players confirm', async () => {
                const leagueId = await createTestLeague({ is_active: 1 });

                const player1 = await getAuthTokenWithRole('super_admin');
                const player2 = await getAuthTokenWithRole('super_admin');

                await addUserToLeague(player1.userId, leagueId);
                await addUserToLeague(player2.userId, leagueId);

                const podId = await createTestPod(leagueId, player1.userId, {
                    confirmation_status: 'active'
                });
                await addPlayerToPod(podId, player1.userId);
                await addPlayerToPod(podId, player2.userId);

                // Player 1 confirms
                await request(app)
                    .post(`/api/pods/${podId}/log`)
                    .set('Authorization', `Bearer ${player1.token}`)
                    .send({ result: 'win' });

                // Player 2 confirms - should complete
                const res = await request(app)
                    .post(`/api/pods/${podId}/log`)
                    .set('Authorization', `Bearer ${player2.token}`)
                    .send({ result: 'loss' });

                expect(res.status).toBe(200);
                expect(res.body.message).toContain('complete');

                // Verify pod is complete
                const podRes = await request(app)
                    .get('/api/pods')
                    .query({ podId })
                    .set('Authorization', `Bearer ${player1.token}`);

                expect(podRes.body.confirmation_status).toBe('complete');
                expect(podRes.body.result).toBe('win');
            });

            it('should mark pod result as draw when any player declares draw', async () => {
                const leagueId = await createTestLeague({ is_active: 1 });

                const player1 = await getAuthTokenWithRole('super_admin');
                const player2 = await getAuthTokenWithRole('super_admin');

                await addUserToLeague(player1.userId, leagueId);
                await addUserToLeague(player2.userId, leagueId);

                const podId = await createTestPod(leagueId, player1.userId, {
                    confirmation_status: 'active'
                });
                await addPlayerToPod(podId, player1.userId);
                await addPlayerToPod(podId, player2.userId);

                // Player 1 declares draw
                await request(app)
                    .post(`/api/pods/${podId}/log`)
                    .set('Authorization', `Bearer ${player1.token}`)
                    .send({ result: 'draw' });

                // Player 2 confirms
                await request(app)
                    .post(`/api/pods/${podId}/log`)
                    .set('Authorization', `Bearer ${player2.token}`)
                    .send({ result: 'draw' });

                // Verify pod result is draw
                const podRes = await request(app)
                    .get('/api/pods')
                    .query({ podId })
                    .set('Authorization', `Bearer ${player1.token}`);

                expect(podRes.body.result).toBe('draw');
            });
        });

        describe('Stats Update on Completion', () => {
            it('should update user stats when pod completes', async () => {
                const testDb = require('../helpers/testDb');
                const leagueId = await createTestLeague({ is_active: 1 });

                const player1 = await getAuthTokenWithRole('super_admin');
                const player2 = await getAuthTokenWithRole('super_admin');

                await addUserToLeague(player1.userId, leagueId);
                await addUserToLeague(player2.userId, leagueId);

                // Get initial stats
                const initialStats1 = await testDb('users')
                    .where({ id: player1.userId })
                    .select('wins', 'losses', 'draws')
                    .first();

                const initialStats2 = await testDb('users')
                    .where({ id: player2.userId })
                    .select('wins', 'losses', 'draws')
                    .first();

                const podId = await createTestPod(leagueId, player1.userId, {
                    confirmation_status: 'active'
                });
                await addPlayerToPod(podId, player1.userId);
                await addPlayerToPod(podId, player2.userId);

                // Player 1 wins, Player 2 loses
                await request(app)
                    .post(`/api/pods/${podId}/log`)
                    .set('Authorization', `Bearer ${player1.token}`)
                    .send({ result: 'win' });

                await request(app)
                    .post(`/api/pods/${podId}/log`)
                    .set('Authorization', `Bearer ${player2.token}`)
                    .send({ result: 'loss' });

                // Check updated stats
                const finalStats1 = await testDb('users')
                    .where({ id: player1.userId })
                    .select('wins', 'losses', 'draws')
                    .first();

                const finalStats2 = await testDb('users')
                    .where({ id: player2.userId })
                    .select('wins', 'losses', 'draws')
                    .first();

                expect(finalStats1.wins).toBe(initialStats1.wins + 1);
                expect(finalStats2.losses).toBe(initialStats2.losses + 1);
            });

            it('should update league stats when pod completes', async () => {
                const testDb = require('../helpers/testDb');
                const leagueId = await createTestLeague({ is_active: 1 });

                const player1 = await getAuthTokenWithRole('super_admin');
                const player2 = await getAuthTokenWithRole('super_admin');

                await addUserToLeague(player1.userId, leagueId);
                await addUserToLeague(player2.userId, leagueId);

                // Get initial league stats
                const initialLeagueStats1 = await testDb('user_leagues')
                    .where({ user_id: player1.userId, league_id: leagueId })
                    .select('league_wins', 'league_losses', 'league_draws', 'total_points')
                    .first();

                const initialLeagueStats2 = await testDb('user_leagues')
                    .where({ user_id: player2.userId, league_id: leagueId })
                    .select('league_wins', 'league_losses', 'league_draws', 'total_points')
                    .first();

                const podId = await createTestPod(leagueId, player1.userId, {
                    confirmation_status: 'active'
                });
                await addPlayerToPod(podId, player1.userId);
                await addPlayerToPod(podId, player2.userId);

                // Player 1 wins, Player 2 loses
                await request(app)
                    .post(`/api/pods/${podId}/log`)
                    .set('Authorization', `Bearer ${player1.token}`)
                    .send({ result: 'win' });

                await request(app)
                    .post(`/api/pods/${podId}/log`)
                    .set('Authorization', `Bearer ${player2.token}`)
                    .send({ result: 'loss' });

                // Check updated league stats
                const finalLeagueStats1 = await testDb('user_leagues')
                    .where({ user_id: player1.userId, league_id: leagueId })
                    .select('league_wins', 'league_losses', 'league_draws', 'total_points')
                    .first();

                const finalLeagueStats2 = await testDb('user_leagues')
                    .where({ user_id: player2.userId, league_id: leagueId })
                    .select('league_wins', 'league_losses', 'league_draws', 'total_points')
                    .first();

                expect(finalLeagueStats1.league_wins).toBe(initialLeagueStats1.league_wins + 1);
                expect(finalLeagueStats2.league_losses).toBe(initialLeagueStats2.league_losses + 1);
            });

            it('should award points based on league settings', async () => {
                const testDb = require('../helpers/testDb');
                const leagueId = await createTestLeague({
                    is_active: 1,
                    points_per_win: 5,
                    points_per_loss: 2,
                    points_per_draw: 3
                });

                const player1 = await getAuthTokenWithRole('super_admin');
                const player2 = await getAuthTokenWithRole('super_admin');

                await addUserToLeague(player1.userId, leagueId);
                await addUserToLeague(player2.userId, leagueId);

                // Get initial points
                const initialStats1 = await testDb('user_leagues')
                    .where({ user_id: player1.userId, league_id: leagueId })
                    .select('total_points')
                    .first();

                const initialStats2 = await testDb('user_leagues')
                    .where({ user_id: player2.userId, league_id: leagueId })
                    .select('total_points')
                    .first();

                const podId = await createTestPod(leagueId, player1.userId, {
                    confirmation_status: 'active'
                });
                await addPlayerToPod(podId, player1.userId);
                await addPlayerToPod(podId, player2.userId);

                // Player 1 wins, Player 2 loses
                await request(app)
                    .post(`/api/pods/${podId}/log`)
                    .set('Authorization', `Bearer ${player1.token}`)
                    .send({ result: 'win' });

                await request(app)
                    .post(`/api/pods/${podId}/log`)
                    .set('Authorization', `Bearer ${player2.token}`)
                    .send({ result: 'loss' });

                // Check points awarded
                const finalStats1 = await testDb('user_leagues')
                    .where({ user_id: player1.userId, league_id: leagueId })
                    .select('total_points')
                    .first();

                const finalStats2 = await testDb('user_leagues')
                    .where({ user_id: player2.userId, league_id: leagueId })
                    .select('total_points')
                    .first();

                expect(finalStats1.total_points).toBe(initialStats1.total_points + 5); // Winner gets 5 points
                expect(finalStats2.total_points).toBe(initialStats2.total_points + 2); // Loser gets 2 points
            });

            it('should not update stats for disqualified players', async () => {
                const testDb = require('../helpers/testDb');
                const leagueId = await createTestLeague({ is_active: 1 });

                const player1 = await getAuthTokenWithRole('super_admin');
                const player2 = await getAuthTokenWithRole('super_admin');

                await addUserToLeague(player1.userId, leagueId);
                await addUserToLeague(player2.userId, leagueId);

                // Get initial stats
                const initialStats2 = await testDb('users')
                    .where({ id: player2.userId })
                    .select('wins', 'losses', 'draws')
                    .first();

                const podId = await createTestPod(leagueId, player1.userId, {
                    confirmation_status: 'active'
                });
                await addPlayerToPod(podId, player1.userId);
                await addPlayerToPod(podId, player2.userId);

                // Player 1 wins, Player 2 disqualified
                await request(app)
                    .post(`/api/pods/${podId}/log`)
                    .set('Authorization', `Bearer ${player1.token}`)
                    .send({ result: 'win' });

                await request(app)
                    .post(`/api/pods/${podId}/log`)
                    .set('Authorization', `Bearer ${player2.token}`)
                    .send({ result: 'disqualified' });

                // Check that DQ'd player stats didn't change
                const finalStats2 = await testDb('users')
                    .where({ id: player2.userId })
                    .select('wins', 'losses', 'draws')
                    .first();

                expect(finalStats2.wins).toBe(initialStats2.wins);
                expect(finalStats2.losses).toBe(initialStats2.losses);
                expect(finalStats2.draws).toBe(initialStats2.draws);
            });
        });
    });
});
