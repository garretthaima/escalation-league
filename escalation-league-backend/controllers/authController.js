const bcrypt = require('bcrypt');
const db = require('../models/db');
const { OAuth2Client } = require('google-auth-library');
const { generateAccessToken } = require('../utils/tokenUtils');
const { handleError } = require('../utils/errorUtils');
const { getSetting } = require('../utils/settingsUtils');
const logger = require('../utils/logger');
const {
    createRefreshToken,
    refreshTokens,
    revokeRefreshToken,
    revokeRefreshTokensByUser,
} = require('../services/refreshTokenService');
const { logLogin, logLogout } = require('../services/activityLogService');
const { verifyTurnstile } = require('../utils/turnstile');
const { validatePassword } = require('../utils/passwordValidator');
const {
    createVerificationToken,
    validateVerificationToken,
    createResetToken,
    validateResetToken
} = require('../utils/emailTokenUtils');
const emailService = require('../services/emailService');


// Register User
const registerUser = async (req, res) => {
    const { firstname, lastname, email, password, turnstileToken } = req.body;

    logger.info('User registration attempt', { email, firstname, lastname });

    try {
        // Verify Turnstile token
        const turnstileResult = await verifyTurnstile(turnstileToken, req.ip);
        if (!turnstileResult.success) {
            logger.warn('Turnstile verification failed during registration', { email, errorCodes: turnstileResult.errorCodes });
            return res.status(403).json({ error: 'Verification failed. Please try again.' });
        }

        // Validate password strength
        const passwordValidation = validatePassword(password);
        if (!passwordValidation.isValid) {
            logger.warn('Password validation failed during registration', { email, errors: passwordValidation.errors });
            return res.status(400).json({
                error: 'Invalid password',
                details: passwordValidation.errors
            });
        }

        // Fetch the default role 'league_user'
        const leagueUserRole = await db('roles').select('id').where({ name: 'league_user' }).first();

        if (!leagueUserRole) {
            logger.error('Default role not found during registration', null, { email });
            return res.status(500).json({ error: 'Default role "league_user" not found in the database.' });
        }

        // Hash the password before storing it
        const hashedPassword = await bcrypt.hash(password, 10);

        // Insert the user into the database with default role
        const [userId] = await db('users').insert({
            firstname,
            lastname,
            email,
            password: hashedPassword,
            role_id: leagueUserRole.id, // Assign default league_user role
            email_verified: false,
        });

        logger.info('User registered successfully', { userId, email, roleId: leagueUserRole.id });

        // Send verification email if email service is configured
        if (emailService.isConfigured()) {
            try {
                const verificationToken = await createVerificationToken(userId);
                await emailService.sendVerificationEmail(email, verificationToken, firstname);
                logger.info('Verification email sent', { userId, email });
            } catch (emailErr) {
                // Log but don't fail registration if email fails
                logger.error('Failed to send verification email', emailErr, { userId, email });
            }
        }

        // Send a success response
        res.status(201).json({ success: true, userId, emailVerificationSent: emailService.isConfigured() });
    } catch (err) {
        // Handle duplicate email error (MySQL error code 1062)
        if (err.code === 'ER_DUP_ENTRY') {
            logger.warn('Registration failed - duplicate email', { email });
            return res.status(400).json({ error: 'Email is already registered.' });
        }

        logger.error('Error registering user', err, { email });
        res.status(500).json({ error: 'Failed to register user.' });
    }
};


// Login User
const loginUser = async (req, res) => {
    const { email, password, turnstileToken } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required.' });
    }

    try {
        // Verify Turnstile token
        const turnstileResult = await verifyTurnstile(turnstileToken, req.ip);
        if (!turnstileResult.success) {
            logger.warn('Turnstile verification failed during login', { email, errorCodes: turnstileResult.errorCodes });
            return res.status(403).json({ error: 'Verification failed. Please try again.' });
        }

        const user = await db('users')
            .leftJoin('roles', 'users.role_id', 'roles.id') // Use LEFT JOIN to include users with NULL role_id
            .select('users.id', 'users.email', 'users.password', 'users.role_id', 'roles.name as role_name')
            .whereRaw('LOWER(users.email) = ?', [email.toLowerCase()]) // Ensure case-insensitive matching
            .andWhere('users.is_deleted', 0) // Exclude deleted users
            .andWhere('users.is_active', 1) // Exclude inactive users
            .first();


        if (!user) {
            console.error('User not found for supplied credentials');
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        if (!user.password) {
            console.error('User password is missing in the database.');
            return res.status(500).json({ error: 'Server error. Please contact support.' });
        }

        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        // Update last_login timestamp
        await db('users').where({ id: user.id }).update({ last_login: db.fn.now() });

        // Generate both access and refresh tokens
        const accessToken = await generateAccessToken(user);
        const refreshToken = await createRefreshToken(
            user.id,
            req.headers['user-agent'],
            req.ip
        );

        logger.info('User logged in successfully', { userId: user.id, email: user.email });

        // Log activity
        await logLogin(user.id, req.ip);

        res.status(200).json({
            token: accessToken, // Keep 'token' for backward compatibility
            refreshToken
        });
    } catch (err) {
        console.error('Error during login:', err.message);
        res.status(500).json({ error: 'Internal server error' });
    }
};


