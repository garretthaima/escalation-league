const db = require('../helpers/testDb');

// Mock dependencies before requiring the module
jest.mock('../../models/db', () => require('../helpers/testDb'));
jest.mock('../../utils/socketEmitter', () => ({
    emitAttendanceUpdated: jest.fn(),
}));

// Mock discord.js
const mockClient = {
    once: jest.fn(),
    on: jest.fn(),
    login: jest.fn().mockResolvedValue(true),
    destroy: jest.fn().mockResolvedValue(true),
    channels: {
        fetch: jest.fn(),
    },
};

jest.mock('discord.js', () => ({
    Client: jest.fn().mockImplementation(() => mockClient),
    GatewayIntentBits: {
        Guilds: 1,
        GuildMessages: 2,
        GuildMessageReactions: 4,
        GuildMembers: 8,
        MessageContent: 16,
    },
    Partials: {
        Message: 0,
        Reaction: 1,
        User: 2,
    },
    Events: {
        ClientReady: 'ready',
        MessageReactionAdd: 'messageReactionAdd',
        MessageReactionRemove: 'messageReactionRemove',
        Error: 'error',
    },
}));

const discordBot = require('../../services/discordBot');

describe('discordBot', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    afterEach(async () => {
        await db('attendance_polls').del();
        await db('session_attendance').del();
        await db('game_sessions').del();
        await db('game_players').del();
        await db('game_pods').del();
        await db('users').del();
        await db('leagues').del();
    });

    describe('REACTIONS constant', () => {
        it('should export reaction emojis', () => {
            expect(discordBot.REACTIONS).toEqual({
                YES_FOOD: '🍕',
                YES_NO_FOOD: '✅',
                NOT_ATTENDING: '❌',
            });
        });
    });

    describe('startBot', () => {
        // Note: Token is read from env at module load time, so we test what we can
        it('should initialize client with correct intents when token exists', async () => {
            // Bot reads token at module load time from env, which has a valid token
            await discordBot.startBot();

            const { Client } = require('discord.js');
            expect(Client).toHaveBeenCalledWith(
                expect.objectContaining({
                    intents: expect.any(Array),
                    partials: expect.any(Array),
                })
            );
        });

        it('should register event handlers', async () => {
            await discordBot.startBot();

            expect(mockClient.once).toHaveBeenCalledWith('ready', expect.any(Function));
            expect(mockClient.on).toHaveBeenCalledWith('messageReactionAdd', expect.any(Function));
            expect(mockClient.on).toHaveBeenCalledWith('messageReactionRemove', expect.any(Function));
            expect(mockClient.on).toHaveBeenCalledWith('error', expect.any(Function));
        });

        it('should call login', async () => {
            await discordBot.startBot();

            expect(mockClient.login).toHaveBeenCalled();
        });
    });

    describe('stopBot', () => {
        it('should destroy client when started', async () => {
            await discordBot.startBot();

            await discordBot.stopBot();

            expect(mockClient.destroy).toHaveBeenCalled();
        });
    });

    describe('getClient', () => {
        it('should return the client instance after starting', async () => {
            await discordBot.startBot();

            const client = discordBot.getClient();
            expect(client).toBeDefined();
        });
    });

    describe('linkDiscordUser', () => {
        it('should update user with discord_id', async () => {
            const [userId] = await db('users').insert({
                email: 'test@test.com',
                password: 'hash',
                firstname: 'Test',
                lastname: 'User',
                role_id: 1,
            });

            await discordBot.linkDiscordUser(userId, 'discord-123');

            const user = await db('users').where('id', userId).first();
            expect(user.discord_id).toBe('discord-123');
        });
    });

    describe('unlinkDiscordUser', () => {
        it('should set discord_id to null', async () => {
            const [userId] = await db('users').insert({
                email: 'test@test.com',
                password: 'hash',
                firstname: 'Test',
                lastname: 'User',
                role_id: 1,
                discord_id: 'discord-123',
            });

            await discordBot.unlinkDiscordUser(userId);

            const user = await db('users').where('id', userId).first();
            expect(user.discord_id).toBeNull();
        });
    });

    describe('closePoll', () => {
        it('should handle missing poll gracefully', async () => {
            await discordBot.startBot();

            // Should not throw - just logs
            await discordBot.closePoll(99999);
        });

        it('should do nothing when bot not initialized', async () => {
            await discordBot.stopBot();

            // Should not throw - just logs that bot isn't initialized
            await discordBot.closePoll(99999);
        });
    });

    describe('updatePollMessage', () => {
        it('should handle missing poll gracefully', async () => {
            await discordBot.startBot();

            // Should not throw - just logs
            await discordBot.updatePollMessage(99999);
        });

        it('should do nothing when bot not initialized', async () => {
            await discordBot.stopBot();

            // Should not throw
            await discordBot.updatePollMessage(99999);
        });
    });

    describe('postAttendancePoll', () => {
        it('should throw error when bot not initialized', async () => {
            await discordBot.stopBot();

            await expect(discordBot.postAttendancePoll(1, '2024-01-15', 1))
                .rejects.toThrow('Discord bot is not initialized');
        });

        it('should throw error when channel not found', async () => {
            await discordBot.startBot();

            mockClient.channels.fetch.mockResolvedValueOnce(null);

            await expect(discordBot.postAttendancePoll(1, '2024-01-15', 1))
                .rejects.toThrow('Attendance channel not found');
        });

        it('should create poll and store in database', async () => {
            await discordBot.startBot();

            const mockMessage = {
                id: 'message-123',
                react: jest.fn().mockResolvedValue(true),
            };
            const mockChannel = {
                id: 'channel-123',
                send: jest.fn().mockResolvedValue(mockMessage),
            };
            mockClient.channels.fetch.mockResolvedValueOnce(mockChannel);

            // Create a league with required fields
            const [leagueId] = await db('leagues').insert({
                name: 'Test League',
                is_active: true,
                start_date: '2024-01-01',
                end_date: '2024-03-01',
            });

            // Create a session
            const [sessionId] = await db('game_sessions').insert({
                league_id: leagueId,
                session_date: '2024-01-15',
            });

            const result = await discordBot.postAttendancePoll(sessionId, '2024-01-15', leagueId, 'Custom message');

            expect(result).toEqual({
                messageId: 'message-123',
                channelId: 'channel-123',
            });

            expect(mockChannel.send).toHaveBeenCalledWith(
                expect.objectContaining({
                    embeds: expect.any(Array),
                })
            );

            // Verify reactions were added
            expect(mockMessage.react).toHaveBeenCalledTimes(3);

            // Verify database record
            const poll = await db('attendance_polls').where('session_id', sessionId).first();
            expect(poll).toBeDefined();
            expect(poll.discord_message_id).toBe('message-123');
            expect(poll.custom_message).toBe('Custom message');
        });
    });

    describe('sendAttendanceMessage', () => {
        it('should throw error when bot not initialized', async () => {
            await discordBot.stopBot();

            await expect(discordBot.sendAttendanceMessage('Test message'))
                .rejects.toThrow('Discord bot is not initialized');
        });

        it('should send message to channel when initialized', async () => {
            await discordBot.startBot();

            const mockMessage = { id: 'sent-message-id' };
            const mockChannel = {
                send: jest.fn().mockResolvedValue(mockMessage),
            };
            mockClient.channels.fetch.mockResolvedValue(mockChannel);

            const result = await discordBot.sendAttendanceMessage('Test message');

            expect(mockClient.channels.fetch).toHaveBeenCalled();
            expect(mockChannel.send).toHaveBeenCalledWith({ content: 'Test message' });
            expect(result).toEqual(mockMessage);
        });
    });

    describe('postSessionRecap', () => {
        it('should throw error when bot not initialized', async () => {
            await discordBot.stopBot();

            await expect(discordBot.postSessionRecap(1))
                .rejects.toThrow('Discord bot is not initialized');
        });

        it('should throw error when session not found', async () => {
            await discordBot.startBot();

            const mockChannel = { id: 'recap-channel' };
            mockClient.channels.fetch.mockResolvedValueOnce(mockChannel);

            await expect(discordBot.postSessionRecap(99999))
                .rejects.toThrow('Session not found');
        });

        it('should throw error when no pods found', async () => {
            await discordBot.startBot();

            const mockChannel = { id: 'recap-channel' };
            mockClient.channels.fetch.mockResolvedValueOnce(mockChannel);

            // Create league and session with no pods
            const [leagueId] = await db('leagues').insert({
                name: 'Test League',
                is_active: true,
                start_date: '2024-01-01',
                end_date: '2024-03-01',
            });

            const [sessionId] = await db('game_sessions').insert({
                league_id: leagueId,
                session_date: '2024-01-15',
            });

            await expect(discordBot.postSessionRecap(sessionId))
                .rejects.toThrow('No pods found for this session');
        });

        it('should post recap for session with completed pods', async () => {
            await discordBot.startBot();

            const mockMessage = { id: 'recap-message-id' };
            const mockChannel = {
                id: 'recap-channel',
                send: jest.fn().mockResolvedValue(mockMessage),
            };
            mockClient.channels.fetch.mockResolvedValueOnce(mockChannel);

            // Create users first (needed for creator_id)
            const [userId1] = await db('users').insert({
                email: 'player1@test.com',
                password: 'hash',
                firstname: 'Player',
                lastname: 'One',
                role_id: 1,
            });

            const [userId2] = await db('users').insert({
                email: 'player2@test.com',
                password: 'hash',
                firstname: 'Player',
                lastname: 'Two',
                role_id: 1,
            });

            // Create league
            const [leagueId] = await db('leagues').insert({
                name: 'Test League',
                is_active: true,
                start_date: '2024-01-01',
                end_date: '2024-03-01',
            });

            // Create session
            const [sessionId] = await db('game_sessions').insert({
                league_id: leagueId,
                session_date: '2024-01-15',
            });

            // Create pod
            const [podId] = await db('game_pods').insert({
                session_id: sessionId,
                league_id: leagueId,
                confirmation_status: 'complete',
                creator_id: userId1,
            });

            // Add players to pod
            await db('game_players').insert([
                { pod_id: podId, player_id: userId1, result: 'win' },
                { pod_id: podId, player_id: userId2, result: 'loss' },
            ]);

            const result = await discordBot.postSessionRecap(sessionId);

            expect(result).toEqual({
                messageId: 'recap-message-id',
                channelId: 'recap-channel',
            });

            expect(mockChannel.send).toHaveBeenCalledWith(
                expect.objectContaining({
                    embeds: expect.arrayContaining([
                        expect.objectContaining({
                            title: expect.stringContaining('Recap'),
                        }),
                    ]),
                })
            );
        });
    });
});
