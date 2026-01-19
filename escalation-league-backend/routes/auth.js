const express = require('express');
const router = express.Router();
const { authLimiter, loginLimiter } = require('../middlewares/rateLimitMiddleware');
const authenticateToken = require('../middlewares/authentication');
const {
    registerUser,
    loginUser,
    googleAuth,
    verifyGoogleToken,
} = require('../controllers/authController');
const {
    getDiscordAuthUrl,
    discordCallback,
    unlinkDiscord,
    getDiscordStatus,
} = require('../controllers/discordController');

/**
 * @openapi
 * /auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [username, email, password]
 *             properties:
 *               username:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 format: password
 *               firstname:
 *                 type: string
 *               lastname:
 *                 type: string
 *     responses:
 *       201:
 *         description: User registered successfully
 *       400:
 *         description: Validation error
 *       409:
 *         description: Username or email already exists
 */
router.post('/register', authLimiter, registerUser);

/**
 * @openapi
 * /auth/login:
 *   post:
 *     summary: Login with username/email and password
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [username, password]
 *             properties:
 *               username:
 *                 type: string
 *                 description: Username or email
 *               password:
 *                 type: string
 *                 format: password
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *       401:
 *         description: Invalid credentials
 */
router.post('/login', loginLimiter, loginUser);

/**
 * @openapi
 * /auth/google-auth:
 *   post:
 *     summary: Authenticate with Google OAuth
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [credential]
 *             properties:
 *               credential:
 *                 type: string
 *                 description: Google OAuth credential token
 *     responses:
 *       200:
 *         description: Authentication successful
 *       401:
 *         description: Invalid Google token
 */
router.post('/google-auth', authLimiter, googleAuth);

/**
 * @openapi
 * /auth/verify-google-token:
 *   post:
 *     summary: Verify a Google OAuth token
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [token]
 *             properties:
 *               token:
 *                 type: string
 *     responses:
 *       200:
 *         description: Token is valid
 *       401:
 *         description: Invalid token
 */
router.post('/verify-google-token', authLimiter, verifyGoogleToken);

/**
 * @openapi
 * /auth/discord/url:
 *   get:
 *     summary: Get Discord OAuth URL
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: OAuth URL returned
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 url:
 *                   type: string
 *       401:
 *         description: Unauthorized
 */
router.get('/discord/url', authenticateToken, getDiscordAuthUrl);

/**
 * @openapi
 * /auth/discord/callback:
 *   get:
 *     summary: Discord OAuth callback
 *     tags: [Auth]
 *     parameters:
 *       - in: query
 *         name: code
 *         schema:
 *           type: string
 *         required: true
 *       - in: query
 *         name: state
 *         schema:
 *           type: string
 *         required: true
 *     responses:
 *       302:
 *         description: Redirects to frontend
 */
router.get('/discord/callback', discordCallback);

/**
 * @openapi
 * /auth/discord/unlink:
 *   delete:
 *     summary: Unlink Discord account
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Discord unlinked successfully
 *       401:
 *         description: Unauthorized
 */
router.delete('/discord/unlink', authenticateToken, unlinkDiscord);

/**
 * @openapi
 * /auth/discord/status:
 *   get:
 *     summary: Get Discord link status
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Discord status returned
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 linked:
 *                   type: boolean
 *                 discord_username:
 *                   type: string
 *       401:
 *         description: Unauthorized
 */
router.get('/discord/status', authenticateToken, getDiscordStatus);

module.exports = router;
