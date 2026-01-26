const request = require('supertest');
const { getAuthToken, getAuthTokenWithRole } = require('../helpers/authHelper');
const { createTestLeague, addUserToLeague } = require('../helpers/leaguesHelper');
const { createTestPod, addPlayerToPod } = require('../helpers/podHelper');
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

// Seed required permissions before tests
async function seedPodAdminPermissions() {
    try {
        // Check if permissions already exist
        const existingPerm = await db('permissions').where({ name: 'admin_pod_update' }).first();
        if (existingPerm) {
            return; // Already seeded
        }

        // Add the permissions using INSERT IGNORE to handle duplicates
        await db.raw(`
            INSERT IGNORE INTO permissions (id, name, description) VALUES
            (52, 'admin_pod_update', 'Allow admins to update pods'),
            (53, 'admin_pod_delete', 'Allow admins to delete pods')
        `);

        // Get the pod_admin role
        const podAdminRole = await db('roles').where({ name: 'pod_admin' }).first();
        if (podAdminRole) {
            // Assign permissions to pod_admin role using INSERT IGNORE
            await db.raw(`
                INSERT IGNORE INTO role_permissions (role_id, permission_id) VALUES
                (?, 52),
                (?, 53)
            `, [podAdminRole.id, podAdminRole.id]);
        }
    } catch (err) {
        // Ignore duplicate key errors
        if (!err.message.includes('Duplicate entry')) {
            console.error('Error seeding permissions:', err.message);
        }
    }
}