// Google Authentication
const googleAuth = async (req, res) => {
    try {
        const { token } = req.body;

        if (!token) {
            return res.status(400).json({ error: 'Token is required' });
        }

        // Fetch the Google Client ID dynamically
        const CLIENT_ID = await getSetting('google_client_id');

        const client = new OAuth2Client(CLIENT_ID);

        // Verify the token
        const ticket = await client.verifyIdToken({
            idToken: token,
            audience: CLIENT_ID, // Must match the client ID
        });

        const payload = ticket.getPayload();
        const { sub, email, given_name, family_name, picture } = payload;

        // Fetch the role ID for 'league_user'
        const leagueUserRole = await db('roles').select('id', 'name').where({ name: 'league_user' }).first();

        if (!leagueUserRole) {
            return res.status(500).json({ error: 'Role "league_user" not found in the database.' });
        }

        // Check if the user exists in the database
        let user = await db('users').where({ email }).first();
        if (!user) {
            // Create a new user if not found
            // Google users are automatically email-verified
            const [userId] = await db('users').insert({
                google_id: sub,
                email,
                firstname: given_name,
                lastname: family_name,
                picture, // Use Google picture for new users
                role_id: leagueUserRole.id, // Assign the 'league_user' role
                email_verified: true,
                email_verified_at: db.fn.now(),
            });
            user = {
                id: userId,
                email,
                firstname: given_name,
                lastname: family_name,
                picture,
                role_id: leagueUserRole.id,
                role_name: leagueUserRole.name, // Include role_name
            };
        } else {
            // User exists - update Google ID if not already set, and picture if null
            const updates = {};

            // Link Google ID to existing account if not already linked
            if (!user.google_id && sub) {
                updates.google_id = sub;
            }

            if (!user.picture) {
                updates.picture = picture;
            }

            if (Object.keys(updates).length > 0) {
                await db('users').where({ email }).update(updates);
            }

            // Fetch the user's actual role from database (don't override)
            const userRole = await db('roles').select('name').where({ id: user.role_id }).first();
            user.role_name = userRole ? userRole.name : leagueUserRole.name;
        }

        // Update last_login timestamp
        await db('users').where({ id: user.id }).update({ last_login: db.fn.now() });

        // Generate both access and refresh tokens
        const accessToken = await generateAccessToken(user);
        const refreshToken = await createRefreshToken(
            user.id,
            req.headers['user-agent'],
            req.ip
        );

        logger.info('Google auth successful', { userId: user.id, email: user.email });

        // Log activity
        await logLogin(user.id, req.ip);

        res.status(200).json({
            success: true,
            token: accessToken, // Keep 'token' for backward compatibility
            refreshToken
        });
    } catch (err) {
        console.error('Error in Google Auth:', err.message);
        handleError(res, err, 401, 'Invalid Google token');
    }
};

// Verify Google Token
const verifyGoogleToken = async (req, res) => {
    const { token } = req.body;

    try {
        const ticket = await client.verifyIdToken({
            idToken: token,
            audience: CLIENT_ID,
        });

        const payload = ticket.getPayload();
        res.status(200).json({ message: 'User authenticated successfully', user: payload });
    } catch (err) {
        handleError(res, err, 401, 'Invalid token');
    }
};

/**
 * Refresh access token using a valid refresh token
 * Implements token rotation - issues new refresh token each time
 */
const refreshAccessToken = async (req, res) => {
    const { refreshToken } = req.body;

    if (!refreshToken) {
        return res.status(400).json({ error: 'Refresh token is required' });
    }

    try {
        const tokens = await refreshTokens(
            refreshToken,
            req.headers['user-agent'],
            req.ip
        );

        if (!tokens) {
            return res.status(401).json({
                error: 'Invalid or expired refresh token',
                code: 'REFRESH_TOKEN_INVALID'
            });
        }

        res.status(200).json({
            token: tokens.accessToken,
            refreshToken: tokens.refreshToken
        });
    } catch (err) {
        console.error('Error refreshing token:', err.message);
        res.status(500).json({ error: 'Internal server error' });
    }
};

/**
 * Logout - revoke the provided refresh token
 */
const logout = async (req, res) => {
    const { refreshToken } = req.body;

    try {
        if (refreshToken) {
            await revokeRefreshToken(refreshToken);
        }

        res.status(200).json({ success: true });
    } catch (err) {
        console.error('Error during logout:', err.message);
        // Still return success - user wants to logout
        res.status(200).json({ success: true });
    }
};

/**
 * Logout from all devices - revoke all refresh tokens for the user
 * Requires valid access token
 */
