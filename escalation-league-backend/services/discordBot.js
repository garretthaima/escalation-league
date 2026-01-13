const { Client, GatewayIntentBits, Partials, Events } = require('discord.js');
const db = require('../models/db');
const { emitAttendanceUpdated } = require('../utils/socketEmitter');

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
    YES_FOOD: '🍕',        // Yes, attending + ordering food
    YES_NO_FOOD: '✅',     // Yes, attending but no food
    NOT_ATTENDING: '❌',   // No, can't attend
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
 * @param {string|null} customMessage - Optional custom message to include in the poll
 * @returns {Promise<Object>} The created message info
 */
const postAttendancePoll = async (sessionId, sessionDate, leagueId, customMessage = null) => {
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

    // Build description with optional custom message
    let description = `**${dateStr}**\n\nReact to let us know if you're coming!`;
    if (customMessage && customMessage.trim()) {
        description = `**${dateStr}**\n\n${customMessage.trim()}\n\nReact to let us know if you're coming!`;
    }

    // Create a rich embed for the poll
    const embed = {
        color: 0x5865F2, // Discord blurple
        title: `Game Night Attendance`,
        description,
        fields: [
            {
                name: 'How to respond',
                value: `${REACTIONS.YES_FOOD} Yes + ordering food\n${REACTIONS.YES_NO_FOOD} Yes, no food\n${REACTIONS.NOT_ATTENDING} Can't make it`,
                inline: false
            },
            {
                name: `${REACTIONS.YES_FOOD} Attending w/ Food (0)`,
                value: '*No one yet*',
                inline: true
            },
            {
                name: `${REACTIONS.YES_NO_FOOD} Attending (0)`,
                value: '*No one yet*',
                inline: true
            },
            {
                name: `${REACTIONS.NOT_ATTENDING} Can't Make It (0)`,
                value: '*None*',
                inline: true
            }
        ],
        footer: {
            text: 'Need 4 more for a pod'
        },
        timestamp: new Date().toISOString()
    };

    const message = await channel.send({ embeds: [embed] });

    // Add the reaction options
    await message.react(REACTIONS.YES_FOOD);
    await message.react(REACTIONS.YES_NO_FOOD);
    await message.react(REACTIONS.NOT_ATTENDING);

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
 * Get an attendance poll by session ID
 * @param {number} sessionId - The session ID
 * @returns {Promise<Object|null>}
 */
const getAttendancePollBySessionId = async (sessionId) => {
    return db('attendance_polls')
        .where('session_id', sessionId)
        .first();
};

/**
 * Update the Discord poll message with current attendance list
 * Shows three columns: those who want food, those who don't, and those who can't make it
 * Also includes admin-checked-in users who may not have reacted on Discord
 * @param {number} sessionId - The session ID
 */
const updatePollMessage = async (sessionId) => {
    if (!client) {
        console.log('[Discord Bot] Bot not initialized, skipping poll update');
        return;
    }

    try {
        const poll = await getAttendancePollBySessionId(sessionId);
        if (!poll) {
            console.log(`[Discord Bot] No poll found for session ${sessionId}`);
            return;
        }

        // Get the session date
        const session = await db('game_sessions').where('id', sessionId).first();
        if (!session) return;

        const dateStr = new Date(session.session_date).toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
            timeZone: 'UTC',
        });

        // Fetch the Discord message to get reaction data
        const channel = await client.channels.fetch(poll.discord_channel_id);
        const message = await channel.messages.fetch(poll.discord_message_id);

        // Get users who reacted with each emoji
        const foodReaction = message.reactions.cache.get(REACTIONS.YES_FOOD);
        const noFoodReaction = message.reactions.cache.get(REACTIONS.YES_NO_FOOD);
        const notAttendingReaction = message.reactions.cache.get(REACTIONS.NOT_ATTENDING);

        // Fetch users for each reaction (excluding bot)
        let foodUsers = [];
        let noFoodUsers = [];
        let notAttendingUsers = [];
        let foodDiscordIds = [];
        let noFoodDiscordIds = [];

        if (foodReaction) {
            const users = await foodReaction.users.fetch();
            foodUsers = users.filter(u => !u.bot).map(u => `<@${u.id}>`);
            foodDiscordIds = users.filter(u => !u.bot).map(u => u.id);
        }

        if (noFoodReaction) {
            const users = await noFoodReaction.users.fetch();
            noFoodUsers = users.filter(u => !u.bot).map(u => `<@${u.id}>`);
            noFoodDiscordIds = users.filter(u => !u.bot).map(u => u.id);
        }

        if (notAttendingReaction) {
            const users = await notAttendingReaction.users.fetch();
            notAttendingUsers = users.filter(u => !u.bot).map(u => `<@${u.id}>`);
        }

        // Get admin-checked-in users who haven't reacted on Discord
        // These are users with is_active=true and updated_via='admin' or 'web'
        const adminCheckedIn = await db('session_attendance as sa')
            .join('users as u', 'sa.user_id', 'u.id')
            .where('sa.session_id', sessionId)
            .where('sa.is_active', true)
            .whereIn('sa.updated_via', ['admin', 'web'])
            .select('u.discord_id', 'u.firstname', 'u.lastname');

        // Add admin-checked-in users to noFoodUsers if they don't already have a reaction
        for (const user of adminCheckedIn) {
            if (user.discord_id) {
                // User has Discord linked - check if they already reacted
                if (!foodDiscordIds.includes(user.discord_id) && !noFoodDiscordIds.includes(user.discord_id)) {
                    // They're checked in but haven't reacted - add to no-food list
                    noFoodUsers.push(`<@${user.discord_id}>`);
                }
            } else {
                // User doesn't have Discord linked - show their name instead
                noFoodUsers.push(`${user.firstname} ${user.lastname} *(manual)*`);
            }
        }

        const totalAttending = foodUsers.length + noFoodUsers.length;

        // Determine embed color based on attendance
        let embedColor = 0x5865F2; // Discord blurple (default)
        if (totalAttending >= 4) {
            embedColor = 0x57F287; // Green - enough for a pod!
        } else if (totalAttending > 0) {
            embedColor = 0xFEE75C; // Yellow - some people
        }

        // Build the updated embed
        const embed = {
            color: embedColor,
            title: `Game Night Attendance`,
            description: `**${dateStr}**\n\nReact to let us know if you're coming!`,
            fields: [
                {
                    name: 'How to respond',
                    value: `${REACTIONS.YES_FOOD} Yes + ordering food\n${REACTIONS.YES_NO_FOOD} Yes, no food\n${REACTIONS.NOT_ATTENDING} Can't make it`,
                    inline: false
                },
                {
                    name: `${REACTIONS.YES_FOOD} Attending w/ Food (${foodUsers.length})`,
                    value: foodUsers.length > 0 ? foodUsers.join('\n') : '*No one yet*',
                    inline: true
                },
                {
                    name: `${REACTIONS.YES_NO_FOOD} Attending (${noFoodUsers.length})`,
                    value: noFoodUsers.length > 0 ? noFoodUsers.join('\n') : '*No one yet*',
                    inline: true
                },
                {
                    name: `${REACTIONS.NOT_ATTENDING} Can't Make It (${notAttendingUsers.length})`,
                    value: notAttendingUsers.length > 0 ? notAttendingUsers.join('\n') : '*None*',
                    inline: true
                }
            ],
            footer: {
                text: totalAttending >= 4
                    ? `We have enough for a pod!`
                    : `Need ${4 - totalAttending} more for a pod`
            },
            timestamp: new Date().toISOString()
        };

        await message.edit({ embeds: [embed] });

        console.log(`[Discord Bot] Updated poll message for session ${sessionId} with ${totalAttending} attendees (${foodUsers.length} food, ${noFoodUsers.length} no food, ${notAttendingUsers.length} can't make it)`);
    } catch (error) {
        console.error('[Discord Bot] Error updating poll message:', error);
    }
};

