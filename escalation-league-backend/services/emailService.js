/**
 * Email Service
 * Centralized, extensible service for sending emails using Resend
 *
 * Designed for extensibility - can be used for:
 * - Email verification
 * - Password reset
 * - Pod waiting confirmation
 * - Tournament starting alerts
 * - League announcements
 * - Any future email needs
 */

const { Resend } = require('resend');
const logger = require('../utils/logger');

// Lazy-loaded client
let resendClient = null;

/**
 * Get or create the Resend client instance
 * @returns {Resend} Resend client
 */
const getClient = () => {
    if (!resendClient) {
        const apiKey = process.env.RESEND_API_KEY;
        if (!apiKey) {
            throw new Error('RESEND_API_KEY environment variable is not configured');
        }
        resendClient = new Resend(apiKey);
    }
    return resendClient;
};

/**
 * Get the sender email address
 * @returns {string} From email address
 */
const getFromEmail = () => {
    return process.env.FROM_EMAIL || 'Escalation League <noreply@escalationleague.com>';
};

/**
 * Get the frontend URL for building links
 * @returns {string} Frontend URL
 */
const getFrontendUrl = () => {
    return process.env.FRONTEND_URL || 'http://localhost:3001';
};

// ============================================================================
// Generic Email Sending
// ============================================================================

/**
 * Send an email using Resend
 * @param {object} options - Email options
 * @param {string|string[]} options.to - Recipient email address(es)
 * @param {string} options.subject - Email subject
 * @param {string} options.html - HTML content
 * @param {string} [options.text] - Plain text content (optional)
 * @returns {Promise<object>} Resend API response
 */
const sendEmail = async ({ to, subject, html, text }) => {
    try {
        const client = getClient();
        const response = await client.emails.send({
            from: getFromEmail(),
            to: Array.isArray(to) ? to : [to],
            subject,
            html,
            text: text || html.replace(/<[^>]*>/g, '') // Strip HTML for plain text fallback
        });

        logger.info(`Email sent successfully to ${Array.isArray(to) ? to.join(', ') : to}`);
        return response;
    } catch (error) {
        logger.error(`Failed to send email: ${error.message}`);
        throw error;
    }
};

// ============================================================================
// Email Templates
// ============================================================================

/**
 * Generate base HTML wrapper for emails
 * @param {string} content - Inner HTML content
 * @returns {string} Full HTML email
 */
const wrapEmailTemplate = (content) => `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f5f5f5;
        }
        .container {
            background: white;
            border-radius: 8px;
            padding: 32px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .logo {
            text-align: center;
            margin-bottom: 24px;
        }
        .logo img {
            width: 64px;
            height: 64px;
        }
        h1 {
            color: #2d1b4e;
            font-size: 24px;
            margin-bottom: 16px;
        }
        .button {
            display: inline-block;
            background: #2d1b4e;
            color: white !important;
            text-decoration: none;
            padding: 12px 24px;
            border-radius: 6px;
            font-weight: 500;
            margin: 16px 0;
        }
        .button:hover {
            background: #4a2f70;
        }
        .footer {
            margin-top: 32px;
            padding-top: 16px;
            border-top: 1px solid #eee;
            font-size: 12px;
            color: #666;
            text-align: center;
        }
        .note {
            font-size: 14px;
            color: #666;
            margin-top: 16px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="logo">
            <img src="${getFrontendUrl()}/logo.png" alt="Escalation League" />
        </div>
        ${content}
        <div class="footer">
            <p>Escalation League - MTG Commander League Management</p>
            <p>This email was sent automatically. Please do not reply.</p>
        </div>
    </div>
</body>
</html>
`;

// ============================================================================
// Specific Email Types - Authentication
// ============================================================================

/**
 * Send email verification email
 * @param {string} email - Recipient email
 * @param {string} token - Verification token
 * @param {string} firstname - User's first name
 * @returns {Promise<object>} Resend API response
 */
const sendVerificationEmail = async (email, token, firstname) => {
    const verifyUrl = `${getFrontendUrl()}/verify-email?token=${token}`;

    const html = wrapEmailTemplate(`
        <h1>Verify Your Email</h1>
        <p>Hi ${firstname || 'there'},</p>
        <p>Thanks for signing up for Escalation League! Please verify your email address by clicking the button below:</p>
        <p style="text-align: center;">
            <a href="${verifyUrl}" class="button">Verify Email Address</a>
        </p>
        <p class="note">If you didn't create an account, you can safely ignore this email.</p>
        <p class="note">This link will expire in 24 hours.</p>
        <p class="note">If the button doesn't work, copy and paste this link into your browser:<br>
        <small>${verifyUrl}</small></p>
    `);

    return sendEmail({
        to: email,
        subject: 'Verify your email - Escalation League',
        html
    });
};

