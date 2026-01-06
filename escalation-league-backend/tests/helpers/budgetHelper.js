const db = require('../../models/db');
const { createTestLeague } = require('./leaguesHelper');
const { getAuthToken } = require('./authHelper');

/**
 * Create a test budget for a user in a league
 * @param {number} userId - User ID
 * @param {number} leagueId - League ID
 * @param {object} overrides - Optional fields to override
 * @returns {Promise<number>} Budget ID
 */
const createTestBudget = async (userId, leagueId, overrides = {}) => {
    const league = await db('leagues').where({ id: leagueId }).first();

    const budgetData = {
        user_id: userId,
        league_id: leagueId,
        budget_used: overrides.budget_used || 0.00,
        budget_available: overrides.budget_available || (league.weekly_budget * league.current_week),
        ...overrides
    };

    const [budgetId] = await db('user_budgets').insert(budgetData);
    return budgetId;
};

/**
 * Add a test card to a budget
 * @param {number} budgetId - Budget ID
 * @param {object} cardData - Card data
 * @returns {Promise<number>} Card ID
 */
const addTestCardToBudget = async (budgetId, cardData = {}) => {
    const budget = await db('user_budgets').where({ id: budgetId }).first();
    const league = await db('leagues').where({ id: budget.league_id }).first();

    const card = {
        user_budget_id: budgetId,
        card_name: cardData.card_name || 'Lightning Bolt',
        scryfall_id: cardData.scryfall_id || 'test-scryfall-id',
        quantity: cardData.quantity || 1,
        price_at_addition: cardData.price_at_addition || 0.50,
        set_name: cardData.set_name || 'M21',
        image_uri: cardData.image_uri || 'https://example.com/image.jpg',
        card_faces: cardData.card_faces ? JSON.stringify(cardData.card_faces) : null,
        week_added: cardData.week_added || league.current_week,
        notes: cardData.notes || null,
        ...cardData
    };

    const [cardId] = await db('budget_cards').insert(card);

    // Update budget_used
    const totalCost = card.price_at_addition * card.quantity;
    await db('user_budgets')
        .where({ id: budgetId })
        .increment('budget_used', totalCost);

    return cardId;
};

/**
 * Get a budget with all its cards
 * @param {number} budgetId - Budget ID
 * @returns {Promise<object>} Budget with cards
 */
const getBudgetWithCards = async (budgetId) => {
    const budget = await db('user_budgets').where({ id: budgetId }).first();
    const cards = await db('budget_cards').where({ user_budget_id: budgetId });

    return {
        ...budget,
        cards
    };
};

/**
 * Create a complete test setup: user, league, budget
 * @returns {Promise<object>} { userId, token, leagueId, budgetId }
 */
const createBudgetTestSetup = async () => {
    const { userId, token } = await getAuthToken({
        role_id: 5 // league_user role
    });

    const leagueId = await createTestLeague({
        name: 'Test Budget League',
        weekly_budget: 11.00,
        current_week: 1,
        is_active: 1
    });

    // Add user to league
    await db('user_leagues').insert({
        user_id: userId,
        league_id: leagueId,
        is_active: 1
    });

    const budgetId = await createTestBudget(userId, leagueId);

    return { userId, token, leagueId, budgetId };
};

module.exports = {
    createTestBudget,
    addTestCardToBudget,
    getBudgetWithCards,
    createBudgetTestSetup
};