/**
 * Handle an attendance reaction (add or remove)
 * Both YES_FOOD (🍕) and YES_NO_FOOD (✅) count as check-in
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

    // Both YES_FOOD and YES_NO_FOOD count as attending
    const isAttendingReaction = emoji === REACTIONS.YES_FOOD || emoji === REACTIONS.YES_NO_FOOD;
    const isNotAttendingReaction = emoji === REACTIONS.NOT_ATTENDING;

    // Handle NOT_ATTENDING reaction - this should check out the user if they were checked in
    if (isNotAttendingReaction) {
        if (isAdd) {
            // User clicked "Can't make it" - check them out if they were checked in
            const existing = await db('session_attendance')
                .where({
                    session_id: poll.session_id,
                    user_id: appUser.id,
                    is_active: true
                })
                .first();

            if (existing) {
                await db('session_attendance')
                    .where({ id: existing.id })
                    .update({
                        is_active: false,
                        checked_out_at: db.fn.now(),
                        updated_via: 'discord',
                    });
                console.log(`[Discord Bot] User ${appUser.firstname} ${appUser.lastname} checked out via "Can't make it" for session ${poll.session_id}`);
            } else {
                // User clicked "Can't make it" without being checked in first
                // Create a record with is_active: false so they appear in "Can't Make It"
                await db('session_attendance').insert({
                    session_id: poll.session_id,
                    user_id: appUser.id,
                    is_active: false,
                    checked_out_at: db.fn.now(),
                    updated_via: 'discord',
                });
                console.log(`[Discord Bot] User ${appUser.firstname} ${appUser.lastname} marked "Can't make it" for session ${poll.session_id}`);
            }

            // Emit WebSocket event
            emitAttendanceUpdated(poll.session_id, poll.league_id, {
                action: 'check_out',
                user: {
                    id: appUser.id,
                    firstname: appUser.firstname,
                    lastname: appUser.lastname
                },
                source: 'discord'
            });
        } else {
            // User removed the "Can't make it" reaction - delete their record
            // This returns them to "no response" state
            const deleted = await db('session_attendance')
                .where({
                    session_id: poll.session_id,
                    user_id: appUser.id,
                    is_active: false
                })
                .del();

            if (deleted) {
                console.log(`[Discord Bot] User ${appUser.firstname} ${appUser.lastname} removed "Can't make it" (no response) for session ${poll.session_id}`);

                // Emit WebSocket event
                emitAttendanceUpdated(poll.session_id, poll.league_id, {
                    action: 'removed',
                    user: {
                        id: appUser.id,
                        firstname: appUser.firstname,
                        lastname: appUser.lastname
                    },
                    source: 'discord'
                });
            }
        }
        await updatePollMessage(poll.session_id);
        return;
    }

    if (isAdd) {
        // Check in: upsert attendance record with is_active = true
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
                    is_active: true,
                    checked_out_at: null,
                    updated_via: 'discord',
                });
        } else {
            await db('session_attendance').insert({
                session_id: poll.session_id,
                user_id: appUser.id,
                is_active: true,
                checked_in_at: db.fn.now(),
                updated_via: 'discord',
            });
        }

        const foodLabel = emoji === REACTIONS.YES_FOOD ? ' (with food)' : ' (no food)';
        console.log(`[Discord Bot] User ${appUser.firstname} ${appUser.lastname} checked in via Discord${foodLabel} for session ${poll.session_id}`);

        // Update the poll message to show the new attendee
        await updatePollMessage(poll.session_id);

        // Emit WebSocket event for real-time frontend updates
        emitAttendanceUpdated(poll.session_id, poll.league_id, {
            action: 'check_in',
            user: {
                id: appUser.id,
                firstname: appUser.firstname,
                lastname: appUser.lastname
            },
            source: 'discord'
        });
    } else {
        // User removed their attending reaction
        // Only check them out if they don't have the OTHER attending reaction
        const message = reaction.message;
        const otherEmoji = emoji === REACTIONS.YES_FOOD ? REACTIONS.YES_NO_FOOD : REACTIONS.YES_FOOD;
        const otherReaction = message.reactions.cache.get(otherEmoji);

        let hasOtherReaction = false;
        if (otherReaction) {
            const otherUsers = await otherReaction.users.fetch();
            hasOtherReaction = otherUsers.has(user.id);
        }

        if (hasOtherReaction) {
            // User still has the other attending reaction, just update the poll display
            console.log(`[Discord Bot] User ${appUser.firstname} ${appUser.lastname} switched food preference for session ${poll.session_id}`);
            await updatePollMessage(poll.session_id);
            return;
        }

        // User removed their only attending reaction - delete their attendance record
        // This returns them to "no response" state (not "Can't Make It")
        // "Can't Make It" is only for users who explicitly click the X reaction
        const deleted = await db('session_attendance')
            .where({
                session_id: poll.session_id,
                user_id: appUser.id,
            })
            .del();

        if (deleted) {
            console.log(`[Discord Bot] User ${appUser.firstname} ${appUser.lastname} removed attendance (no response) for session ${poll.session_id}`);

            // Update the poll message to remove the attendee
            await updatePollMessage(poll.session_id);

            // Emit WebSocket event for real-time frontend updates
            emitAttendanceUpdated(poll.session_id, poll.league_id, {
                action: 'removed',
                user: {
                    id: appUser.id,
                    firstname: appUser.firstname,
                    lastname: appUser.lastname
                },
                source: 'discord'
            });
        }
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

/**
 * Close a poll - edits the Discord message to show it's closed
 * @param {number} sessionId - The session ID
 */