const logoutAll = async (req, res) => {
    const userId = req.user.id; // From auth middleware

    try {
        await revokeRefreshTokensByUser(userId);

        // Log activity
        await logLogout(userId);

        logger.info('User logged out from all devices', { userId });
        res.status(200).json({ success: true, message: 'Logged out from all devices' });
    } catch (err) {
        console.error('Error during logout all:', err.message);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// ============================================================================
// Email Verification Endpoints
// ============================================================================

/**
 * Verify email address using token from email link
 */
const verifyEmail = async (req, res) => {
    const { token } = req.body;

    if (!token) {
        return res.status(400).json({ error: 'Verification token is required' });
    }

    try {
        const result = await validateVerificationToken(token);

        if (!result.valid) {
            return res.status(400).json({ error: result.error });
        }

        // Mark user as verified
        await db('users')
            .where({ id: result.userId })
            .update({
                email_verified: true,
                email_verified_at: db.fn.now()
            });

        logger.info('Email verified successfully', { userId: result.userId });
        res.status(200).json({ success: true, message: 'Email verified successfully' });
    } catch (err) {
        logger.error('Error verifying email', err);
        res.status(500).json({ error: 'Failed to verify email' });
    }
};

/**
 * Resend verification email
 */
const resendVerificationEmail = async (req, res) => {
    const { email } = req.body;

    if (!email) {
        return res.status(400).json({ error: 'Email is required' });
    }

    try {
        const user = await db('users')
            .where({ email: email.toLowerCase() })
            .where({ is_deleted: false })
            .first();

        // Always return success to prevent email enumeration
        if (!user) {
            return res.status(200).json({
                success: true,
                message: 'If an account exists with this email, a verification link has been sent'
            });
        }

        // Check if already verified
        if (user.email_verified) {
            return res.status(200).json({
                success: true,
                message: 'If an account exists with this email, a verification link has been sent'
            });
        }

        // Check if email service is configured
        if (!emailService.isConfigured()) {
            logger.warn('Email service not configured, skipping verification email');
            return res.status(200).json({
                success: true,
                message: 'If an account exists with this email, a verification link has been sent'
            });
        }

        // Create and send verification token
        const verificationToken = await createVerificationToken(user.id);
        await emailService.sendVerificationEmail(email, verificationToken, user.firstname);

        logger.info('Verification email resent', { userId: user.id, email });
        res.status(200).json({
            success: true,
            message: 'If an account exists with this email, a verification link has been sent'
        });
    } catch (err) {
        logger.error('Error resending verification email', err);
        // Still return success to prevent enumeration
        res.status(200).json({
            success: true,
            message: 'If an account exists with this email, a verification link has been sent'
        });
    }
};

// ============================================================================
// Password Reset Endpoints
// ============================================================================

/**
 * Request password reset - sends reset email
 */
const forgotPassword = async (req, res) => {
    const { email, turnstileToken } = req.body;

    if (!email) {
        return res.status(400).json({ error: 'Email is required' });
    }

    try {
        // Verify Turnstile token
        const turnstileResult = await verifyTurnstile(turnstileToken, req.ip);
        if (!turnstileResult.success) {
            logger.warn('Turnstile verification failed during password reset request', { email });
            return res.status(403).json({ error: 'Verification failed. Please try again.' });
        }

        const user = await db('users')
            .where({ email: email.toLowerCase() })
            .where({ is_deleted: false })
            .first();

        // Always return success to prevent email enumeration
        const successMessage = 'If an account exists with this email, a password reset link has been sent';

        if (!user) {
            return res.status(200).json({ success: true, message: successMessage });
        }

        // Don't send reset email for Google-only accounts (no password)
        if (user.google_id && !user.password) {
            logger.info('Password reset requested for Google-only account, ignoring', { email });
            return res.status(200).json({ success: true, message: successMessage });
        }

        // Check if email service is configured
        if (!emailService.isConfigured()) {
            logger.warn('Email service not configured, cannot send reset email');
            return res.status(200).json({ success: true, message: successMessage });
        }

        // Create and send reset token
        const resetToken = await createResetToken(user.id);
        await emailService.sendPasswordResetEmail(email, resetToken, user.firstname);

        logger.info('Password reset email sent', { userId: user.id, email });
        res.status(200).json({ success: true, message: successMessage });
    } catch (err) {
        logger.error('Error sending password reset email', err);
        // Still return success to prevent enumeration
        res.status(200).json({
            success: true,
            message: 'If an account exists with this email, a password reset link has been sent'
        });
    }
};

/**
 * Reset password using token from email link
 */
const resetPassword = async (req, res) => {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
        return res.status(400).json({ error: 'Token and new password are required' });
    }

    try {
        // Validate the reset token
        const result = await validateResetToken(token);

        if (!result.valid) {
            return res.status(400).json({ error: result.error });
        }

        // Validate new password strength
        const passwordValidation = validatePassword(newPassword);
        if (!passwordValidation.isValid) {
            return res.status(400).json({
                error: 'Invalid password',
                details: passwordValidation.errors
            });
        }

        // Hash and update password
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await db('users')
            .where({ id: result.userId })
            .update({ password: hashedPassword });

        // Revoke all refresh tokens for security
        await revokeRefreshTokensByUser(result.userId);

        logger.info('Password reset successfully', { userId: result.userId });
        res.status(200).json({ success: true, message: 'Password reset successfully' });
    } catch (err) {
        logger.error('Error resetting password', err);
        res.status(500).json({ error: 'Failed to reset password' });
    }
};

module.exports = {
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
};