#!/usr/bin/env node
/**
 * Test script to verify Discord bot connection
 * Usage: node scripts/testDiscordBot.js
 *
 * Make sure DISCORD_BOT_TOKEN is set in your environment or .env file
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env.dev') });

const { Client, GatewayIntentBits, Events } = require('discord.js');

const token = process.env.DISCORD_BOT_TOKEN;
const guildId = process.env.DISCORD_GUILD_ID;
const channelId = process.env.DISCORD_ATTENDANCE_CHANNEL_ID;

console.log('Discord Bot Connection Test');
console.log('===========================\n');

if (!token || token === 'your-bot-token-here') {
    console.error('ERROR: DISCORD_BOT_TOKEN is not set!');
    console.log('\nTo set up your bot:');
    console.log('1. Go to https://discord.com/developers/applications');
    console.log('2. Create a new application or select existing one');
    console.log('3. Go to Bot section and copy the token');
    console.log('4. Add it to .env.dev as DISCORD_BOT_TOKEN=your-token-here');
    process.exit(1);
}

console.log(`Guild ID: ${guildId}`);
console.log(`Channel ID: ${channelId}`);
console.log(`Token: ${token.substring(0, 10)}...${token.substring(token.length - 5)}\n`);

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.MessageContent,
    ],
});

client.once(Events.ClientReady, async (readyClient) => {
    console.log(`SUCCESS! Logged in as ${readyClient.user.tag}`);
    console.log(`Bot ID: ${readyClient.user.id}\n`);

    // Try to fetch the guild
    try {
        const guild = await client.guilds.fetch(guildId);
        console.log(`Found guild: ${guild.name}`);
        console.log(`Member count: ${guild.memberCount}`);
    } catch (error) {
        console.error(`ERROR: Could not fetch guild ${guildId}`);
        console.log('Make sure the bot has been invited to your server.');
        console.log('\nTo invite the bot:');
        console.log('1. Go to OAuth2 > URL Generator in Discord Developer Portal');
        console.log('2. Select "bot" scope and required permissions');
        console.log('3. Use the generated URL to invite the bot');
    }

    // Try to fetch the channel
    try {
        const channel = await client.channels.fetch(channelId);
        console.log(`\nFound channel: #${channel.name}`);
        console.log(`Channel type: ${channel.type}`);

        // Send a test message
        const testMsg = await channel.send('Bot connection test successful! This message will be deleted in 5 seconds.');
        console.log('\nTest message sent successfully!');

        // Delete the test message after 5 seconds
        setTimeout(async () => {
            await testMsg.delete();
            console.log('Test message deleted.');
            console.log('\n All tests passed! Bot is ready to use.');
            client.destroy();
            process.exit(0);
        }, 5000);

    } catch (error) {
        console.error(`\nERROR: Could not fetch channel ${channelId}`);
        console.error(error.message);
        console.log('\nMake sure:');
        console.log('1. The channel ID is correct');
        console.log('2. The bot has access to view and send messages in that channel');
        client.destroy();
        process.exit(1);
    }
});

client.on(Events.Error, (error) => {
    console.error('Client error:', error);
});

console.log('Connecting to Discord...\n');

client.login(token).catch((error) => {
    console.error('ERROR: Failed to login!');
    console.error(error.message);
    console.log('\nCommon issues:');
    console.log('- Invalid token (regenerate in Discord Developer Portal)');
    console.log('- Bot not enabled in the application');
    console.log('- Missing intents (enable in Bot settings)');
    process.exit(1);
});
