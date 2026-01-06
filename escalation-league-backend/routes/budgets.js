const express = require('express');
const BudgetsController = require('../controllers/budgetsController');
const authenticateToken = require('../middlewares/authentication');
const authorizePermission = require('../middlewares/authorizePermission');

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Budget CRUD
router.get('/league/:leagueId', BudgetsController.getBudgetByLeague);
router.post('/league/:leagueId', BudgetsController.createBudget);
router.put('/:budgetId', authorizePermission(['budget_manage_league']), BudgetsController.updateBudget);

// Card management - requires budget_manage or budget_read
router.get('/:budgetId/cards', BudgetsController.getBudgetCards);
router.post('/:budgetId/cards', authorizePermission(['budget_manage']), BudgetsController.addCardToBudget);
router.put('/:budgetId/cards/:cardId', authorizePermission(['budget_manage']), BudgetsController.updateBudgetCard);
router.delete('/:budgetId/cards/:cardId', authorizePermission(['budget_manage']), BudgetsController.removeCardFromBudget);

// Price features
router.post('/:budgetId/refresh-prices', BudgetsController.refreshCardPrices);
router.get('/:budgetId/summary', BudgetsController.getBudgetSummary);

module.exports = router;