describe('Pods Admin Routes', () => {
    beforeAll(async () => {
        await seedPodAdminPermissions();
    });

    describe('PUT /api/admin/pods/:podId (Update Pod)', () => {
        it('should update pod confirmation status for admin', async () => {
            const leagueId = await createTestLeague({ is_active: 1 });
            const { token: adminToken, userId: adminId } = await getAuthTokenWithRole('pod_admin');
            await addUserToLeague(adminId, leagueId);

            const player = await getAuthToken();
            await addUserToLeague(player.userId, leagueId);

            const podId = await createTestPod(leagueId, player.userId, {
                confirmation_status: 'active'
            });
            await addPlayerToPod(podId, player.userId, { result: 'win', confirmed: 1 });

            const res = await request(app)
                .put(`/api/admin/pods/${podId}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    confirmation_status: 'complete'
                });

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('confirmation_status', 'complete');
        });

        it('should update pod participants for admin', async () => {
            const leagueId = await createTestLeague({ is_active: 1 });
            const { token: adminToken, userId: adminId } = await getAuthTokenWithRole('pod_admin');
            await addUserToLeague(adminId, leagueId);

            const player1 = await getAuthToken();
            const player2 = await getAuthToken();
            await addUserToLeague(player1.userId, leagueId);
            await addUserToLeague(player2.userId, leagueId);

            const podId = await createTestPod(leagueId, player1.userId, {
                confirmation_status: 'active'
            });
            await addPlayerToPod(podId, player1.userId);
            await addPlayerToPod(podId, player2.userId);

            const res = await request(app)
                .put(`/api/admin/pods/${podId}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    participants: [
                        { player_id: player1.userId, result: 'win', confirmed: 1, turn_order: 1 },
                        { player_id: player2.userId, result: 'loss', confirmed: 1, turn_order: 2 }
                    ],
                    confirmation_status: 'complete'
                });

            expect(res.status).toBe(200);
            expect(res.body.participants).toHaveLength(2);
        });

        it('should reject update from non-admin user', async () => {
            const leagueId = await createTestLeague({ is_active: 1 });
            const { token, userId } = await getAuthToken();
            await addUserToLeague(userId, leagueId);

            const podId = await createTestPod(leagueId, userId, {
                confirmation_status: 'active'
            });

            const res = await request(app)
                .put(`/api/admin/pods/${podId}`)
                .set('Authorization', `Bearer ${token}`)
                .send({
                    confirmation_status: 'complete'
                });

            expect(res.status).toBe(403);
        });
    });

    describe('DELETE /api/admin/pods/:podId (Delete Pod)', () => {
        it('should delete pod for admin', async () => {
            const leagueId = await createTestLeague({ is_active: 1 });
            const { token: adminToken, userId: adminId } = await getAuthTokenWithRole('pod_admin');
            await addUserToLeague(adminId, leagueId);

            const player = await getAuthToken();
            await addUserToLeague(player.userId, leagueId);

            const podId = await createTestPod(leagueId, player.userId, {
                confirmation_status: 'active'
            });
            await addPlayerToPod(podId, player.userId);

            const res = await request(app)
                .delete(`/api/admin/pods/${podId}`)
                .set('Authorization', `Bearer ${adminToken}`);

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('message', 'Pod deleted successfully.');

            // Verify pod is soft-deleted
            const deletedPod = await db('game_pods').where({ id: podId }).first();
            expect(deletedPod.deleted_at).not.toBeNull();
        });

        it('should reject delete from non-admin user', async () => {
            const leagueId = await createTestLeague({ is_active: 1 });
            const { token, userId } = await getAuthToken();
            await addUserToLeague(userId, leagueId);

            const podId = await createTestPod(leagueId, userId, {
                confirmation_status: 'active'
            });

            const res = await request(app)
                .delete(`/api/admin/pods/${podId}`)
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(403);
        });
    });

    describe('DELETE /api/admin/pods/:podId/participants/:playerId (Remove Participant)', () => {
        it('should remove participant from pod', async () => {
            const leagueId = await createTestLeague({ is_active: 1 });
            const { token: adminToken, userId: adminId } = await getAuthTokenWithRole('pod_admin');
            await addUserToLeague(adminId, leagueId);

            const player1 = await getAuthToken();
            const player2 = await getAuthToken();
            await addUserToLeague(player1.userId, leagueId);
            await addUserToLeague(player2.userId, leagueId);

            const podId = await createTestPod(leagueId, player1.userId, {
                confirmation_status: 'active'
            });
            await addPlayerToPod(podId, player1.userId);
            await addPlayerToPod(podId, player2.userId);

            const res = await request(app)
                .delete(`/api/admin/pods/${podId}/participants/${player2.userId}`)
                .set('Authorization', `Bearer ${adminToken}`);

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('message', 'Participant removed successfully.');
        });

        it('should return 404 for non-existent participant', async () => {
            const leagueId = await createTestLeague({ is_active: 1 });
            const { token: adminToken, userId: adminId } = await getAuthTokenWithRole('pod_admin');
            await addUserToLeague(adminId, leagueId);

            const player = await getAuthToken();
            await addUserToLeague(player.userId, leagueId);

            const podId = await createTestPod(leagueId, player.userId, {
                confirmation_status: 'active'
            });
            await addPlayerToPod(podId, player.userId);

            const res = await request(app)
                .delete(`/api/admin/pods/${podId}/participants/99999`)
                .set('Authorization', `Bearer ${adminToken}`);

            expect(res.status).toBe(404);
        });
    });

    describe('POST /api/admin/pods/:podId/participants (Add Participant)', () => {
        it('should add participant to pod', async () => {
            const leagueId = await createTestLeague({ is_active: 1 });
            const { token: adminToken, userId: adminId } = await getAuthTokenWithRole('pod_admin');
            await addUserToLeague(adminId, leagueId);

            const player1 = await getAuthToken();
            const player2 = await getAuthToken();
            await addUserToLeague(player1.userId, leagueId);
            await addUserToLeague(player2.userId, leagueId);

            const podId = await createTestPod(leagueId, player1.userId, {
                confirmation_status: 'active'
            });
            await addPlayerToPod(podId, player1.userId);

            const res = await request(app)
                .post(`/api/admin/pods/${podId}/participants`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ playerId: player2.userId });

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('message', 'Participant added successfully.');
            expect(res.body).toHaveProperty('participantCount', 2);
        });

        it('should return 404 for non-existent pod', async () => {
            const { token } = await getAuthTokenWithRole('pod_admin');
            const player = await getAuthToken();

            const res = await request(app)
                .post('/api/admin/pods/99999/participants')
                .set('Authorization', `Bearer ${token}`)
                .send({ playerId: player.userId });

            expect(res.status).toBe(404);
        });

        it('should reject adding to completed pod', async () => {
            const leagueId = await createTestLeague({ is_active: 1 });
            const { token: adminToken, userId: adminId } = await getAuthTokenWithRole('pod_admin');
            await addUserToLeague(adminId, leagueId);

            const player1 = await getAuthToken();
            const player2 = await getAuthToken();
            await addUserToLeague(player1.userId, leagueId);
            await addUserToLeague(player2.userId, leagueId);

            const podId = await createTestPod(leagueId, player1.userId, {
                confirmation_status: 'complete'
            });
            await addPlayerToPod(podId, player1.userId);

            const res = await request(app)
                .post(`/api/admin/pods/${podId}/participants`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ playerId: player2.userId });

            expect(res.status).toBe(400);
            expect(res.body).toHaveProperty('error', 'Cannot add participants to a completed pod.');
        });
    });

    describe('PUT /api/admin/pods/:podId/participants/:playerId (Update Participant Result)', () => {
        it('should update participant result', async () => {
            const leagueId = await createTestLeague({ is_active: 1 });
            const { token: adminToken, userId: adminId } = await getAuthTokenWithRole('pod_admin');
            await addUserToLeague(adminId, leagueId);

            const player = await getAuthToken();
            await addUserToLeague(player.userId, leagueId);

            const podId = await createTestPod(leagueId, player.userId, {
                confirmation_status: 'active'
            });
            await addPlayerToPod(podId, player.userId);

            const res = await request(app)
                .put(`/api/admin/pods/${podId}/participants/${player.userId}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ result: 'win' });

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('message', 'Participant result updated successfully.');
        });

        it('should reject from non-admin user', async () => {
            const leagueId = await createTestLeague({ is_active: 1 });
            const { token, userId } = await getAuthToken();
            await addUserToLeague(userId, leagueId);

            const podId = await createTestPod(leagueId, userId, {
                confirmation_status: 'active'
            });
            await addPlayerToPod(podId, userId);

            const res = await request(app)
                .put(`/api/admin/pods/${podId}/participants/${userId}`)
                .set('Authorization', `Bearer ${token}`)
                .send({ result: 'win' });

            expect(res.status).toBe(403);
        });
    });

    describe('PATCH /api/admin/pods/:podId/participants/:playerId/dq (Toggle DQ)', () => {
        it('should toggle DQ status to disqualified', async () => {
            const leagueId = await createTestLeague({ is_active: 1 });
            const { token: adminToken, userId: adminId } = await getAuthTokenWithRole('pod_admin');
            await addUserToLeague(adminId, leagueId);

            const player = await getAuthToken();
            await addUserToLeague(player.userId, leagueId);

            const podId = await createTestPod(leagueId, player.userId, {
                confirmation_status: 'active'
            });
            await addPlayerToPod(podId, player.userId, { result: 'loss' });

            const res = await request(app)
                .patch(`/api/admin/pods/${podId}/participants/${player.userId}/dq`)
                .set('Authorization', `Bearer ${adminToken}`);

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('result', 'disqualified');
        });

        it('should return 404 for non-existent pod', async () => {
            const { token } = await getAuthTokenWithRole('pod_admin');
            const player = await getAuthToken();

            const res = await request(app)
                .patch(`/api/admin/pods/99999/participants/${player.userId}/dq`)
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(404);
        });

        it('should reject from non-admin user', async () => {
            const leagueId = await createTestLeague({ is_active: 1 });
            const { token, userId } = await getAuthToken();
            await addUserToLeague(userId, leagueId);

            const podId = await createTestPod(leagueId, userId, {
                confirmation_status: 'active'
            });
            await addPlayerToPod(podId, userId, { result: 'loss' });

            const res = await request(app)
                .patch(`/api/admin/pods/${podId}/participants/${userId}/dq`)
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(403);
        });
    });
});
