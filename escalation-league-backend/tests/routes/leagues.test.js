const request = require('supertest');
const { getAuthToken, getAuthTokenWithRole } = require('../helpers/authHelper');
const { createTestLeague, addUserToLeague, createSignupRequest } = require('../helpers/leaguesHelper');
const { createTestUser } = require('../helpers/dbHelper');

// Mock the DB
jest.mock('../../models/db', () => require('../helpers/testDb'));

// Mock the settings utility to return test secret key
jest.mock('../../utils/settingsUtils', () => ({
    getSetting: jest.fn((key) => {
        if (key === 'secret_key') {
            return Promise.resolve(process.env.JWT_SECRET || 'test-secret-key');
        }
        return Promise.resolve(null);
    })
}));

// Mock redis cache
jest.mock('../../utils/redisClient', () => ({
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue('OK'),
    setex: jest.fn().mockResolvedValue('OK'),
    del: jest.fn().mockResolvedValue(1)
}));

// Mock the permissions utility to use test DB
jest.mock('../../utils/permissionsUtils', () => {
    const testDb = require('../helpers/testDb');

    return {
        resolveRolesAndPermissions: async (roleId) => {
            // Get permissions for the role using test DB
            const accessibleRoles = await testDb.withRecursive('role_inheritance', (builder) => {
                builder
                    .select('parent_role_id as role_id', 'child_role_id')
                    .from('role_hierarchy')
                    .unionAll(function () {
                        this.select('ri.role_id', 'rh.child_role_id')
                            .from('role_inheritance as ri')
                            .join('role_hierarchy as rh', 'ri.child_role_id', 'rh.parent_role_id');
                    });
            })
                .select('child_role_id')
                .from('role_inheritance')
                .where('role_id', roleId)
                .union(function () {
                    this.select(testDb.raw('?', [roleId]));
                })
                .then((roles) => roles.map((role) => role.child_role_id));

            const permissions = await testDb('role_permissions')
                .join('permissions', 'role_permissions.permission_id', 'permissions.id')
                .whereIn('role_permissions.role_id', accessibleRoles)
                .select('permissions.id', 'permissions.name');

            const deduplicatedPermissions = Array.from(
                new Map(permissions.map((perm) => [perm.id, perm])).values()
            );

            return { accessibleRoles, permissions: deduplicatedPermissions };
        }
    };
});

const app = require('../../server');

