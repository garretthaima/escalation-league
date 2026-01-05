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

            expect(res.status).toBe(400);
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
});
