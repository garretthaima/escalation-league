const express = require('express');
const router = express.Router();
const { authLimiter, loginLimiter } = require('../middlewares/rateLimitMiddleware');
const authenticateToken = require('../middlewares/authentication');
const {
    registerUser,
    loginUser,
    googleAuth,
    verifyGoogleToken,
    refreshAccessToken,
    logout,
    logoutAll,
    verifyEmail,
    resendVerificationEmail,
    forgotPassword,
    resetPassword,
} = require('../controllers/authController');
const {
    getDiscordAuthUrl,
    discordCallback,
    unlinkDiscord,
    getDiscordStatus,
} = require('../controllers/discordController');

// Authentication Endpoints
router.post('/register', authLimiter, registerUser);
router.post('/login', loginLimiter, loginUser); // Use strict limiter for password login
router.post('/google-auth', authLimiter, googleAuth); // Use relaxed limiter for OAuth
router.post('/verify-google-token', authLimiter, verifyGoogleToken);

// Token Refresh Endpoints
router.post('/refresh', authLimiter, refreshAccessToken); // Get new access token using refresh token
router.post('/logout', logout); // Revoke refresh token (no auth required - just needs refresh token)
router.post('/logout-all', authenticateToken, logoutAll); // Revoke all refresh tokens (requires valid access token)

// Email Verification Endpoints
router.post('/verify-email', authLimiter, verifyEmail); // Verify email with token
router.post('/resend-verification', authLimiter, resendVerificationEmail); // Resend verification email

// Password Reset Endpoints
router.post('/forgot-password', loginLimiter, forgotPassword); // Request password reset (uses strict limiter)
router.post('/reset-password', authLimiter, resetPassword); // Reset password with token

// Discord OAuth Endpoints
router.get('/discord/url', authenticateToken, getDiscordAuthUrl); // Get OAuth URL (must be logged in)
router.get('/discord/callback', discordCallback); // OAuth callback (no auth - Discord redirects here)
router.delete('/discord/unlink', authenticateToken, unlinkDiscord); // Unlink Discord account
router.get('/discord/status', authenticateToken, getDiscordStatus); // Get link status

module.exports = router;
