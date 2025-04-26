const express = require('express');
const router = express.Router();
const {
    getAllUsers,
    deactivateUser,
    activateUser,
    banUser,
    unbanUser,
    getUserDetails,
    resetUserPassword,
    getLeagueReport
} = require('../controllers/adminController');
const authenticateToken = require('../middlewares/authentication');
const authorizeRole = require('../middlewares/authorizeRole');

// Admin Endpoints
router.get('/user/all', authenticateToken, authorizeRole(['admin']), getAllUsers); // Fetch all users
router.put('/user/deactivate/:id', authenticateToken, authorizeRole(['admin']), deactivateUser); // Deactivate user
router.put('/user/activate/:id', authenticateToken, authorizeRole(['admin']), activateUser); // Activate user
router.put('/user/ban/:id', authenticateToken, authorizeRole(['admin']), banUser); // Ban user
router.put('/user/unban/:id', authenticateToken, authorizeRole(['admin']), unbanUser); // Unban user
router.get('/user/:id', authenticateToken, authorizeRole(['admin']), getUserDetails); // View user details
router.put('/user/reset-password/:id', authenticateToken, authorizeRole(['admin']), resetUserPassword); // Reset user password
router.get('/reports/leagues', authenticateToken, authorizeRole(['admin']), getLeagueReport); // Get league report

module.exports = router;