const { db, clearDatabase, createTestUser } = require('../helpers/dbHelper');
const { createTestLeague, addUserToLeague } = require('../helpers/leaguesHelper');

jest.mock('../../models/db', () => require('../helpers/testDb'));

// Import the service after mocking
const leagueService = require('../../services/leagueService');

describe('leagueService', () => {
    let userId1, userId2, userId3;
    let leagueId;

    beforeEach(async () => {
        await clearDatabase();

        // Create test users
        userId1 = await createTestUser({ firstname: 'Player', lastname: 'One' });
        userId2 = await createTestUser({ firstname: 'Player', lastname: 'Two' });
        userId3 = await createTestUser({ firstname: 'Player', lastname: 'Three' });

        // Create a test league
        leagueId = await createTestLeague({
            name: 'Test League',
            is_active: true,
            points_per_win: 3,
            points_per_loss: 1,
            points_per_draw: 2
        });
    });

    afterAll(async () => {
        await db.destroy();
    });

    describe('getById', () => {
        it('should return a league by ID', async () => {
            const league = await leagueService.getById(leagueId);

            expect(league).toBeDefined();
            expect(league.id).toBe(leagueId);
            expect(league.name).toBe('Test League');
            expect(league.is_active).toBe(1);
        });

        it('should return undefined for non-existent league ID', async () => {
            const result = await leagueService.getById(99999);

            expect(result).toBeUndefined();
        });

        it('should return undefined for null ID', async () => {
            const result = await leagueService.getById(null);

            expect(result).toBeUndefined();
        });
    });

    describe('getActive', () => {
        it('should return the active league', async () => {
            const activeLeague = await leagueService.getActive();

            expect(activeLeague).toBeDefined();
            expect(activeLeague.id).toBe(leagueId);
            expect(activeLeague.is_active).toBe(1);
        });

        it('should return undefined when no league is active', async () => {
            // Deactivate the league
            await db('leagues').where({ id: leagueId }).update({ is_active: false });

            const result = await leagueService.getActive();

            expect(result).toBeUndefined();
        });

        it('should return only the first active league when multiple exist', async () => {
            // Create another active league
            const secondLeagueId = await createTestLeague({
                name: 'Second League',
                is_active: true
            });

            const activeLeague = await leagueService.getActive();

            expect(activeLeague).toBeDefined();
            expect(activeLeague.is_active).toBe(1);
            // Should return one of the active leagues
            expect([leagueId, secondLeagueId]).toContain(activeLeague.id);
        });
    });

    describe('getPointSettings', () => {
        it('should return point settings for a league', async () => {
            const settings = await leagueService.getPointSettings(leagueId);

            expect(settings).toBeDefined();
            expect(settings.points_per_win).toBe(3);
            expect(settings.points_per_loss).toBe(1);
            expect(settings.points_per_draw).toBe(2);
        });

        it('should return undefined for non-existent league', async () => {
            const result = await leagueService.getPointSettings(99999);

            expect(result).toBeUndefined();
        });

        it('should return custom point settings', async () => {
            const customLeagueId = await createTestLeague({
                name: 'Custom Points League',
                is_active: false,
                points_per_win: 5,
                points_per_loss: 0,
                points_per_draw: 3
            });

            const settings = await leagueService.getPointSettings(customLeagueId);

            expect(settings.points_per_win).toBe(5);
            expect(settings.points_per_loss).toBe(0);
            expect(settings.points_per_draw).toBe(3);
        });
    });

    describe('getUserLeague', () => {
        it('should return user league enrollment record', async () => {
            await addUserToLeague(userId1, leagueId, {
                league_wins: 5,
                league_losses: 2,
                league_draws: 1,
                total_points: 18,
                elo_rating: 1550
            });

            const userLeague = await leagueService.getUserLeague(userId1, leagueId);

            expect(userLeague).toBeDefined();
            expect(userLeague.user_id).toBe(userId1);
            expect(userLeague.league_id).toBe(leagueId);
            expect(userLeague.league_wins).toBe(5);
            expect(userLeague.league_losses).toBe(2);
            expect(userLeague.league_draws).toBe(1);
            expect(userLeague.total_points).toBe(18);
        });

        it('should return undefined for user not enrolled in league', async () => {
            const result = await leagueService.getUserLeague(userId1, leagueId);

            expect(result).toBeUndefined();
        });

        it('should return undefined for non-existent user', async () => {
            const result = await leagueService.getUserLeague(99999, leagueId);

            expect(result).toBeUndefined();
        });

        it('should return undefined for non-existent league', async () => {
            const result = await leagueService.getUserLeague(userId1, 99999);

            expect(result).toBeUndefined();
        });
    });

    describe('getLeagueParticipants', () => {
        beforeEach(async () => {
            // Enroll users in the league
            await addUserToLeague(userId1, leagueId, {
                is_active: true,
                league_wins: 3,
                league_losses: 1,
                total_points: 10
            });
            await addUserToLeague(userId2, leagueId, {
                is_active: true,
                league_wins: 2,
                league_losses: 2,
                total_points: 8
            });
            await addUserToLeague(userId3, leagueId, {
                is_active: false,
                league_wins: 1,
                league_losses: 3,
                total_points: 6
            });
        });

        it('should return only active participants by default', async () => {
            const participants = await leagueService.getLeagueParticipants(leagueId);

            expect(participants).toHaveLength(2);
            expect(participants.every(p => p.is_active === 1)).toBe(true);
        });

        it('should include inactive participants when includeInactive is true', async () => {
            const participants = await leagueService.getLeagueParticipants(leagueId, true);

            expect(participants).toHaveLength(3);
            expect(participants.some(p => p.is_active === 0)).toBe(true);
        });

        it('should return participant details with user information', async () => {
            const participants = await leagueService.getLeagueParticipants(leagueId);

            const player1 = participants.find(p => p.user_id === userId1);
            expect(player1).toBeDefined();
            expect(player1.firstname).toBe('Player');
            expect(player1.lastname).toBe('One');
            expect(player1.league_wins).toBe(3);
            expect(player1.league_losses).toBe(1);
            expect(player1.total_points).toBe(10);
        });

        it('should return empty array for league with no participants', async () => {
            const emptyLeagueId = await createTestLeague({
                name: 'Empty League',
                is_active: false
            });

            const participants = await leagueService.getLeagueParticipants(emptyLeagueId);

            expect(participants).toHaveLength(0);
        });

        it('should return empty array for non-existent league', async () => {
            const participants = await leagueService.getLeagueParticipants(99999);

            expect(participants).toHaveLength(0);
        });

        it('should include email in participant details', async () => {
            const participants = await leagueService.getLeagueParticipants(leagueId);

            expect(participants[0].email).toBeDefined();
            expect(participants[0].email).toContain('@');
        });

        it('should include joined_at timestamp', async () => {
            const participants = await leagueService.getLeagueParticipants(leagueId);

            expect(participants[0].joined_at).toBeDefined();
        });
    });

    describe('getLeaderboard', () => {
        beforeEach(async () => {
            // Create users with different stats for leaderboard testing
            await addUserToLeague(userId1, leagueId, {
                is_active: true,
                league_wins: 5,
                league_losses: 2,
                league_draws: 1,
                total_points: 18,
                elo_rating: 1600
            });
            await addUserToLeague(userId2, leagueId, {
                is_active: true,
                league_wins: 4,
                league_losses: 3,
                league_draws: 1,
                total_points: 15,
                elo_rating: 1550
            });
            await addUserToLeague(userId3, leagueId, {
                is_active: true,
                league_wins: 3,
                league_losses: 4,
                league_draws: 1,
                total_points: 12,
                elo_rating: 1500
            });
        });

        it('should return leaderboard sorted by total_points descending', async () => {
            const leaderboard = await leagueService.getLeaderboard(leagueId);

            expect(leaderboard).toHaveLength(3);
            expect(leaderboard[0].player_id).toBe(userId1);
            expect(leaderboard[1].player_id).toBe(userId2);
            expect(leaderboard[2].player_id).toBe(userId3);
        });

        it('should assign correct ranks', async () => {
            const leaderboard = await leagueService.getLeaderboard(leagueId);

            expect(leaderboard[0].rank).toBe(1);
            expect(leaderboard[1].rank).toBe(2);
            expect(leaderboard[2].rank).toBe(3);
        });

        it('should calculate total_games correctly', async () => {
            const leaderboard = await leagueService.getLeaderboard(leagueId);

            const player1 = leaderboard.find(p => p.player_id === userId1);
            // 5 wins + 2 losses + 1 draw = 8 total games
            expect(Number(player1.total_games)).toBe(8);
        });

        it('should calculate win_rate correctly', async () => {
            const leaderboard = await leagueService.getLeaderboard(leagueId);

            const player1 = leaderboard.find(p => p.player_id === userId1);
            // 5 wins / 8 games = 62.5%
            expect(Number(player1.win_rate)).toBeCloseTo(62.5, 1);
        });

        it('should include player details', async () => {
            const leaderboard = await leagueService.getLeaderboard(leagueId);

            expect(leaderboard[0].firstname).toBe('Player');
            expect(leaderboard[0].lastname).toBe('One');
            expect(leaderboard[0].wins).toBe(5);
            expect(leaderboard[0].losses).toBe(2);
            expect(leaderboard[0].draws).toBe(1);
            expect(leaderboard[0].elo_rating).toBe(1600);
        });

        it('should not include inactive players', async () => {
            // Deactivate user1
            await db('user_leagues')
                .where({ user_id: userId1, league_id: leagueId })
                .update({ is_active: false });

            const leaderboard = await leagueService.getLeaderboard(leagueId);

            expect(leaderboard).toHaveLength(2);
            expect(leaderboard.find(p => p.player_id === userId1)).toBeUndefined();
        });

        it('should return empty array for league with no participants', async () => {
            const emptyLeagueId = await createTestLeague({
                name: 'Empty League',
                is_active: false
            });

            const leaderboard = await leagueService.getLeaderboard(emptyLeagueId);

            expect(leaderboard).toHaveLength(0);
        });

        it('should sort by wins as secondary sort when points are equal', async () => {
            // Update players to have same points but different wins
            await db('user_leagues')
                .where({ user_id: userId1, league_id: leagueId })
                .update({ total_points: 15, league_wins: 5 });
            await db('user_leagues')
                .where({ user_id: userId2, league_id: leagueId })
                .update({ total_points: 15, league_wins: 4 });

            const leaderboard = await leagueService.getLeaderboard(leagueId);

            // Player with more wins should rank higher
            expect(leaderboard[0].player_id).toBe(userId1);
            expect(leaderboard[1].player_id).toBe(userId2);
        });

        it('should sort by elo_rating as tertiary sort when points and wins are equal', async () => {
            // Update players to have same points, same wins, but different elo
            await db('user_leagues')
                .where({ user_id: userId1, league_id: leagueId })
                .update({ total_points: 15, league_wins: 4, elo_rating: 1600 });
            await db('user_leagues')
                .where({ user_id: userId2, league_id: leagueId })
                .update({ total_points: 15, league_wins: 4, elo_rating: 1550 });

            const leaderboard = await leagueService.getLeaderboard(leagueId);

            // Player with higher elo should rank higher
            expect(leaderboard[0].player_id).toBe(userId1);
            expect(leaderboard[1].player_id).toBe(userId2);
        });

        it('should handle player with zero games (null win_rate)', async () => {
            const userId4 = await createTestUser({ firstname: 'Player', lastname: 'Four' });
            await addUserToLeague(userId4, leagueId, {
                is_active: true,
                league_wins: 0,
                league_losses: 0,
                league_draws: 0,
                total_points: 0,
                elo_rating: 1500
            });

            const leaderboard = await leagueService.getLeaderboard(leagueId);

            const player4 = leaderboard.find(p => p.player_id === userId4);
            expect(player4).toBeDefined();
            expect(Number(player4.total_games)).toBe(0);
            expect(player4.win_rate).toBeNull();
        });
    });

    describe('isUserEnrolled', () => {
        it('should return true when user is enrolled', async () => {
            await addUserToLeague(userId1, leagueId);

            const isEnrolled = await leagueService.isUserEnrolled(userId1, leagueId);

            expect(isEnrolled).toBe(true);
        });

        it('should return false when user is not enrolled', async () => {
            const isEnrolled = await leagueService.isUserEnrolled(userId1, leagueId);

            expect(isEnrolled).toBe(false);
        });

        it('should return true even for inactive enrollment', async () => {
            await addUserToLeague(userId1, leagueId, { is_active: false });

            const isEnrolled = await leagueService.isUserEnrolled(userId1, leagueId);

            expect(isEnrolled).toBe(true);
        });

        it('should return false for non-existent user', async () => {
            const isEnrolled = await leagueService.isUserEnrolled(99999, leagueId);

            expect(isEnrolled).toBe(false);
        });

        it('should return false for non-existent league', async () => {
            const isEnrolled = await leagueService.isUserEnrolled(userId1, 99999);

            expect(isEnrolled).toBe(false);
        });
    });

    describe('getAllActive', () => {
        it('should return all active leagues', async () => {
            const activeLeagues = await leagueService.getAllActive();

            expect(activeLeagues).toHaveLength(1);
            expect(activeLeagues[0].id).toBe(leagueId);
            expect(activeLeagues[0].is_active).toBe(1);
        });

        it('should return empty array when no active leagues exist', async () => {
            await db('leagues').where({ id: leagueId }).update({ is_active: false });

            const activeLeagues = await leagueService.getAllActive();

            expect(activeLeagues).toHaveLength(0);
        });

        it('should return multiple active leagues', async () => {
            const secondLeagueId = await createTestLeague({
                name: 'Second Active League',
                is_active: true
            });
            const thirdLeagueId = await createTestLeague({
                name: 'Third Active League',
                is_active: true
            });

            const activeLeagues = await leagueService.getAllActive();

            expect(activeLeagues).toHaveLength(3);
            expect(activeLeagues.map(l => l.id)).toContain(leagueId);
            expect(activeLeagues.map(l => l.id)).toContain(secondLeagueId);
            expect(activeLeagues.map(l => l.id)).toContain(thirdLeagueId);
        });

        it('should not include inactive leagues', async () => {
            await createTestLeague({
                name: 'Inactive League',
                is_active: false
            });

            const activeLeagues = await leagueService.getAllActive();

            expect(activeLeagues).toHaveLength(1);
            expect(activeLeagues.every(l => l.is_active === 1)).toBe(true);
        });
    });

    describe('getEnrollmentCount', () => {
        it('should return count of active enrollments', async () => {
            await addUserToLeague(userId1, leagueId, { is_active: true });
            await addUserToLeague(userId2, leagueId, { is_active: true });
            await addUserToLeague(userId3, leagueId, { is_active: true });

            const count = await leagueService.getEnrollmentCount(leagueId);

            expect(count).toBe(3);
        });

        it('should not count inactive enrollments', async () => {
            await addUserToLeague(userId1, leagueId, { is_active: true });
            await addUserToLeague(userId2, leagueId, { is_active: true });
            await addUserToLeague(userId3, leagueId, { is_active: false });

            const count = await leagueService.getEnrollmentCount(leagueId);

            expect(count).toBe(2);
        });

        it('should return 0 for league with no enrollments', async () => {
            const count = await leagueService.getEnrollmentCount(leagueId);

            expect(count).toBe(0);
        });

        it('should return 0 for non-existent league', async () => {
            const count = await leagueService.getEnrollmentCount(99999);

            expect(count).toBe(0);
        });

        it('should return 0 when all enrollments are inactive', async () => {
            await addUserToLeague(userId1, leagueId, { is_active: false });
            await addUserToLeague(userId2, leagueId, { is_active: false });

            const count = await leagueService.getEnrollmentCount(leagueId);

            expect(count).toBe(0);
        });
    });

    describe('integration scenarios', () => {
        it('should handle a complete league lifecycle', async () => {
            // Create a new league
            const newLeagueId = await createTestLeague({
                name: 'Integration Test League',
                is_active: true,
                points_per_win: 5,
                points_per_loss: 1,
                points_per_draw: 2
            });

            // Verify league was created
            const league = await leagueService.getById(newLeagueId);
            expect(league.name).toBe('Integration Test League');

            // Get point settings
            const settings = await leagueService.getPointSettings(newLeagueId);
            expect(settings.points_per_win).toBe(5);

            // Enroll users
            await addUserToLeague(userId1, newLeagueId, {
                is_active: true,
                total_points: 10
            });
            await addUserToLeague(userId2, newLeagueId, {
                is_active: true,
                total_points: 5
            });

            // Check enrollment
            expect(await leagueService.isUserEnrolled(userId1, newLeagueId)).toBe(true);
            expect(await leagueService.getEnrollmentCount(newLeagueId)).toBe(2);

            // Get participants
            const participants = await leagueService.getLeagueParticipants(newLeagueId);
            expect(participants).toHaveLength(2);

            // Get leaderboard
            const leaderboard = await leagueService.getLeaderboard(newLeagueId);
            expect(leaderboard[0].player_id).toBe(userId1); // Higher points
            expect(leaderboard[0].rank).toBe(1);
        });

        it('should correctly isolate leagues from each other', async () => {
            const league1 = await createTestLeague({
                name: 'League 1',
                is_active: true
            });
            const league2 = await createTestLeague({
                name: 'League 2',
                is_active: true
            });

            // Enroll user1 in league1 only
            await addUserToLeague(userId1, league1);

            // Enroll user2 in league2 only
            await addUserToLeague(userId2, league2);

            // Verify isolation
            expect(await leagueService.isUserEnrolled(userId1, league1)).toBe(true);
            expect(await leagueService.isUserEnrolled(userId1, league2)).toBe(false);
            expect(await leagueService.isUserEnrolled(userId2, league1)).toBe(false);
            expect(await leagueService.isUserEnrolled(userId2, league2)).toBe(true);

            // Verify participant counts
            expect(await leagueService.getEnrollmentCount(league1)).toBe(1);
            expect(await leagueService.getEnrollmentCount(league2)).toBe(1);
        });
    });
});
