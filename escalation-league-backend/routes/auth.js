const express = require('express');
const router = express.Router();
const { authLimiter, loginLimiter } = require('../middlewares/rateLimitMiddleware');
const {
    registerUser,
    loginUser,
    googleAuth,
    verifyGoogleToken,
} = require('../controllers/authController');

// Authentication Endpoints
router.post('/register', authLimiter, registerUser);
router.post('/login', loginLimiter, loginUser); // Use strict limiter for password login
router.post('/google-auth', authLimiter, googleAuth); // Use relaxed limiter for OAuth
router.post('/verify-google-token', authLimiter, verifyGoogleToken);

module.exports = router;