const closePoll = async (sessionId) => {
    if (!client) {
        console.log('[Discord Bot] Bot not initialized, skipping poll close');
        return;
    }

    try {
        const poll = await getAttendancePollBySessionId(sessionId);
        if (!poll) {
            console.log(`[Discord Bot] No poll found for session ${sessionId}`);
            return;
        }

        // Get the session date for display
        const session = await db('game_sessions').where('id', sessionId).first();
        const dateStr = session ? new Date(session.session_date).toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
            timeZone: 'UTC',
        }) : 'Game Night';

        // Fetch the Discord message
        const channel = await client.channels.fetch(poll.discord_channel_id);
        const message = await channel.messages.fetch(poll.discord_message_id);

        // Get final attendance counts from reactions
        const foodReaction = message.reactions.cache.get(REACTIONS.YES_FOOD);
        const noFoodReaction = message.reactions.cache.get(REACTIONS.YES_NO_FOOD);
        const notAttendingReaction = message.reactions.cache.get(REACTIONS.NOT_ATTENDING);

        let foodUsers = [];
        let noFoodUsers = [];
        let notAttendingUsers = [];

        if (foodReaction) {
            const users = await foodReaction.users.fetch();
            foodUsers = users.filter(u => !u.bot).map(u => `<@${u.id}>`);
        }

        if (noFoodReaction) {
            const users = await noFoodReaction.users.fetch();
            noFoodUsers = users.filter(u => !u.bot).map(u => `<@${u.id}>`);
        }

        if (notAttendingReaction) {
            const users = await notAttendingReaction.users.fetch();
            notAttendingUsers = users.filter(u => !u.bot).map(u => `<@${u.id}>`);
        }

        const totalAttending = foodUsers.length + noFoodUsers.length;

        // Edit the message to show it's closed
        const embed = {
            color: 0x95A5A6, // Gray - closed
            title: `Game Night Attendance (Closed)`,
            description: `**${dateStr}**\n\n~~React to let us know if you're coming!~~\n\n**This poll is now closed.**`,
            fields: [
                {
                    name: `${REACTIONS.YES_FOOD} Attended w/ Food (${foodUsers.length})`,
                    value: foodUsers.length > 0 ? foodUsers.join('\n') : '*None*',
                    inline: true
                },
                {
                    name: `${REACTIONS.YES_NO_FOOD} Attended (${noFoodUsers.length})`,
                    value: noFoodUsers.length > 0 ? noFoodUsers.join('\n') : '*None*',
                    inline: true
                },
                {
                    name: `${REACTIONS.NOT_ATTENDING} Couldn't Make It (${notAttendingUsers.length})`,
                    value: notAttendingUsers.length > 0 ? notAttendingUsers.join('\n') : '*None*',
                    inline: true
                }
            ],
            footer: {
                text: `Final count: ${totalAttending} attendees`
            },
            timestamp: new Date().toISOString()
        };

        await message.edit({ embeds: [embed] });

        // Remove reaction options so people can't react anymore
        await message.reactions.removeAll();

        console.log(`[Discord Bot] Closed poll for session ${sessionId}`);
    } catch (error) {
        console.error('[Discord Bot] Error closing poll:', error);
        throw error;
    }
};

module.exports = {
    startBot,
    stopBot,
    getClient,
    postAttendancePoll,
    updatePollMessage,
    sendAttendanceMessage,
    linkDiscordUser,
    unlinkDiscordUser,
    closePoll,
    REACTIONS,
};
