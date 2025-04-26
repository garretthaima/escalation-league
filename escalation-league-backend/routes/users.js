const express = require('express');
const router = express.Router();
const {
    registerUser,
    loginUser,
    googleAuth,
    verifyGoogleToken,
    getUserProfile,
    updateUserProfile,
    deleteUserAccount,
    changePassword,
} = require('../controllers/usersController');
const authenticateToken = require('../middlewares/authentication');

// Authentication Endpoints
router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/google-auth', googleAuth);
router.post('/verify-google-token', verifyGoogleToken);

// User Endpoints
router.get('/profile', authenticateToken, getUserProfile);
router.put('/update', authenticateToken, updateUserProfile);
router.delete('/delete', authenticateToken, deleteUserAccount);
router.put('/change-password', authenticateToken, changePassword);

module.exports = router;