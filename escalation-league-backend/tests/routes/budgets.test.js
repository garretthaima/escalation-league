const request = require('supertest');
const { getAuthToken, getAuthTokenWithRole } = require('../helpers/authHelper');
const { createTestLeague, addUserToLeague } = require('../helpers/leaguesHelper');
const { createTestBudget, addTestCardToBudget, createBudgetTestSetup } = require('../helpers/budgetHelper');
const db = require('../helpers/testDb');

// Mock the DB
jest.mock('../../models/db', () => require('../helpers/testDb'));

// Mock scryfallDb for price refresh tests
jest.mock('../../models/scryfallDb', () => {
    const mockDb = jest.fn(() => ({
        select: jest.fn().mockReturnThis(),
        whereIn: jest.fn().mockReturnThis(),
        andWhereRaw: jest.fn().mockReturnThis(),
        whereNotExists: jest.fn().mockReturnThis(),
        then: jest.fn().mockResolvedValue([
            {
                name: 'Lightning Bolt',
                id: 'scryfall-1',
                set_name: 'M21',
                usd: '0.50',
                usd_foil: '1.00',
                usd_etched: null,
                image_uri: '"https://example.com/bolt.jpg"',
                card_faces: null
            },
            {
                name: 'Brainstorm',
                id: 'scryfall-2',
                set_name: 'EMA',
                usd: '8.00',
                usd_foil: '15.00',
                usd_etched: null,
                image_uri: '"https://example.com/brainstorm.jpg"',
                card_faces: null
            }
        ])
    }));
    mockDb.raw = jest.fn((sql) => sql); // Add raw method
    return mockDb;
});

// Mock the settings utility to return test secret key
jest.mock('../../utils/settingsUtils', () => ({
    getSetting: jest.fn((key) => {
        if (key === 'secret_key') {
            return Promise.resolve(process.env.JWT_SECRET || 'test-secret-key');
        }
        return Promise.resolve(null);
    })
}));

