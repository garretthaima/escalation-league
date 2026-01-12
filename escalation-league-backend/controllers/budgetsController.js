const db = require('../models/db');
const scryfallDb = require('../models/scryfallDb');
const { calculateCurrentWeek, areAddsLocked } = require('../utils/leagueUtils');

const BudgetsController = {
    /**
     * Get user's budget for a specific league
     * GET /api/budgets/league/:leagueId
     */
    async getBudgetByLeague(req, res) {
        const { leagueId } = req.params;
        const userId = req.user.id;

        try {
            const budget = await db('user_budgets')
                .where({ user_id: userId, league_id: leagueId })
                .first();

            if (!budget) {
                return res.status(404).json({ error: 'Budget not found for this league.' });
            }

            // Get league to calculate current week's available budget
            const league = await db('leagues')
                .where({ id: leagueId })
                .first();

            if (!league) {
                return res.status(404).json({ error: 'League not found.' });
            }

            // Recalculate budget_available based on current week
            const currentWeek = calculateCurrentWeek(league.start_date, league.end_date);
            const calculatedBudgetAvailable = parseFloat(league.weekly_budget) * currentWeek;

            // Update budget_available if it has changed (week transition)
            if (parseFloat(budget.budget_available) !== calculatedBudgetAvailable) {
                await db('user_budgets')
                    .where({ id: budget.id })
                    .update({
                        budget_available: calculatedBudgetAvailable,
                        updated_at: db.raw('NOW()')
                    });
                budget.budget_available = calculatedBudgetAvailable;
            }

            // Get total cards count
            const cardCount = await db('budget_cards')
                .where({ user_budget_id: budget.id })
                .sum('quantity as total')
                .first();

            res.status(200).json({
                ...budget,
                budget_available: calculatedBudgetAvailable, // Use calculated value
                total_cards: parseInt(cardCount.total) || 0
            });
        } catch (error) {
            console.error('Error fetching budget:', error);
            res.status(500).json({ error: 'Failed to fetch budget.' });
        }
    },

    /**
     * Initialize budget for a league
     * POST /api/budgets/league/:leagueId
     */
    async createBudget(req, res) {
        const { leagueId } = req.params;
        const userId = req.user.id;

        try {
            // Check if budget already exists
            const existingBudget = await db('user_budgets')
                .where({ user_id: userId, league_id: leagueId })
                .first();

            if (existingBudget) {
                return res.status(400).json({ error: 'Budget already exists for this league.' });
            }

            // Get league details
            const league = await db('leagues')
                .where({ id: leagueId })
                .first();

            if (!league) {
                return res.status(404).json({ error: 'League not found.' });
            }

            // Check if user is in league
            const userLeague = await db('user_leagues')
                .where({ user_id: userId, league_id: leagueId })
                .first();

            if (!userLeague) {
                return res.status(403).json({ error: 'You are not a member of this league.' });
            }

            // Calculate available budget (weekly budget * current week)
            const currentWeek = calculateCurrentWeek(league.start_date, league.end_date);
            const budget_available = league.weekly_budget * currentWeek;

            // Create budget
            const [budgetId] = await db('user_budgets').insert({
                user_id: userId,
                league_id: leagueId,
                budget_used: 0.00,
                budget_available: budget_available
            });

            const newBudget = await db('user_budgets').where({ id: budgetId }).first();

            res.status(201).json(newBudget);
        } catch (error) {
            console.error('Error creating budget:', error);
            res.status(500).json({ error: 'Failed to create budget.' });
        }
    },

    /**
     * Update budget (admin recalculation or manual adjustment)
     * PUT /api/budgets/:budgetId
     */
    async updateBudget(req, res) {
        const { budgetId } = req.params;
        const { budget_used, budget_available } = req.body;

        try {
            const budget = await db('user_budgets').where({ id: budgetId }).first();

            if (!budget) {
                return res.status(404).json({ error: 'Budget not found.' });
            }

            const updates = {};
            if (budget_used !== undefined) updates.budget_used = budget_used;
            if (budget_available !== undefined) updates.budget_available = budget_available;
            updates.updated_at = db.raw('NOW()');

            await db('user_budgets').where({ id: budgetId }).update(updates);

            const updatedBudget = await db('user_budgets').where({ id: budgetId }).first();

            res.status(200).json(updatedBudget);
        } catch (error) {
            console.error('Error updating budget:', error);
            res.status(500).json({ error: 'Failed to update budget.' });
        }
    },

    /**
     * Get all cards in user's budget
     * GET /api/budgets/:budgetId/cards
     */
    async getBudgetCards(req, res) {
        const { budgetId } = req.params;
        const userId = req.user.id;

        try {
            // Verify budget belongs to user
            const budget = await db('user_budgets')
                .where({ id: budgetId, user_id: userId })
                .first();

            if (!budget) {
                return res.status(404).json({ error: 'Budget not found or unauthorized.' });
            }

            const cards = await db('budget_cards')
                .where({ user_budget_id: budgetId })
                .orderBy('added_at', 'desc');

            res.status(200).json(cards);
        } catch (error) {
            console.error('Error fetching budget cards:', error);
            res.status(500).json({ error: 'Failed to fetch budget cards.' });
        }
    },

    /**
     * Add card to budget
     * POST /api/budgets/:budgetId/cards
     */
    async addCardToBudget(req, res) {
        const { budgetId } = req.params;
        const userId = req.user.id;
        const { card_name, scryfall_id, quantity, price_at_addition, set_name, image_uri, card_faces, notes } = req.body;

        try {
            // Validate required fields
            if (!card_name || !quantity || !price_at_addition) {
                return res.status(400).json({ error: 'Missing required fields: card_name, quantity, price_at_addition' });
            }

            // Verify budget belongs to user
            const budget = await db('user_budgets')
                .where({ id: budgetId, user_id: userId })
                .first();

            if (!budget) {
                return res.status(404).json({ error: 'Budget not found or unauthorized.' });
            }

            // Get league for current week
            const league = await db('leagues')
                .where({ id: budget.league_id })
                .first();

            if (!league) {
                return res.status(404).json({ error: 'League not found.' });
            }

            // Check if adds are locked (after Thursday 6pm, except final week)
            if (areAddsLocked(league.start_date, league.end_date)) {
                return res.status(403).json({
                    error: 'Card adds are locked after Thursday 6pm each week. You can add cards again when the next week starts.',
                    locked: true
                });
            }

            // Calculate total cost
            const totalCost = price_at_addition * quantity;

            // Check if user has enough budget
            const remainingBudget = budget.budget_available - budget.budget_used;
            if (totalCost > remainingBudget) {
                return res.status(400).json({
                    error: 'Insufficient budget.',
                    remaining: remainingBudget,
                    required: totalCost
                });
            }

            // Get current week
            const currentWeek = calculateCurrentWeek(league.start_date, league.end_date);

            // Add card to budget
            const [cardId] = await db('budget_cards').insert({
                user_budget_id: budgetId,
                card_name,
                scryfall_id,
                quantity,
                price_at_addition,
                set_name,
                image_uri,
                card_faces: card_faces ? JSON.stringify(card_faces) : null,
                week_added: currentWeek,
                notes
            });

            // Update budget_used
            await db('user_budgets')
                .where({ id: budgetId })
                .increment('budget_used', totalCost)
                .update({ updated_at: db.raw('NOW()') });

            const newCard = await db('budget_cards').where({ id: cardId }).first();

            res.status(201).json(newCard);
        } catch (error) {
            console.error('Error adding card to budget:', error);
            res.status(500).json({ error: 'Failed to add card to budget.' });
        }
    },

    /**
     * Update card in budget (quantity, notes)
     * PUT /api/budgets/:budgetId/cards/:cardId
     */
    async updateBudgetCard(req, res) {
        const { budgetId, cardId } = req.params;
        const userId = req.user.id;
        const { quantity, notes } = req.body;

        try {
            // Verify budget belongs to user
            const budget = await db('user_budgets')
                .where({ id: budgetId, user_id: userId })
                .first();

            if (!budget) {
                return res.status(404).json({ error: 'Budget not found or unauthorized.' });
            }

            // Get existing card
            const card = await db('budget_cards')
                .where({ id: cardId, user_budget_id: budgetId })
                .first();

            if (!card) {
                return res.status(404).json({ error: 'Card not found in budget.' });
            }

            // If quantity changed, recalculate budget
            if (quantity !== undefined && quantity !== card.quantity) {
                const oldCost = card.price_at_addition * card.quantity;
                const newCost = card.price_at_addition * quantity;
                const costDifference = newCost - oldCost;

                // Check if user has enough budget for increase
                const remainingBudget = budget.budget_available - budget.budget_used;
                if (costDifference > remainingBudget) {
                    return res.status(400).json({
                        error: 'Insufficient budget for quantity increase.',
                        remaining: remainingBudget,
                        required: costDifference
                    });
                }

                // Update budget_used
                await db('user_budgets')
                    .where({ id: budgetId })
                    .increment('budget_used', costDifference)
                    .update({ updated_at: db.raw('NOW()') });
            }

            // Update card
            const updates = {};
            if (quantity !== undefined) updates.quantity = quantity;
            if (notes !== undefined) updates.notes = notes;

            await db('budget_cards').where({ id: cardId }).update(updates);

            const updatedCard = await db('budget_cards').where({ id: cardId }).first();

            res.status(200).json(updatedCard);
        } catch (error) {
            console.error('Error updating budget card:', error);
            res.status(500).json({ error: 'Failed to update budget card.' });
        }
    },

    /**
     * Remove card from budget
     * DELETE /api/budgets/:budgetId/cards/:cardId
     */
    async removeCardFromBudget(req, res) {
        const { budgetId, cardId } = req.params;
        const userId = req.user.id;

        try {
            // Verify budget belongs to user
            const budget = await db('user_budgets')
                .where({ id: budgetId, user_id: userId })
                .first();

            if (!budget) {
                return res.status(404).json({ error: 'Budget not found or unauthorized.' });
            }

            // Get league to check if removes are locked
            const league = await db('leagues')
                .where({ id: budget.league_id })
                .first();

            if (!league) {
                return res.status(404).json({ error: 'League not found.' });
            }

            // Check if removes are locked (after Thursday 6pm EST)
            if (areAddsLocked(league.start_date, league.end_date)) {
                return res.status(403).json({
                    error: 'Card removes are locked after Thursday 6pm EST each week.',
                    locked: true
                });
            }

            // Get card to calculate cost to refund
            const card = await db('budget_cards')
                .where({ id: cardId, user_budget_id: budgetId })
                .first();

            if (!card) {
                return res.status(404).json({ error: 'Card not found in budget.' });
            }

            const cardCost = card.price_at_addition * card.quantity;

            // Delete card
            await db('budget_cards').where({ id: cardId }).delete();

            // Refund budget
            await db('user_budgets')
                .where({ id: budgetId })
                .decrement('budget_used', cardCost)
                .update({ updated_at: db.raw('NOW()') });

            res.status(200).json({ message: 'Card removed from budget successfully.' });
        } catch (error) {
            console.error('Error removing card from budget:', error);
            res.status(500).json({ error: 'Failed to remove card from budget.' });
        }
    },

    /**
     * Refresh prices for all cards in budget (current week only)
     * POST /api/budgets/:budgetId/refresh-prices
     */
    async refreshCardPrices(req, res) {
        const { budgetId } = req.params;
        const userId = req.user.id;

        try {
            // Verify budget belongs to user
            const budget = await db('user_budgets')
                .where({ id: budgetId, user_id: userId })
                .first();

            if (!budget) {
                return res.status(404).json({ error: 'Budget not found or unauthorized.' });
            }

            // Get league for current week calculation
            const league = await db('leagues')
                .where({ id: budget.league_id })
                .first();

            if (!league) {
                return res.status(404).json({ error: 'League not found.' });
            }

            const currentWeek = calculateCurrentWeek(league.start_date, league.end_date);

            // Get only current week's cards
            const cards = await db('budget_cards')
                .where({ user_budget_id: budgetId, week_added: currentWeek })
                .select('*');

            if (cards.length === 0) {
                return res.status(200).json({ message: 'No cards from current week to refresh.', updates: [] });
            }

            // Get unique card names
            const cardNames = [...new Set(cards.map(c => c.card_name))];

            // Query scryfall DB for current cheapest prices
            const priceRows = await scryfallDb('cards')
                .select(
                    'name',
                    'id',
                    'set_name',
                    scryfallDb.raw('JSON_EXTRACT(prices, "$.usd") AS usd'),
                    scryfallDb.raw('JSON_EXTRACT(prices, "$.usd_foil") AS usd_foil'),
                    scryfallDb.raw('JSON_EXTRACT(prices, "$.usd_etched") AS usd_etched'),
                    scryfallDb.raw('JSON_EXTRACT(image_uris, "$.large") AS image_uri'),
                    'card_faces'
                )
                .whereIn('name', cardNames)
                .andWhereRaw('JSON_CONTAINS(games, \'"paper"\')')
                .whereNotExists(function () {
                    this.select('*')
                        .from('exclusions')
                        .whereRaw('exclusions.set = cards.set_code')
                        .orWhereRaw('exclusions.border_color = cards.border_color')
                        .orWhereRaw('exclusions.type_line = cards.type_line')
                        .orWhereRaw('cards.type_line LIKE exclusions.type_line')
                        .orWhereRaw('exclusions.card_id = cards.id')
                        .orWhereRaw('exclusions.set_type = cards.set_type');
                });

            // Group by card name and find cheapest
            const pricesByName = {};
            priceRows.forEach(row => {
                const usd = parseFloat(row.usd) || Infinity;
                const usdFoil = parseFloat(row.usd_foil) || Infinity;
                const usdEtched = parseFloat(row.usd_etched) || Infinity;
                const cheapest = Math.min(usd, usdFoil, usdEtched);

                if (!pricesByName[row.name] || cheapest < pricesByName[row.name].price) {
                    pricesByName[row.name] = {
                        price: cheapest,
                        scryfall_id: row.id,
                        set_name: row.set_name,
                        image_uri: row.image_uri,
                        card_faces: row.card_faces
                    };
                }
            });

            // Build price updates
            const priceUpdates = cards.map(card => {
                const currentPrice = pricesByName[card.card_name];
                return {
                    card_id: card.id,
                    card_name: card.card_name,
                    price_at_addition: parseFloat(card.price_at_addition),
                    current_price: currentPrice ? currentPrice.price : null,
                    price_change: currentPrice ? currentPrice.price - parseFloat(card.price_at_addition) : null,
                    cheapest_set: currentPrice ? currentPrice.set_name : null,
                    cheapest_scryfall_id: currentPrice ? currentPrice.scryfall_id : null
                };
            });

            res.status(200).json({ updates: priceUpdates });
        } catch (error) {
            console.error('Error refreshing card prices:', error);
            res.status(500).json({ error: 'Failed to refresh card prices.' });
        }
    },

    /**
     * Get budget summary by week
     * GET /api/budgets/:budgetId/summary
     */
    async getBudgetSummary(req, res) {
        const { budgetId } = req.params;
        const userId = req.user.id;

        try {
            // Verify budget belongs to user
            const budget = await db('user_budgets')
                .where({ id: budgetId, user_id: userId })
                .first();

            if (!budget) {
                return res.status(404).json({ error: 'Budget not found or unauthorized.' });
            }

            // Get league info
            const league = await db('leagues')
                .where({ id: budget.league_id })
                .first();

            if (!league) {
                return res.status(404).json({ error: 'League not found.' });
            }

            // Get cards grouped by week
            const cardsByWeek = await db('budget_cards')
                .where({ user_budget_id: budgetId })
                .select('week_added')
                .select(db.raw('SUM(price_at_addition * quantity) as total_spent'))
                .count('* as card_count')
                .groupBy('week_added')
                .orderBy('week_added', 'asc');

            // Build weekly summary
            const currentWeek = calculateCurrentWeek(league.start_date, league.end_date);
            const weeklySummary = [];
            let cumulativeBudget = parseFloat(league.weekly_budget);

            for (let week = 1; week <= currentWeek; week++) {
                const weekData = cardsByWeek.find(w => w.week_added === week);
                const spent = weekData ? parseFloat(weekData.total_spent) : 0;
                const cardCount = weekData ? weekData.card_count : 0;

                // Get cards for this week
                const weekCards = await db('budget_cards')
                    .where({ user_budget_id: budgetId, week_added: week })
                    .select('card_name', 'quantity', 'price_at_addition', 'set_name');

                weeklySummary.push({
                    week: week,
                    budget_available: parseFloat(cumulativeBudget.toFixed(2)),
                    budget_used: parseFloat(spent.toFixed(2)),
                    budget_remaining: parseFloat((cumulativeBudget - spent).toFixed(2)),
                    card_count: cardCount,
                    cards: weekCards
                });

                // Update cumulative budget
                cumulativeBudget = (cumulativeBudget - spent) + parseFloat(league.weekly_budget);
            }

            res.status(200).json({
                league_id: league.id,
                league_name: league.name,
                current_week: currentWeek,
                weekly_budget: parseFloat(league.weekly_budget),
                total_budget_available: parseFloat(budget.budget_available),
                total_budget_used: parseFloat(budget.budget_used),
                adds_locked: areAddsLocked(league.start_date, league.end_date),
                weekly_summary: weeklySummary
            });
        } catch (error) {
            console.error('Error fetching budget summary:', error);
            res.status(500).json({ error: 'Failed to fetch budget summary.' });
        }
    }
};

module.exports = BudgetsController;
