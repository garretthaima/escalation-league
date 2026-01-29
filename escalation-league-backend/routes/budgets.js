const express = require('express');
const BudgetsController = require('../controllers/budgetsController');
const authenticateToken = require('../middlewares/authentication');
const authorizePermission = require('../middlewares/authorizePermission');

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Budget CRUD
router.get('/league/:leagueId', authorizePermission(['budget_read']), BudgetsController.getBudgetByLeague);
router.post('/league/:leagueId', authorizePermission(['budget_manage']), BudgetsController.createBudget);
router.put('/:budgetId', authorizePermission(['budget_manage_league']), BudgetsController.updateBudget);

// Card management
router.get('/:budgetId/cards', authorizePermission(['budget_read']), BudgetsController.getBudgetCards);
router.post('/:budgetId/cards', authorizePermission(['budget_manage']), BudgetsController.addCardToBudget);
router.put('/:budgetId/cards/:cardId', authorizePermission(['budget_manage']), BudgetsController.updateBudgetCard);
router.delete('/:budgetId/cards/:cardId', authorizePermission(['budget_manage']), BudgetsController.removeCardFromBudget);

// Price features
router.post('/:budgetId/refresh-prices', authorizePermission(['budget_manage']), BudgetsController.refreshCardPrices);
router.get('/:budgetId/summary', authorizePermission(['budget_read']), BudgetsController.getBudgetSummary);

module.exports = router;
