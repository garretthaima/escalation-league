const express = require('express');
const router = express.Router();
const { authLimiter } = require('../middlewares/rateLimitMiddleware');
const {
    registerUser,
    loginUser,
    googleAuth,
    verifyGoogleToken,
} = require('../controllers/authController');

// Authentication Endpoints
router.post('/register', authLimiter, registerUser);
router.post('/login', authLimiter, loginUser);
router.post('/google-auth', authLimiter, googleAuth);
router.post('/verify-google-token', authLimiter, verifyGoogleToken);

module.exports = router;