describe('League Routes', () => {
    describe('POST /api/leagues', () => {
        it('should create a league with valid data and permissions', async () => {
            const { token } = await getAuthTokenWithRole('super_admin');

            const res = await request(app)
                .post('/api/leagues')
                .set('Authorization', `Bearer ${token}`)
                .send({
                    name: 'New League',
                    start_date: '2025-06-01',
                    end_date: '2025-12-01',
                    description: 'A brand new league',
                    max_players: 30,
                    weekly_budget: 150,
                    league_code: 'NL2025'
                });

            expect(res.status).toBe(201);
            expect(res.body).toHaveProperty('message', 'League created successfully.');
        });

        it('should reject creation without authentication', async () => {
            const res = await request(app)
                .post('/api/leagues')
                .send({
                    name: 'New League',
                    start_date: '2025-06-01',
                    end_date: '2025-12-01'
                });

            expect(res.status).toBe(401);
        });

        it('should reject creation with missing required fields', async () => {
            const { token } = await getAuthTokenWithRole('super_admin');

            const res = await request(app)
                .post('/api/leagues')
                .set('Authorization', `Bearer ${token}`)
                .send({
                    name: 'Incomplete League'
                });

            expect(res.status).toBe(400);
            expect(res.body).toHaveProperty('error', 'Name, start_date, and end_date are required.');
        });

        // TODO: Add test for user without league_create permission
        // TODO: Add test for duplicate league names
    });

    describe('GET /api/leagues', () => {
        it('should return all leagues for authenticated user', async () => {
            const { token } = await getAuthTokenWithRole('user');

            await createTestLeague({ name: 'League 1' });
            await createTestLeague({ name: 'League 2' });
            await createTestLeague({ name: 'League 3' });

            const res = await request(app)
                .get('/api/leagues')
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(200);
            expect(Array.isArray(res.body)).toBe(true);
            expect(res.body.length).toBeGreaterThanOrEqual(3);
        });

        it('should reject request without authentication', async () => {
            const res = await request(app).get('/api/leagues');
            expect(res.status).toBe(401);
        });

        // TODO: Add test for pagination if implemented
        // TODO: Add test for filtering leagues by status
    });

    describe('GET /api/leagues/active', () => {
        it('should return the active league', async () => {
            // Use super_admin since league_view_active permission isn't assigned to user role
            const { token } = await getAuthTokenWithRole('super_admin');
            const leagueId = await createTestLeague({ name: 'Active League', is_active: true });

            const res = await request(app)
                .get('/api/leagues/active')
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('id', leagueId);
            expect(res.body).toHaveProperty('is_active', 1);
        });

        it('should return 404 when no active league exists', async () => {
            const { token } = await getAuthTokenWithRole('super_admin');

            const res = await request(app)
                .get('/api/leagues/active')
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(404);
            expect(res.body).toHaveProperty('error', 'No active league found.');
        });
    });

    describe('GET /api/leagues/:id', () => {
        it('should return league details for valid ID', async () => {
            // Use super_admin since league_view_details permission isn't assigned to user role
            const { token } = await getAuthTokenWithRole('super_admin');
            const leagueId = await createTestLeague({ name: 'Specific League' });

            const res = await request(app)
                .get(`/api/leagues/${leagueId}`)
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('id', leagueId);
            expect(res.body).toHaveProperty('name', 'Specific League');
        });

        it('should return 404 for non-existent league', async () => {
            const { token } = await getAuthTokenWithRole('super_admin');

            const res = await request(app)
                .get('/api/leagues/99999')
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(404);
            expect(res.body).toHaveProperty('error', 'League not found.');
        });
    });

    describe('PUT /api/leagues/:id', () => {
        it('should update league with valid data', async () => {
            const { token } = await getAuthTokenWithRole('super_admin');

            // Create league first
            const leagueId = await createTestLeague({
                name: 'League To Update',
                start_date: '2025-01-01',
                end_date: '2025-12-31'
            });

            const res = await request(app)
                .put(`/api/leagues/${leagueId}`)
                .set('Authorization', `Bearer ${token}`)
                .send({
                    name: 'Updated League Name',
                    max_players: 50
                });

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('message', 'League updated successfully.');
        });

        // TODO: Add test for updating non-existent league
        // TODO: Add test for user without league_update permission
    });

    describe('PUT /api/leagues/active', () => {
        it('should set a league as active', async () => {
            const { token } = await getAuthTokenWithRole('super_admin');

            // Create league first
            const leagueId = await createTestLeague({
                name: 'League To Activate',
                is_active: false
            });

            const res = await request(app)
                .put('/api/leagues/active')
                .set('Authorization', `Bearer ${token}`)
                .send({ league_id: leagueId });

            console.log('Set active response:', res.status, res.body);

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('message', 'League set as active successfully.');
        });

        it('should deactivate previous active league', async () => {
            const { token } = await getAuthTokenWithRole('super_admin');
            const league1 = await createTestLeague({ is_active: true });
            const league2 = await createTestLeague({ is_active: false });

            await request(app)
                .put('/api/leagues/active')
                .set('Authorization', `Bearer ${token}`)
                .send({ league_id: league2 });

            const db = require('../helpers/testDb');
            const oldLeague = await db('leagues').where({ id: league1 }).first();
            expect(oldLeague.is_active).toBe(0);
        });

        // TODO: Add test for setting non-existent league as active
    });

    describe('GET /api/leagues/:leagueId/stats', () => {
        it('should return league stats and leaderboard', async () => {
            // Use super_admin since league_view_details permission is required
            const { token } = await getAuthTokenWithRole('super_admin');
            const leagueId = await createTestLeague();

            const user1 = await createTestUser({ email: 'player1@test.com' });
            const user2 = await createTestUser({ email: 'player2@test.com' });
            await addUserToLeague(user1, leagueId, { league_wins: 5, league_losses: 2, league_draws: 1 });
            await addUserToLeague(user2, leagueId, { league_wins: 3, league_losses: 4, league_draws: 0 });

            const res = await request(app)
                .get(`/api/leagues/${leagueId}/stats`)
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('leaderboard');
            expect(res.body).toHaveProperty('stats');
            expect(Array.isArray(res.body.leaderboard)).toBe(true);
            expect(res.body.leaderboard.length).toBe(2);
            expect(res.body.stats).toHaveProperty('total_players');
        });

        // TODO: Add test for empty league stats
    });

    describe('GET /api/leagues/search', () => {
        it('should search leagues by name', async () => {
            const { token } = await getAuthTokenWithRole('super_admin');
            await createTestLeague({ name: 'Summer League' });
            await createTestLeague({ name: 'Winter League' });

            // Debug: Check if route exists and what it returns
            const res = await request(app)
                .get('/api/leagues/search?query=Summer')
                .set('Authorization', `Bearer ${token}`);

            console.log('Search response status:', res.status);
            console.log('Search response body:', res.body);

            // If 404, the route might be at a different path
            // Try alternate paths if needed
            if (res.status === 404) {
                const altRes = await request(app)
                    .get('/api/leagues?search=Summer')
                    .set('Authorization', `Bearer ${token}`);
                console.log('Alt search status:', altRes.status);
            }

            expect(res.status).toBe(200);
            expect(Array.isArray(res.body)).toBe(true);
            expect(res.body.length).toBeGreaterThanOrEqual(1);
            expect(res.body[0].name).toContain('Summer');
        });

        it('should reject search without query parameter', async () => {
            const { token } = await getAuthTokenWithRole('super_admin');

            const res = await request(app)
                .get('/api/leagues/search')
                .set('Authorization', `Bearer ${token}`);

            console.log('No query response:', res.status, res.body);

            expect(res.status).toBe(400);
            expect(res.body).toHaveProperty('error', 'Search query is required.');
        });

        // TODO: Add test for searching by description
    });

    describe('GET /api/leagues/signup-requests', () => {
        it('should return pending signup requests', async () => {
            const { token } = await getAuthTokenWithRole('super_admin');
            const leagueId = await createTestLeague();
            const userId = await createTestUser({ email: 'requester@test.com' });
            await createSignupRequest(userId, leagueId, 'pending');

            const res = await request(app)
                .get('/api/leagues/signup-requests')
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(200);
            expect(Array.isArray(res.body)).toBe(true);
            expect(res.body.length).toBeGreaterThanOrEqual(1);
        });

        // TODO: Add test for user without league_manage_requests permission
    });

    describe('PUT /api/leagues/signup-requests/:id/approve', () => {
        it('should approve a signup request', async () => {
            const { token } = await getAuthTokenWithRole('super_admin');
            const leagueId = await createTestLeague();
            const userId = await createTestUser({ email: 'approve@test.com' });
            const requestId = await createSignupRequest(userId, leagueId);

            const res = await request(app)
                .put(`/api/leagues/signup-requests/${requestId}/approve`)
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('message', 'Signup request approved successfully.');
        });

        // TODO: Add test for approving non-existent request
    });

    describe('PUT /api/leagues/signup-requests/:id/reject', () => {
        it('should reject a signup request', async () => {
            const { token } = await getAuthTokenWithRole('super_admin');
            const leagueId = await createTestLeague();
            const userId = await createTestUser({ email: 'reject@test.com' });
            const requestId = await createSignupRequest(userId, leagueId);

            const res = await request(app)
                .put(`/api/leagues/signup-requests/${requestId}/reject`)
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('message', 'Signup request rejected successfully.');
        });

        // TODO: Add test for rejecting non-existent request
    });
});