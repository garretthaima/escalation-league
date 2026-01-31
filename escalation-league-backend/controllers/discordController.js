const crypto = require('crypto');
const db = require('../models/db');
const logger = require('../utils/logger');

// Discord OAuth configuration
const DISCORD_API_BASE = 'https://discord.com/api/v10';
const DISCORD_CDN_BASE = 'https://cdn.discordapp.com';

/**
 * Get Discord OAuth URL for linking account
 * User must be logged in - this links Discord to their existing account
 */
const getDiscordAuthUrl = async (req, res) => {
    try {
        const clientId = process.env.DISCORD_CLIENT_ID;
        const redirectUri = `${process.env.BACKEND_URL}/api/auth/discord/callback`;

        if (!clientId) {
            logger.error('Discord Client ID not configured');
            return res.status(500).json({ error: 'Discord integration not configured' });
        }

        // Store the user ID in state to link after OAuth completes
        // Use cryptographically secure nonce and HMAC signature for security
        const stateData = {
            userId: req.user.id,
            nonce: crypto.randomBytes(16).toString('hex'),
            timestamp: Date.now()
        };
        const signature = crypto.createHmac('sha256', process.env.JWT_SECRET)
            .update(JSON.stringify(stateData))
            .digest('hex');
        const state = Buffer.from(JSON.stringify({ data: stateData, sig: signature })).toString('base64');

        const params = new URLSearchParams({
            client_id: clientId,
            redirect_uri: redirectUri,
            response_type: 'code',
            scope: 'identify',
            state: state,
        });

        const authUrl = `https://discord.com/api/oauth2/authorize?${params.toString()}`;

        res.json({ url: authUrl });
    } catch (err) {
        logger.error('Error generating Discord auth URL', err);
        res.status(500).json({ error: 'Failed to generate Discord auth URL' });
    }
};

/**
 * Handle Discord OAuth callback
 * This is called by Discord after user authorizes
 */
const discordCallback = async (req, res) => {
    try {
        const { code, state } = req.query;
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3001';

        if (!code) {
            logger.warn('Discord callback missing code');
            return res.redirect(`${frontendUrl}/profile?discord=error&message=missing_code`);
        }

        if (!state) {
            logger.warn('Discord callback missing state');
            return res.redirect(`${frontendUrl}/profile?discord=error&message=missing_state`);
        }

        // Decode and validate state
        let statePayload;
        try {
            statePayload = JSON.parse(Buffer.from(state, 'base64').toString());
        } catch (e) {
            logger.warn('Discord callback invalid state');
            return res.redirect(`${frontendUrl}/profile?discord=error&message=invalid_state`);
        }

        // Verify HMAC signature to prevent state tampering
        const { data: stateData, sig: providedSignature } = statePayload;
        if (!stateData || !providedSignature) {
            logger.warn('Discord callback missing state data or signature');
            return res.redirect(`${frontendUrl}/profile?discord=error&message=invalid_state`);
        }

        const expectedSignature = crypto.createHmac('sha256', process.env.JWT_SECRET)
            .update(JSON.stringify(stateData))
            .digest('hex');

        if (!crypto.timingSafeEqual(Buffer.from(providedSignature), Buffer.from(expectedSignature))) {
            logger.warn('Discord callback state signature mismatch');
            return res.redirect(`${frontendUrl}/profile?discord=error&message=invalid_state`);
        }

        // Check state is not too old (10 minute expiry)
        if (Date.now() - stateData.timestamp > 10 * 60 * 1000) {
            logger.warn('Discord callback state expired');
            return res.redirect(`${frontendUrl}/profile?discord=error&message=expired`);
        }

        const userId = stateData.userId;

        // Exchange code for access token
        const tokenResponse = await fetch(`${DISCORD_API_BASE}/oauth2/token`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                client_id: process.env.DISCORD_CLIENT_ID,
                client_secret: process.env.DISCORD_CLIENT_SECRET,
                grant_type: 'authorization_code',
                code: code,
                redirect_uri: `${process.env.BACKEND_URL}/api/auth/discord/callback`,
            }),
        });

        if (!tokenResponse.ok) {
            const errorText = await tokenResponse.text();
            logger.error('Discord token exchange failed', { status: tokenResponse.status, error: errorText });
            return res.redirect(`${frontendUrl}/profile?discord=error&message=token_failed`);
        }

        const tokenData = await tokenResponse.json();

        // Get user info from Discord
        const userResponse = await fetch(`${DISCORD_API_BASE}/users/@me`, {
            headers: {
                Authorization: `Bearer ${tokenData.access_token}`,
            },
        });

        if (!userResponse.ok) {
            logger.error('Discord user fetch failed');
            return res.redirect(`${frontendUrl}/profile?discord=error&message=user_fetch_failed`);
        }

        const discordUser = await userResponse.json();

        // Check if this Discord account is already linked to another user
        const existingLink = await db('users')
            .where('discord_id', discordUser.id)
            .whereNot('id', userId)
            .first();

        if (existingLink) {
            logger.warn('Discord account already linked to another user', {
                discordId: discordUser.id,
                existingUserId: existingLink.id,
                attemptedUserId: userId
            });
            return res.redirect(`${frontendUrl}/profile?discord=error&message=already_linked`);
        }

        // Link Discord to user account
        await db('users')
            .where('id', userId)
            .update({
                discord_id: discordUser.id,
                discord_username: `${discordUser.username}${discordUser.discriminator !== '0' ? '#' + discordUser.discriminator : ''}`,
                discord_avatar: discordUser.avatar,
            });

        logger.info('Discord account linked successfully', {
            userId,
            discordId: discordUser.id,
            discordUsername: discordUser.username
        });

        res.redirect(`${frontendUrl}/profile?discord=success`);
    } catch (err) {
        logger.error('Error in Discord callback', err);
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3001';
        res.redirect(`${frontendUrl}/profile?discord=error&message=server_error`);
    }
};

/**
 * Unlink Discord from user account
 */
const unlinkDiscord = async (req, res) => {
    try {
        const userId = req.user.id;

        await db('users')
            .where('id', userId)
            .update({
                discord_id: null,
                discord_username: null,
                discord_avatar: null,
            });

        logger.info('Discord account unlinked', { userId });

        res.json({ success: true, message: 'Discord account unlinked successfully' });
    } catch (err) {
        logger.error('Error unlinking Discord', err);
        res.status(500).json({ error: 'Failed to unlink Discord account' });
    }
};

/**
 * Get current user's Discord link status
 */
const getDiscordStatus = async (req, res) => {
    try {
        const userId = req.user.id;

        const user = await db('users')
            .where('id', userId)
            .select('discord_id', 'discord_username', 'discord_avatar')
            .first();

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const linked = !!user.discord_id;

        res.json({
            linked,
            discord_username: user.discord_username,
            discord_avatar: user.discord_avatar ?
                `${DISCORD_CDN_BASE}/avatars/${user.discord_id}/${user.discord_avatar}.png` :
                null,
        });
    } catch (err) {
        logger.error('Error getting Discord status', err);
        res.status(500).json({ error: 'Failed to get Discord status' });
    }
};

module.exports = {
    getDiscordAuthUrl,
    discordCallback,
    unlinkDiscord,
    getDiscordStatus,
};