// Mock the permissions utility to use test DB
jest.mock('../../utils/permissionsUtils', () => {
    const testDb = require('../helpers/testDb');

    return {
        resolveRolesAndPermissions: async (roleId) => {
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

describe('Budget Routes', () => {
    describe('POST /api/budgets/league/:leagueId - Create Budget', () => {
        it('should create a budget for authenticated user in league', async () => {
            const { userId, token } = await getAuthToken();
            const leagueId = await createTestLeague({
                weekly_budget: 11.00,
                current_week: 2
            });

            await addUserToLeague(userId, leagueId);

            const res = await request(app)
                .post(`/api/budgets/league/${leagueId}`)
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(201);
            expect(res.body).toHaveProperty('id');
            expect(res.body.user_id).toBe(userId);
            expect(res.body.league_id).toBe(leagueId);
            expect(parseFloat(res.body.budget_available)).toBe(22.00); // 11 * 2 weeks
            expect(parseFloat(res.body.budget_used)).toBe(0.00);
        });

        it('should reject if budget already exists', async () => {
            const { userId, token } = await getAuthToken();
            const leagueId = await createTestLeague();
            await addUserToLeague(userId, leagueId);
            await createTestBudget(userId, leagueId);

            const res = await request(app)
                .post(`/api/budgets/league/${leagueId}`)
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(400);
            expect(res.body).toHaveProperty('error', 'Budget already exists for this league.');
        });

        it('should reject if user not in league', async () => {
            const { token } = await getAuthToken();
            const leagueId = await createTestLeague();

            const res = await request(app)
                .post(`/api/budgets/league/${leagueId}`)
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(403);
            expect(res.body).toHaveProperty('error', 'You are not a member of this league.');
        });

        it('should reject if league does not exist', async () => {
            const { token } = await getAuthToken();

            const res = await request(app)
                .post('/api/budgets/league/99999')
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(404);
            expect(res.body).toHaveProperty('error', 'League not found.');
        });

        it('should reject without authentication', async () => {
            const res = await request(app).post('/api/budgets/league/1');
            expect(res.status).toBe(401);
        });
    });

    describe('GET /api/budgets/league/:leagueId - Get Budget', () => {
        it('should return user budget with total cards', async () => {
            const { userId, token, leagueId, budgetId } = await createBudgetTestSetup();
            await addTestCardToBudget(budgetId, { quantity: 2 });
            await addTestCardToBudget(budgetId, { quantity: 3 });

            const res = await request(app)
                .get(`/api/budgets/league/${leagueId}`)
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(200);
            expect(res.body.id).toBe(budgetId);
            expect(res.body.user_id).toBe(userId);
            expect(res.body.total_cards).toBe(5); // 2 + 3
        });

        it('should return 404 if budget does not exist', async () => {
            const { token } = await getAuthToken();
            const leagueId = await createTestLeague();

            const res = await request(app)
                .get(`/api/budgets/league/${leagueId}`)
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(404);
            expect(res.body).toHaveProperty('error', 'Budget not found for this league.');
        });

        it('should reject without authentication', async () => {
            const res = await request(app).get('/api/budgets/league/1');
            expect(res.status).toBe(401);
        });
    });

    describe('PUT /api/budgets/:budgetId - Update Budget', () => {
        it('should update budget with league admin permission', async () => {
            const { token } = await getAuthTokenWithRole('league_admin');
            const { userId } = await getAuthToken();
            const leagueId = await createTestLeague();
            await addUserToLeague(userId, leagueId);
            const budgetId = await createTestBudget(userId, leagueId);

            const res = await request(app)
                .put(`/api/budgets/${budgetId}`)
                .set('Authorization', `Bearer ${token}`)
                .send({
                    budget_used: 50.00,
                    budget_available: 100.00
                });

            expect(res.status).toBe(200);
            expect(parseFloat(res.body.budget_used)).toBe(50.00);
            expect(parseFloat(res.body.budget_available)).toBe(100.00);
        });

        it('should reject without league admin permission', async () => {
            const { token } = await getAuthToken();
            const { userId } = await getAuthToken();
            const leagueId = await createTestLeague();
            const budgetId = await createTestBudget(userId, leagueId);

            const res = await request(app)
                .put(`/api/budgets/${budgetId}`)
                .set('Authorization', `Bearer ${token}`)
                .send({ budget_used: 50.00 });

            expect(res.status).toBe(403);
        });

        it('should return 404 if budget does not exist', async () => {
            const { token } = await getAuthTokenWithRole('league_admin');

            const res = await request(app)
                .put('/api/budgets/99999')
                .set('Authorization', `Bearer ${token}`)
                .send({ budget_used: 50.00 });

            expect(res.status).toBe(404);
        });
    });

    describe('POST /api/budgets/:budgetId/cards - Add Card', () => {
        it('should add card to budget with valid data', async () => {
            const { token, budgetId } = await createBudgetTestSetup();

            const res = await request(app)
                .post(`/api/budgets/${budgetId}/cards`)
                .set('Authorization', `Bearer ${token}`)
                .send({
                    card_name: 'Sol Ring',
                    scryfall_id: 'sol-ring-id',
                    quantity: 1,
                    price_at_addition: 2.50,
                    set_name: 'C21',
                    image_uri: 'https://example.com/sol-ring.jpg',
                    notes: 'Best card ever'
                });

            expect(res.status).toBe(201);
            expect(res.body.card_name).toBe('Sol Ring');
            expect(res.body.quantity).toBe(1);
            expect(parseFloat(res.body.price_at_addition)).toBe(2.50);

            // Verify budget_used was updated
            const budget = await db('user_budgets').where({ id: budgetId }).first();
            expect(parseFloat(budget.budget_used)).toBe(2.50);
        });

        it('should reject if insufficient budget', async () => {
            const { token, budgetId } = await createBudgetTestSetup();

            const res = await request(app)
                .post(`/api/budgets/${budgetId}/cards`)
                .set('Authorization', `Bearer ${token}`)
                .send({
                    card_name: 'Expensive Card',
                    quantity: 1,
                    price_at_addition: 100.00
                });

            expect(res.status).toBe(400);
            expect(res.body).toHaveProperty('error', 'Insufficient budget.');
            expect(res.body).toHaveProperty('remaining');
            expect(res.body).toHaveProperty('required');
        });

        it('should reject if missing required fields', async () => {
            const { token, budgetId } = await createBudgetTestSetup();

            const res = await request(app)
                .post(`/api/budgets/${budgetId}/cards`)
                .set('Authorization', `Bearer ${token}`)
                .send({
                    card_name: 'Incomplete Card'
                });

            expect(res.status).toBe(400);
            expect(res.body.error).toContain('Missing required fields');
        });

        it('should reject if budget does not belong to user', async () => {
            const { token } = await getAuthTokenWithRole('league_user');
            const { budgetId } = await createBudgetTestSetup();

            const res = await request(app)
                .post(`/api/budgets/${budgetId}/cards`)
                .set('Authorization', `Bearer ${token}`)
                .send({
                    card_name: 'Test Card',
                    quantity: 1,
                    price_at_addition: 1.00
                });

            expect(res.status).toBe(404);
        });

        it('should reject without budget_manage permission', async () => {
            const { token, budgetId } = await createBudgetTestSetup();

            // Create a user without budget_manage permission
            const { token: noPermToken } = await getAuthToken({ role_id: 3 }); // pod_admin

            const res = await request(app)
                .post(`/api/budgets/${budgetId}/cards`)
                .set('Authorization', `Bearer ${noPermToken}`)
                .send({
                    card_name: 'Test Card',
                    quantity: 1,
                    price_at_addition: 1.00
                });

            expect(res.status).toBe(403);
        });
    });

    describe('GET /api/budgets/:budgetId/cards - Get Cards', () => {
        it('should return all cards in budget', async () => {
            const { token, budgetId } = await createBudgetTestSetup();
            await addTestCardToBudget(budgetId, { card_name: 'Card 1' });
            await addTestCardToBudget(budgetId, { card_name: 'Card 2' });
            await addTestCardToBudget(budgetId, { card_name: 'Card 3' });

            const res = await request(app)
                .get(`/api/budgets/${budgetId}/cards`)
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(200);
            expect(Array.isArray(res.body)).toBe(true);
            expect(res.body.length).toBe(3);
            expect(res.body[0]).toHaveProperty('card_name');
            expect(res.body[0]).toHaveProperty('quantity');
            expect(res.body[0]).toHaveProperty('price_at_addition');
        });

        it('should return empty array if no cards', async () => {
            const { token, budgetId } = await createBudgetTestSetup();

            const res = await request(app)
                .get(`/api/budgets/${budgetId}/cards`)
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(200);
            expect(Array.isArray(res.body)).toBe(true);
            expect(res.body.length).toBe(0);
        });

        it('should reject if budget does not belong to user', async () => {
            const { token } = await getAuthToken();
            const { budgetId } = await createBudgetTestSetup();

            const res = await request(app)
                .get(`/api/budgets/${budgetId}/cards`)
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(404);
        });
    });

    describe('PUT /api/budgets/:budgetId/cards/:cardId - Update Card', () => {
        it('should update card quantity and recalculate budget', async () => {
            const { userId, token } = await getAuthTokenWithRole('league_user');
            const leagueId = await createTestLeague({
                weekly_budget: 20.00, // Higher budget to allow quantity increase
                current_week: 1
            });
            await addUserToLeague(userId, leagueId);
            const budgetId = await createTestBudget(userId, leagueId);

            const cardId = await addTestCardToBudget(budgetId, {
                card_name: 'Test Card',
                quantity: 1,
                price_at_addition: 5.00
            });

            const res = await request(app)
                .put(`/api/budgets/${budgetId}/cards/${cardId}`)
                .set('Authorization', `Bearer ${token}`)
                .send({ quantity: 3 });

            if (res.status !== 200) {
                console.log('Error response:', res.body);
            }

            expect(res.status).toBe(200);
            expect(res.body.quantity).toBe(3);

            // Verify budget_used was updated (5.00 * 3 = 15.00)
            const budget = await db('user_budgets').where({ id: budgetId }).first();
            expect(parseFloat(budget.budget_used)).toBe(15.00);
        });

        it('should update card notes', async () => {
            const { token, budgetId } = await createBudgetTestSetup();
            const cardId = await addTestCardToBudget(budgetId);

            const res = await request(app)
                .put(`/api/budgets/${budgetId}/cards/${cardId}`)
                .set('Authorization', `Bearer ${token}`)
                .send({ notes: 'Updated notes' });

            expect(res.status).toBe(200);
            expect(res.body.notes).toBe('Updated notes');
        });

        it('should reject if quantity increase exceeds budget', async () => {
            const { token, budgetId } = await createBudgetTestSetup();
            const cardId = await addTestCardToBudget(budgetId, {
                quantity: 1,
                price_at_addition: 5.00
            });

            const res = await request(app)
                .put(`/api/budgets/${budgetId}/cards/${cardId}`)
                .set('Authorization', `Bearer ${token}`)
                .send({ quantity: 100 });

            expect(res.status).toBe(400);
            expect(res.body).toHaveProperty('error', 'Insufficient budget for quantity increase.');
        });

        it('should reject if card not found', async () => {
            const { token, budgetId } = await createBudgetTestSetup();

            const res = await request(app)
                .put(`/api/budgets/${budgetId}/cards/99999`)
                .set('Authorization', `Bearer ${token}`)
                .send({ quantity: 2 });

            expect(res.status).toBe(404);
        });

        it('should reject without budget_manage permission', async () => {
            const { budgetId } = await createBudgetTestSetup();
            const cardId = await addTestCardToBudget(budgetId);
            const { token: noPermToken } = await getAuthToken({ role_id: 3 });

            const res = await request(app)
                .put(`/api/budgets/${budgetId}/cards/${cardId}`)
                .set('Authorization', `Bearer ${noPermToken}`)
                .send({ quantity: 2 });

            expect(res.status).toBe(403);
        });
    });

    describe('DELETE /api/budgets/:budgetId/cards/:cardId - Remove Card', () => {
        it('should remove card and refund budget', async () => {
            const { token, budgetId } = await createBudgetTestSetup();
            const cardId = await addTestCardToBudget(budgetId, {
                quantity: 2,
                price_at_addition: 3.00
            });

            const budgetBefore = await db('user_budgets').where({ id: budgetId }).first();
            expect(parseFloat(budgetBefore.budget_used)).toBe(6.00);

            const res = await request(app)
                .delete(`/api/budgets/${budgetId}/cards/${cardId}`)
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('message', 'Card removed from budget successfully.');

            // Verify card was deleted
            const card = await db('budget_cards').where({ id: cardId }).first();
            expect(card).toBeUndefined();

            // Verify budget was refunded
            const budgetAfter = await db('user_budgets').where({ id: budgetId }).first();
            expect(parseFloat(budgetAfter.budget_used)).toBe(0.00);
        });

        it('should reject if card not found', async () => {
            const { token, budgetId } = await createBudgetTestSetup();

            const res = await request(app)
                .delete(`/api/budgets/${budgetId}/cards/99999`)
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(404);
        });

        it('should reject without budget_manage permission', async () => {
            const { budgetId } = await createBudgetTestSetup();
            const cardId = await addTestCardToBudget(budgetId);
            const { token: noPermToken } = await getAuthToken({ role_id: 3 });

            const res = await request(app)
                .delete(`/api/budgets/${budgetId}/cards/${cardId}`)
                .set('Authorization', `Bearer ${noPermToken}`);

            expect(res.status).toBe(403);
        });
    });

    describe('POST /api/budgets/:budgetId/refresh-prices - Refresh Prices', () => {
        it.skip('should return current prices for all cards', async () => {
            const { token, budgetId } = await createBudgetTestSetup();
            await addTestCardToBudget(budgetId, {
                card_name: 'Lightning Bolt',
                price_at_addition: 1.00
            });
            await addTestCardToBudget(budgetId, {
                card_name: 'Brainstorm',
                price_at_addition: 10.00
            });

            const res = await request(app)
                .post(`/api/budgets/${budgetId}/refresh-prices`)
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('updates');
            expect(Array.isArray(res.body.updates)).toBe(true);
            expect(res.body.updates.length).toBe(2);
            expect(res.body.updates[0]).toHaveProperty('card_name');
            expect(res.body.updates[0]).toHaveProperty('price_at_addition');
            expect(res.body.updates[0]).toHaveProperty('current_price');
            expect(res.body.updates[0]).toHaveProperty('price_change');
        });

        it('should handle budget with no cards', async () => {
            const { token, budgetId } = await createBudgetTestSetup();

            const res = await request(app)
                .post(`/api/budgets/${budgetId}/refresh-prices`)
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(200);
            expect(res.body.message).toBe('No cards to refresh.');
            expect(res.body.updates).toEqual([]);
        });

        it('should reject if budget does not belong to user', async () => {
            const { token } = await getAuthToken();
            const { budgetId } = await createBudgetTestSetup();

            const res = await request(app)
                .post(`/api/budgets/${budgetId}/refresh-prices`)
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(404);
        });
    });

    describe('GET /api/budgets/:budgetId/summary - Get Summary', () => {
        it('should return weekly budget summary', async () => {
            const { token, leagueId, budgetId } = await createBudgetTestSetup();

            // Update league to week 3
            await db('leagues').where({ id: leagueId }).update({ current_week: 3 });

            // Add cards in different weeks
            await addTestCardToBudget(budgetId, {
                card_name: 'Week 1 Card',
                price_at_addition: 5.00,
                week_added: 1
            });
            await addTestCardToBudget(budgetId, {
                card_name: 'Week 2 Card',
                price_at_addition: 8.00,
                week_added: 2
            });

            const res = await request(app)
                .get(`/api/budgets/${budgetId}/summary`)
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('league_id', leagueId);
            expect(res.body).toHaveProperty('current_week', 3);
            expect(res.body).toHaveProperty('weekly_summary');
            expect(Array.isArray(res.body.weekly_summary)).toBe(true);
            expect(res.body.weekly_summary.length).toBe(3);

            // Check week 1 data
            const week1 = res.body.weekly_summary.find(w => w.week === 1);
            expect(week1.budget_used).toBe(5.00);
            expect(week1.card_count).toBe(1);
            expect(week1.cards.length).toBe(1);
            expect(week1.cards[0].card_name).toBe('Week 1 Card');

            // Check week 2 data
            const week2 = res.body.weekly_summary.find(w => w.week === 2);
            expect(week2.budget_used).toBe(8.00);

            // Check week 3 has no cards
            const week3 = res.body.weekly_summary.find(w => w.week === 3);
            expect(week3.budget_used).toBe(0);
            expect(week3.card_count).toBe(0);
        });

        it('should reject if budget does not belong to user', async () => {
            const { token } = await getAuthToken();
            const { budgetId } = await createBudgetTestSetup();

            const res = await request(app)
                .get(`/api/budgets/${budgetId}/summary`)
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(404);
        });
    });
});
