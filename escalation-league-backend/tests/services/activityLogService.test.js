const { db, clearDatabase, createTestUser } = require('../helpers/dbHelper');
const { createTestLeague } = require('../helpers/leaguesHelper');

jest.mock('../../models/db', () => require('../helpers/testDb'));

// Import the service after mocking
const activityLogService = require('../../services/activityLogService');

// Helper function to safely parse metadata
// MySQL JSON columns may be auto-parsed by the driver
const parseMetadata = (metadata) => {
    if (metadata === null || metadata === undefined) return null;
    return typeof metadata === 'string' ? JSON.parse(metadata) : metadata;
};

describe('activityLogService', () => {
    let userId, adminId, targetUserId;
    let leagueId, podId;

    beforeEach(async () => {
        // Create test users
        userId = await createTestUser({ firstname: 'Regular', lastname: 'User' });
        adminId = await createTestUser({ firstname: 'Admin', lastname: 'User', role_id: 1 });
        targetUserId = await createTestUser({ firstname: 'Target', lastname: 'User' });

        // Create test league using helper
        leagueId = await createTestLeague({
            name: 'Test League',
            is_active: 1
        });

        // Create test pod
        [podId] = await db('game_pods').insert({
            league_id: leagueId,
            creator_id: userId,
            confirmation_status: 'active'
        });
    });

    describe('logActivity', () => {
        it('should log activity without metadata', async () => {
            await activityLogService.logActivity(userId, 'Test action');

            const log = await db('activity_logs')
                .where({ user_id: userId, action: 'Test action' })
                .first();

            expect(log).toBeDefined();
            expect(log.user_id).toBe(userId);
            expect(log.action).toBe('Test action');
            expect(log.metadata).toBeNull();
        });

        it('should log activity with metadata', async () => {
            const metadata = { key: 'value', count: 5 };
            await activityLogService.logActivity(userId, 'Test action with meta', metadata);

            const log = await db('activity_logs')
                .where({ user_id: userId, action: 'Test action with meta' })
                .first();

            expect(log).toBeDefined();
            const parsedMetadata = parseMetadata(log.metadata);
            expect(parsedMetadata.key).toBe('value');
            expect(parsedMetadata.count).toBe(5);
        });

        it('should not throw on database error', async () => {
            // Use a console spy to verify error is logged
            const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

            // This should not throw even if there's an issue
            await expect(
                activityLogService.logActivity(null, 'Test')
            ).resolves.not.toThrow();

            consoleSpy.mockRestore();
        });
    });

    describe('Authentication Actions', () => {
        describe('logLogin', () => {
            it('should log user login', async () => {
                await activityLogService.logLogin(userId, '192.168.1.1');

                const log = await db('activity_logs')
                    .where({ user_id: userId })
                    .orderBy('id', 'desc')
                    .first();

                expect(log.action).toBe('User logged in');
                const metadata = parseMetadata(log.metadata);
                expect(metadata.ip).toBe('192.168.1.1');
            });

            it('should log login without IP', async () => {
                await activityLogService.logLogin(userId);

                const log = await db('activity_logs')
                    .where({ user_id: userId })
                    .first();

                expect(log.action).toBe('User logged in');
                const metadata = parseMetadata(log.metadata);
                expect(metadata.ip).toBeNull();
            });
        });

        describe('logLogout', () => {
            it('should log user logout', async () => {
                await activityLogService.logLogout(userId);

                const log = await db('activity_logs')
                    .where({ user_id: userId })
                    .first();

                expect(log.action).toBe('User logged out');
            });
        });

        describe('logPasswordChange', () => {
            it('should log password change', async () => {
                await activityLogService.logPasswordChange(userId);

                const log = await db('activity_logs')
                    .where({ user_id: userId })
                    .first();

                expect(log.action).toBe('Password changed');
            });
        });

        describe('logPasswordReset', () => {
            it('should log self password reset', async () => {
                await activityLogService.logPasswordReset(userId);

                const log = await db('activity_logs')
                    .where({ user_id: userId })
                    .first();

                expect(log.action).toBe('Password reset');
            });

            it('should log admin password reset', async () => {
                await activityLogService.logPasswordReset(targetUserId, adminId);

                const log = await db('activity_logs')
                    .where({ user_id: adminId })
                    .first();

                expect(log.action).toBe('Admin reset user password');
                const metadata = parseMetadata(log.metadata);
                expect(metadata.targetUserId).toBe(targetUserId);
            });
        });
    });

    describe('Profile Actions', () => {
        describe('logProfileUpdate', () => {
            it('should log profile update with field names', async () => {
                await activityLogService.logProfileUpdate(userId, {
                    firstname: 'NewFirst',
                    lastname: 'NewLast'
                });

                const log = await db('activity_logs')
                    .where({ user_id: userId })
                    .first();

                expect(log.action).toBe('Profile updated');
                const metadata = parseMetadata(log.metadata);
                expect(metadata.fields).toContain('firstname');
                expect(metadata.fields).toContain('lastname');
            });
        });

        describe('logAccountDeletion', () => {
            it('should log account deletion', async () => {
                await activityLogService.logAccountDeletion(userId);

                const log = await db('activity_logs')
                    .where({ user_id: userId })
                    .first();

                expect(log.action).toBe('Account deleted');
            });
        });
    });

    describe('League Actions', () => {
        describe('logLeagueSignup', () => {
            it('should log league signup request', async () => {
                await activityLogService.logLeagueSignup(userId, leagueId, 'Test League');

                const log = await db('activity_logs')
                    .where({ user_id: userId })
                    .first();

                expect(log.action).toBe('League signup requested');
                const metadata = parseMetadata(log.metadata);
                expect(metadata.leagueId).toBe(leagueId);
                expect(metadata.leagueName).toBe('Test League');
            });
        });

        describe('logLeagueSignupApproved', () => {
            it('should log league signup approval', async () => {
                await activityLogService.logLeagueSignupApproved(adminId, targetUserId, leagueId, 'Test League');

                const log = await db('activity_logs')
                    .where({ user_id: adminId })
                    .first();

                expect(log.action).toBe('Approved league signup');
                const metadata = parseMetadata(log.metadata);
                expect(metadata.targetUserId).toBe(targetUserId);
                expect(metadata.leagueId).toBe(leagueId);
                expect(metadata.leagueName).toBe('Test League');
            });
        });

        describe('logLeagueSignupRejected', () => {
            it('should log league signup rejection', async () => {
                await activityLogService.logLeagueSignupRejected(adminId, targetUserId, leagueId, 'Test League');

                const log = await db('activity_logs')
                    .where({ user_id: adminId })
                    .first();

                expect(log.action).toBe('Rejected league signup');
                const metadata = parseMetadata(log.metadata);
                expect(metadata.targetUserId).toBe(targetUserId);
            });
        });

        describe('logLeagueLeft', () => {
            it('should log user leaving league', async () => {
                await activityLogService.logLeagueLeft(userId, leagueId);

                const log = await db('activity_logs')
                    .where({ user_id: userId })
                    .first();

                expect(log.action).toBe('Left league');
                const metadata = parseMetadata(log.metadata);
                expect(metadata.leagueId).toBe(leagueId);
            });
        });
    });

    describe('Game/Pod Actions', () => {
        describe('logPodCreated', () => {
            it('should log pod creation', async () => {
                await activityLogService.logPodCreated(userId, podId, leagueId);

                const log = await db('activity_logs')
                    .where({ user_id: userId })
                    .first();

                expect(log.action).toBe('Game created');
                const metadata = parseMetadata(log.metadata);
                expect(metadata.podId).toBe(podId);
                expect(metadata.leagueId).toBe(leagueId);
            });
        });

        describe('logPodJoined', () => {
            it('should log joining a pod', async () => {
                await activityLogService.logPodJoined(userId, podId);

                const log = await db('activity_logs')
                    .where({ user_id: userId })
                    .first();

                expect(log.action).toBe('Joined game');
                const metadata = parseMetadata(log.metadata);
                expect(metadata.podId).toBe(podId);
            });
        });

        describe('logGameResultDeclared', () => {
            it('should log game result declaration', async () => {
                const winnerId = userId;
                await activityLogService.logGameResultDeclared(userId, podId, winnerId);

                const log = await db('activity_logs')
                    .where({ user_id: userId })
                    .first();

                expect(log.action).toBe('Declared game result');
                const metadata = parseMetadata(log.metadata);
                expect(metadata.podId).toBe(podId);
                expect(metadata.winnerId).toBe(winnerId);
            });
        });

        describe('logGameResultConfirmed', () => {
            it('should log game result confirmation', async () => {
                await activityLogService.logGameResultConfirmed(userId, podId);

                const log = await db('activity_logs')
                    .where({ user_id: userId })
                    .first();

                expect(log.action).toBe('Confirmed game result');
                const metadata = parseMetadata(log.metadata);
                expect(metadata.podId).toBe(podId);
            });
        });

        describe('logGameCompleted', () => {
            it('should log game completion', async () => {
                await activityLogService.logGameCompleted(userId, podId);

                const log = await db('activity_logs')
                    .where({ user_id: userId })
                    .first();

                expect(log.action).toBe('Game completed');
                const metadata = parseMetadata(log.metadata);
                expect(metadata.podId).toBe(podId);
            });
        });
    });

    describe('Admin Actions', () => {
        describe('logUserRoleChange', () => {
            it('should log user role change', async () => {
                await activityLogService.logUserRoleChange(adminId, targetUserId, 'player', 'league_admin');

                const log = await db('activity_logs')
                    .where({ user_id: adminId })
                    .first();

                expect(log.action).toBe('Changed user role');
                const metadata = parseMetadata(log.metadata);
                expect(metadata.targetUserId).toBe(targetUserId);
                expect(metadata.oldRole).toBe('player');
                expect(metadata.newRole).toBe('league_admin');
            });
        });

        describe('logUserBanned', () => {
            it('should log user ban', async () => {
                await activityLogService.logUserBanned(adminId, targetUserId);

                const log = await db('activity_logs')
                    .where({ user_id: adminId })
                    .first();

                expect(log.action).toBe('Banned user');
                const metadata = parseMetadata(log.metadata);
                expect(metadata.targetUserId).toBe(targetUserId);
            });
        });

        describe('logUserUnbanned', () => {
            it('should log user unban', async () => {
                await activityLogService.logUserUnbanned(adminId, targetUserId);

                const log = await db('activity_logs')
                    .where({ user_id: adminId })
                    .first();

                expect(log.action).toBe('Unbanned user');
                const metadata = parseMetadata(log.metadata);
                expect(metadata.targetUserId).toBe(targetUserId);
            });
        });

        describe('logUserActivated', () => {
            it('should log user activation', async () => {
                await activityLogService.logUserActivated(adminId, targetUserId);

                const log = await db('activity_logs')
                    .where({ user_id: adminId })
                    .first();

                expect(log.action).toBe('Activated user');
                const metadata = parseMetadata(log.metadata);
                expect(metadata.targetUserId).toBe(targetUserId);
            });
        });

        describe('logUserDeactivated', () => {
            it('should log user deactivation', async () => {
                await activityLogService.logUserDeactivated(adminId, targetUserId);

                const log = await db('activity_logs')
                    .where({ user_id: adminId })
                    .first();

                expect(log.action).toBe('Deactivated user');
                const metadata = parseMetadata(log.metadata);
                expect(metadata.targetUserId).toBe(targetUserId);
            });
        });

        describe('logPodUpdated', () => {
            it('should log pod update', async () => {
                const changes = { confirmation_status: 'complete', result: 'win' };
                await activityLogService.logPodUpdated(adminId, podId, changes);

                const log = await db('activity_logs')
                    .where({ user_id: adminId })
                    .first();

                expect(log.action).toBe('Updated pod');
                const metadata = parseMetadata(log.metadata);
                expect(metadata.podId).toBe(podId);
                expect(metadata.changes).toEqual(changes);
            });
        });

        describe('logPodDeleted', () => {
            it('should log pod deletion', async () => {
                await activityLogService.logPodDeleted(adminId, podId);

                const log = await db('activity_logs')
                    .where({ user_id: adminId })
                    .first();

                expect(log.action).toBe('Deleted pod');
                const metadata = parseMetadata(log.metadata);
                expect(metadata.podId).toBe(podId);
            });
        });

        describe('logPodOverridden', () => {
            it('should log pod override', async () => {
                await activityLogService.logPodOverridden(adminId, podId);

                const log = await db('activity_logs')
                    .where({ user_id: adminId })
                    .first();

                expect(log.action).toBe('Overrode pod to active');
                const metadata = parseMetadata(log.metadata);
                expect(metadata.podId).toBe(podId);
            });
        });

        describe('logParticipantRemoved', () => {
            it('should log participant removal', async () => {
                await activityLogService.logParticipantRemoved(adminId, podId, targetUserId, false);

                const log = await db('activity_logs')
                    .where({ user_id: adminId })
                    .first();

                expect(log.action).toBe('Removed participant from pod');
                const metadata = parseMetadata(log.metadata);
                expect(metadata.podId).toBe(podId);
                expect(metadata.playerId).toBe(targetUserId);
                expect(metadata.wasWinner).toBe(false);
            });

            it('should log winner removal', async () => {
                await activityLogService.logParticipantRemoved(adminId, podId, targetUserId, true);

                const log = await db('activity_logs')
                    .where({ user_id: adminId })
                    .first();

                const metadata = parseMetadata(log.metadata);
                expect(metadata.wasWinner).toBe(true);
            });
        });

        describe('logParticipantAdded', () => {
            it('should log participant addition', async () => {
                await activityLogService.logParticipantAdded(adminId, podId, targetUserId);

                const log = await db('activity_logs')
                    .where({ user_id: adminId })
                    .first();

                expect(log.action).toBe('Added participant to pod');
                const metadata = parseMetadata(log.metadata);
                expect(metadata.podId).toBe(podId);
                expect(metadata.playerId).toBe(targetUserId);
            });
        });

        describe('logParticipantResultUpdated', () => {
            it('should log participant result update', async () => {
                await activityLogService.logParticipantResultUpdated(adminId, podId, targetUserId, 'win');

                const log = await db('activity_logs')
                    .where({ user_id: adminId })
                    .first();

                expect(log.action).toBe('Updated participant result');
                const metadata = parseMetadata(log.metadata);
                expect(metadata.podId).toBe(podId);
                expect(metadata.playerId).toBe(targetUserId);
                expect(metadata.result).toBe('win');
            });
        });

        describe('logPlayerDQToggled', () => {
            it('should log player disqualification', async () => {
                await activityLogService.logPlayerDQToggled(adminId, podId, targetUserId, true);

                const log = await db('activity_logs')
                    .where({ user_id: adminId })
                    .first();

                expect(log.action).toBe('Disqualified player');
                const metadata = parseMetadata(log.metadata);
                expect(metadata.podId).toBe(podId);
                expect(metadata.playerId).toBe(targetUserId);
            });

            it('should log player reinstatement', async () => {
                await activityLogService.logPlayerDQToggled(adminId, podId, targetUserId, false);

                const log = await db('activity_logs')
                    .where({ user_id: adminId })
                    .first();

                expect(log.action).toBe('Reinstated player');
            });
        });
    });
});
