const { Client, GatewayIntentBits, Partials, Events } = require('discord.js');
const db = require('../models/db');

// Discord client instance
let client = null;

// Configuration
const config = {
    token: process.env.DISCORD_BOT_TOKEN,
    guildId: process.env.DISCORD_GUILD_ID,
    attendanceChannelId: process.env.DISCORD_ATTENDANCE_CHANNEL_ID,
};

// Reaction emojis for attendance
const REACTIONS = {
    ATTENDING: '✅',
    NOT_ATTENDING: '❌',
    MAYBE: '❓',
};

/**
 * Initialize and start the Discord bot
 * @returns {Promise<Client>} The Discord client instance
 */
const startBot = async () => {
    if (!config.token || config.token === 'your-bot-token-here') {
        console.log('[Discord Bot] No valid bot token configured, skipping Discord integration');
        return null;
    }

    client = new Client({
        intents: [
            GatewayIntentBits.Guilds,
            GatewayIntentBits.GuildMessages,
            GatewayIntentBits.GuildMessageReactions,
            GatewayIntentBits.MessageContent,
        ],
        partials: [
            Partials.Message,
            Partials.Reaction,
            Partials.User,
        ],
    });

    // Bot ready event
    client.once(Events.ClientReady, (readyClient) => {
        console.log(`[Discord Bot] Logged in as ${readyClient.user.tag}`);
        console.log(`[Discord Bot] Guild ID: ${config.guildId}`);
        console.log(`[Discord Bot] Attendance Channel ID: ${config.attendanceChannelId}`);
    });

    // Handle reaction additions
    client.on(Events.MessageReactionAdd, async (reaction, user) => {
        if (user.bot) return;

        try {
            // Fetch partial reaction/message if needed
            if (reaction.partial) {
                await reaction.fetch();
            }

            // Only process reactions in the attendance channel
            if (reaction.message.channelId !== config.attendanceChannelId) return;

            // Check if this message is an attendance poll (we'll store poll message IDs in DB)
            const poll = await getAttendancePollByMessageId(reaction.message.id);
            if (!poll) return;

            await handleAttendanceReaction(reaction, user, poll, true);
        } catch (error) {
            console.error('[Discord Bot] Error handling reaction add:', error);
        }
    });

    // Handle reaction removals
    client.on(Events.MessageReactionRemove, async (reaction, user) => {
        if (user.bot) return;

        try {
            if (reaction.partial) {
                await reaction.fetch();
            }

            if (reaction.message.channelId !== config.attendanceChannelId) return;

            const poll = await getAttendancePollByMessageId(reaction.message.id);
            if (!poll) return;

            await handleAttendanceReaction(reaction, user, poll, false);
        } catch (error) {
            console.error('[Discord Bot] Error handling reaction remove:', error);
        }
    });

    // Error handling
    client.on(Events.Error, (error) => {
        console.error('[Discord Bot] Client error:', error);
    });

    // Login
    await client.login(config.token);
    return client;
};

/**
 * Stop the Discord bot
 */
const stopBot = async () => {
    if (client) {
        await client.destroy();
        client = null;
        console.log('[Discord Bot] Bot disconnected');
    }
};

/**
 * Get the Discord client instance
 * @returns {Client|null}
 */
const getClient = () => client;

/**
 * Post an attendance poll to the configured channel
 * @param {number} sessionId - The attendance session ID
 * @param {string} sessionDate - The date of the game night
 * @param {number} leagueId - The league ID
 * @returns {Promise<Object>} The created message info
 */
const postAttendancePoll = async (sessionId, sessionDate, leagueId) => {
    if (!client) {
        throw new Error('Discord bot is not initialized');
    }

    const channel = await client.channels.fetch(config.attendanceChannelId);
    if (!channel) {
        throw new Error('Attendance channel not found');
    }

    const dateStr = new Date(sessionDate).toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        timeZone: 'UTC',
    });

    const message = await channel.send({
        content: `**Game Night Attendance - ${dateStr}**\n\nReact to let us know if you're coming!\n\n${REACTIONS.ATTENDING} = I'm in!\n${REACTIONS.NOT_ATTENDING} = Can't make it\n${REACTIONS.MAYBE} = Maybe`,
    });

    // Add the reaction options
    await message.react(REACTIONS.ATTENDING);
    await message.react(REACTIONS.NOT_ATTENDING);
    await message.react(REACTIONS.MAYBE);

    // Store the poll message ID in the database
    await db('attendance_polls').insert({
        session_id: sessionId,
        league_id: leagueId,
        discord_message_id: message.id,
        discord_channel_id: channel.id,
        created_at: db.fn.now(),
    });

    console.log(`[Discord Bot] Posted attendance poll for session ${sessionId}, message ID: ${message.id}`);

    return {
        messageId: message.id,
        channelId: channel.id,
    };
};