/**
 * Send password reset email
 * @param {string} email - Recipient email
 * @param {string} token - Reset token
 * @param {string} firstname - User's first name
 * @returns {Promise<object>} Resend API response
 */
const sendPasswordResetEmail = async (email, token, firstname) => {
    const resetUrl = `${getFrontendUrl()}/reset-password?token=${token}`;

    const html = wrapEmailTemplate(`
        <h1>Reset Your Password</h1>
        <p>Hi ${firstname || 'there'},</p>
        <p>We received a request to reset your password. Click the button below to choose a new password:</p>
        <p style="text-align: center;">
            <a href="${resetUrl}" class="button">Reset Password</a>
        </p>
        <p class="note">If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.</p>
        <p class="note">This link will expire in 1 hour.</p>
        <p class="note">If the button doesn't work, copy and paste this link into your browser:<br>
        <small>${resetUrl}</small></p>
    `);

    return sendEmail({
        to: email,
        subject: 'Reset your password - Escalation League',
        html
    });
};

// ============================================================================
// Specific Email Types - League & Pod Notifications (Future Use)
// ============================================================================

/**
 * Send pod confirmation reminder
 * @param {string} email - Recipient email
 * @param {string} firstname - User's first name
 * @param {number} podId - Pod ID
 * @param {string[]} playerNames - Other players in the pod
 * @returns {Promise<object>} Resend API response
 */
const sendPodConfirmationEmail = async (email, firstname, podId, playerNames) => {
    const podUrl = `${getFrontendUrl()}/pods?podId=${podId}`;

    const html = wrapEmailTemplate(`
        <h1>Your Pod is Ready!</h1>
        <p>Hi ${firstname || 'there'},</p>
        <p>Great news! You've been assigned to Pod #${podId} with:</p>
        <ul>
            ${playerNames.map(name => `<li>${name}</li>`).join('')}
        </ul>
        <p>Head over to the app to coordinate your game:</p>
        <p style="text-align: center;">
            <a href="${podUrl}" class="button">View Pod</a>
        </p>
    `);

    return sendEmail({
        to: email,
        subject: `You're in Pod #${podId} - Escalation League`,
        html
    });
};

/**
 * Send tournament starting notification
 * @param {string} email - Recipient email
 * @param {string} firstname - User's first name
 * @param {string} tournamentName - Tournament name
 * @param {Date} startTime - Tournament start time
 * @returns {Promise<object>} Resend API response
 */
const sendTournamentStartingEmail = async (email, firstname, tournamentName, startTime) => {
    const dashboardUrl = `${getFrontendUrl()}/dashboard`;

    const html = wrapEmailTemplate(`
        <h1>Tournament Starting Soon!</h1>
        <p>Hi ${firstname || 'there'},</p>
        <p>The <strong>${tournamentName}</strong> tournament is starting soon!</p>
        <p>Start time: ${startTime.toLocaleString()}</p>
        <p style="text-align: center;">
            <a href="${dashboardUrl}" class="button">Go to Dashboard</a>
        </p>
    `);

    return sendEmail({
        to: email,
        subject: `${tournamentName} starting soon! - Escalation League`,
        html
    });
};

/**
 * Send league announcement email
 * @param {string[]} emails - Recipient emails
 * @param {string} leagueName - League name
 * @param {string} subject - Announcement subject
 * @param {string} message - Announcement message (can include basic HTML)
 * @returns {Promise<object>} Resend API response
 */
const sendLeagueAnnouncementEmail = async (emails, leagueName, subject, message) => {
    const html = wrapEmailTemplate(`
        <h1>${leagueName} Announcement</h1>
        <div>${message}</div>
    `);

    return sendEmail({
        to: emails,
        subject: `${subject} - ${leagueName}`,
        html
    });
};

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Check if email service is configured
 * @returns {boolean} True if RESEND_API_KEY is set
 */
const isConfigured = () => {
    return !!process.env.RESEND_API_KEY;
};

module.exports = {
    // Generic
    sendEmail,
    isConfigured,

    // Authentication
    sendVerificationEmail,
    sendPasswordResetEmail,

    // League & Pod (Future)
    sendPodConfirmationEmail,
    sendTournamentStartingEmail,
    sendLeagueAnnouncementEmail
};