/**
 * Get an attendance poll by Discord message ID
 * @param {string} messageId - The Discord message ID
 * @returns {Promise<Object|null>}
 */
const getAttendancePollByMessageId = async (messageId) => {
    return db('attendance_polls')
        .where('discord_message_id', messageId)
        .first();
};

/**
 * Handle an attendance reaction (add or remove)
 * @param {MessageReaction} reaction - The reaction object
 * @param {User} user - The Discord user
 * @param {Object} poll - The poll record from database
 * @param {boolean} isAdd - Whether this is an add (true) or remove (false)
 */
const handleAttendanceReaction = async (reaction, user, poll, isAdd) => {
    const emoji = reaction.emoji.name;

    // Map the Discord user to our app user
    const appUser = await db('users')
        .where('discord_id', user.id)
        .first();

    if (!appUser) {
        console.log(`[Discord Bot] Unknown Discord user ${user.tag} (${user.id}) reacted - not linked to app account`);
        return;
    }

    // Determine the attendance status based on the emoji
    let status = null;
    if (emoji === REACTIONS.ATTENDING) {
        status = isAdd ? 'checked_in' : null;
    } else if (emoji === REACTIONS.NOT_ATTENDING) {
        status = isAdd ? 'not_attending' : null;
    } else if (emoji === REACTIONS.MAYBE) {
        status = isAdd ? 'maybe' : null;
    } else {
        return; // Ignore other reactions
    }

    if (isAdd && status) {
        // Upsert attendance record
        const existing = await db('session_attendance')
            .where({
                session_id: poll.session_id,
                user_id: appUser.id,
            })
            .first();

        if (existing) {
            await db('session_attendance')
                .where({ id: existing.id })
                .update({
                    status,
                    updated_at: db.fn.now(),
                    updated_via: 'discord',
                });
        } else {
            await db('session_attendance').insert({
                session_id: poll.session_id,
                user_id: appUser.id,
                status,
                created_at: db.fn.now(),
                updated_via: 'discord',
            });
        }

        console.log(`[Discord Bot] User ${appUser.firstname} ${appUser.lastname} marked as ${status} for session ${poll.session_id}`);
    } else if (!isAdd) {
        // User removed their reaction - could clear their status or leave it
        // For now, we'll leave their status as-is (they can re-react to change)
        console.log(`[Discord Bot] User ${appUser.firstname} ${appUser.lastname} removed ${emoji} reaction for session ${poll.session_id}`);
    }
};

/**
 * Send a message to the attendance channel
 * @param {string} content - The message content
 * @returns {Promise<Message>}
 */
const sendAttendanceMessage = async (content) => {
    if (!client) {
        throw new Error('Discord bot is not initialized');
    }

    const channel = await client.channels.fetch(config.attendanceChannelId);
    return channel.send({ content });
};

/**
 * Link a Discord user ID to an app user
 * @param {number} userId - The app user ID
 * @param {string} discordId - The Discord user ID
 */
const linkDiscordUser = async (userId, discordId) => {
    await db('users')
        .where('id', userId)
        .update({ discord_id: discordId });
};

/**
 * Unlink a Discord user from an app user
 * @param {number} userId - The app user ID
 */
const unlinkDiscordUser = async (userId) => {
    await db('users')
        .where('id', userId)
        .update({ discord_id: null });
};

module.exports = {
    startBot,
    stopBot,
    getClient,
    postAttendancePoll,
    sendAttendanceMessage,
    linkDiscordUser,
    unlinkDiscordUser,
    REACTIONS,
};
