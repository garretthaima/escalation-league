const db = require('../helpers/testDb');

// Mock dependencies before requiring controller
jest.mock('../../models/db', () => require('../helpers/testDb'));
jest.mock('../../utils/logger', () => ({
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
}));

// Mock global fetch
global.fetch = jest.fn();

const discordController = require('../../controllers/discordController');
const logger = require('../../utils/logger');

describe('discordController', () => {
    let mockReq;
    let mockRes;

    beforeEach(() => {
        jest.clearAllMocks();
        mockRes = {
            json: jest.fn(),
            status: jest.fn().mockReturnThis(),
            redirect: jest.fn(),
        };
    });

    afterEach(async () => {
        await db('users').del();
    });

    describe('getDiscordAuthUrl', () => {
        beforeEach(() => {
            mockReq = {
                user: { id: 1 },
            };
        });

        it('should return Discord OAuth URL when configured', async () => {
            process.env.DISCORD_CLIENT_ID = 'test-client-id';
            process.env.BACKEND_URL = 'http://localhost:3000';

            await discordController.getDiscordAuthUrl(mockReq, mockRes);

            expect(mockRes.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    url: expect.stringContaining('discord.com/api/oauth2/authorize'),
                })
            );
            expect(mockRes.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    url: expect.stringContaining('client_id=test-client-id'),
                })
            );
        });

        it('should return 500 when Discord client ID is not configured', async () => {
            const originalClientId = process.env.DISCORD_CLIENT_ID;
            delete process.env.DISCORD_CLIENT_ID;

            await discordController.getDiscordAuthUrl(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(500);
            expect(mockRes.json).toHaveBeenCalledWith({
                error: 'Discord integration not configured',
            });
            expect(logger.error).toHaveBeenCalledWith('Discord Client ID not configured');

            process.env.DISCORD_CLIENT_ID = originalClientId;
        });

        it('should include state with user ID in auth URL', async () => {
            process.env.DISCORD_CLIENT_ID = 'test-client-id';
            process.env.BACKEND_URL = 'http://localhost:3000';

            await discordController.getDiscordAuthUrl(mockReq, mockRes);

            const call = mockRes.json.mock.calls[0][0];
            expect(call.url).toContain('state=');

            // Extract and decode state
            const urlParams = new URLSearchParams(call.url.split('?')[1]);
            const state = urlParams.get('state');
            const decoded = JSON.parse(Buffer.from(state, 'base64').toString());
            expect(decoded.userId).toBe(1);
            expect(decoded.nonce).toBeDefined();
            expect(decoded.timestamp).toBeDefined();
        });
    });

    describe('discordCallback', () => {
        const frontendUrl = 'http://localhost:3001';

        beforeEach(() => {
            process.env.FRONTEND_URL = frontendUrl;
            process.env.DISCORD_CLIENT_ID = 'test-client-id';
            process.env.DISCORD_CLIENT_SECRET = 'test-secret';
            process.env.BACKEND_URL = 'http://localhost:3000';
        });

        it('should redirect with error when code is missing', async () => {
            mockReq = { query: {} };

            await discordController.discordCallback(mockReq, mockRes);

            expect(mockRes.redirect).toHaveBeenCalledWith(
                `${frontendUrl}/profile?discord=error&message=missing_code`
            );
        });

        it('should redirect with error when state is missing', async () => {
            mockReq = { query: { code: 'test-code' } };

            await discordController.discordCallback(mockReq, mockRes);

            expect(mockRes.redirect).toHaveBeenCalledWith(
                `${frontendUrl}/profile?discord=error&message=missing_state`
            );
        });

        it('should redirect with error when state is invalid', async () => {
            mockReq = { query: { code: 'test-code', state: 'invalid-base64!' } };

            await discordController.discordCallback(mockReq, mockRes);

            expect(mockRes.redirect).toHaveBeenCalledWith(
                `${frontendUrl}/profile?discord=error&message=invalid_state`
            );
        });

        it('should redirect with error when state is expired', async () => {
            const expiredState = Buffer.from(JSON.stringify({
                userId: 1,
                nonce: 'test',
                timestamp: Date.now() - 15 * 60 * 1000, // 15 minutes ago
            })).toString('base64');

            mockReq = { query: { code: 'test-code', state: expiredState } };

            await discordController.discordCallback(mockReq, mockRes);

            expect(mockRes.redirect).toHaveBeenCalledWith(
                `${frontendUrl}/profile?discord=error&message=expired`
            );
        });

        it('should redirect with error when token exchange fails', async () => {
            const validState = Buffer.from(JSON.stringify({
                userId: 1,
                nonce: 'test',
                timestamp: Date.now(),
            })).toString('base64');

            mockReq = { query: { code: 'test-code', state: validState } };

            global.fetch.mockResolvedValueOnce({
                ok: false,
                status: 400,
                text: jest.fn().mockResolvedValue('Bad request'),
            });

            await discordController.discordCallback(mockReq, mockRes);

            expect(mockRes.redirect).toHaveBeenCalledWith(
                `${frontendUrl}/profile?discord=error&message=token_failed`
            );
        });

        it('should redirect with error when user fetch fails', async () => {
            const validState = Buffer.from(JSON.stringify({
                userId: 1,
                nonce: 'test',
                timestamp: Date.now(),
            })).toString('base64');

            mockReq = { query: { code: 'test-code', state: validState } };

            global.fetch
                .mockResolvedValueOnce({
                    ok: true,
                    json: jest.fn().mockResolvedValue({ access_token: 'test-token' }),
                })
                .mockResolvedValueOnce({
                    ok: false,
                });

            await discordController.discordCallback(mockReq, mockRes);

            expect(mockRes.redirect).toHaveBeenCalledWith(
                `${frontendUrl}/profile?discord=error&message=user_fetch_failed`
            );
        });

        it('should redirect with error when Discord account is already linked', async () => {
            // Create two users
            const [userId1] = await db('users').insert({
                email: 'user1@test.com',
                password: 'hash',
                firstname: 'User',
                lastname: 'One',
                role_id: 1,
            });

            const [userId2] = await db('users').insert({
                email: 'user2@test.com',
                password: 'hash',
                firstname: 'User',
                lastname: 'Two',
                role_id: 1,
                discord_id: 'discord-123',
            });

            const validState = Buffer.from(JSON.stringify({
                userId: userId1,
                nonce: 'test',
                timestamp: Date.now(),
            })).toString('base64');

            mockReq = { query: { code: 'test-code', state: validState } };

            global.fetch
                .mockResolvedValueOnce({
                    ok: true,
                    json: jest.fn().mockResolvedValue({ access_token: 'test-token' }),
                })
                .mockResolvedValueOnce({
                    ok: true,
                    json: jest.fn().mockResolvedValue({
                        id: 'discord-123',
                        username: 'testuser',
                        discriminator: '0',
                    }),
                });

            await discordController.discordCallback(mockReq, mockRes);

            expect(mockRes.redirect).toHaveBeenCalledWith(
                `${frontendUrl}/profile?discord=error&message=already_linked`
            );
        });

        it('should successfully link Discord account', async () => {
            const [userId] = await db('users').insert({
                email: 'test@test.com',
                password: 'hash',
                firstname: 'Test',
                lastname: 'User',
                role_id: 1,
            });

            const validState = Buffer.from(JSON.stringify({
                userId: userId,
                nonce: 'test',
                timestamp: Date.now(),
            })).toString('base64');

            mockReq = { query: { code: 'test-code', state: validState } };

            global.fetch
                .mockResolvedValueOnce({
                    ok: true,
                    json: jest.fn().mockResolvedValue({ access_token: 'test-token' }),
                })
                .mockResolvedValueOnce({
                    ok: true,
                    json: jest.fn().mockResolvedValue({
                        id: 'discord-456',
                        username: 'linkeduser',
                        discriminator: '0',
                        avatar: 'avatar-hash',
                    }),
                });

            await discordController.discordCallback(mockReq, mockRes);

            expect(mockRes.redirect).toHaveBeenCalledWith(
                `${frontendUrl}/profile?discord=success`
            );

            // Verify database update
            const user = await db('users').where('id', userId).first();
            expect(user.discord_id).toBe('discord-456');
            expect(user.discord_username).toBe('linkeduser');
            expect(user.discord_avatar).toBe('avatar-hash');
        });

        it('should include discriminator in username when not 0', async () => {
            const [userId] = await db('users').insert({
                email: 'test@test.com',
                password: 'hash',
                firstname: 'Test',
                lastname: 'User',
                role_id: 1,
            });

            const validState = Buffer.from(JSON.stringify({
                userId: userId,
                nonce: 'test',
                timestamp: Date.now(),
            })).toString('base64');

            mockReq = { query: { code: 'test-code', state: validState } };

            global.fetch
                .mockResolvedValueOnce({
                    ok: true,
                    json: jest.fn().mockResolvedValue({ access_token: 'test-token' }),
                })
                .mockResolvedValueOnce({
                    ok: true,
                    json: jest.fn().mockResolvedValue({
                        id: 'discord-789',
                        username: 'olduser',
                        discriminator: '1234',
                        avatar: null,
                    }),
                });

            await discordController.discordCallback(mockReq, mockRes);

            const user = await db('users').where('id', userId).first();
            expect(user.discord_username).toBe('olduser#1234');
        });
    });

    describe('unlinkDiscord', () => {
        it('should successfully unlink Discord account', async () => {
            const [userId] = await db('users').insert({
                email: 'test@test.com',
                password: 'hash',
                firstname: 'Test',
                lastname: 'User',
                role_id: 1,
                discord_id: 'discord-123',
                discord_username: 'testuser',
                discord_avatar: 'avatar-hash',
            });

            mockReq = { user: { id: userId } };

            await discordController.unlinkDiscord(mockReq, mockRes);

            expect(mockRes.json).toHaveBeenCalledWith({
                success: true,
                message: 'Discord account unlinked successfully',
            });

            // Verify database update
            const user = await db('users').where('id', userId).first();
            expect(user.discord_id).toBeNull();
            expect(user.discord_username).toBeNull();
            expect(user.discord_avatar).toBeNull();
        });

        it('should handle errors gracefully', async () => {
            mockReq = { user: { id: 99999 } };

            // Even with non-existent user, update succeeds (0 rows affected)
            await discordController.unlinkDiscord(mockReq, mockRes);

            expect(mockRes.json).toHaveBeenCalledWith({
                success: true,
                message: 'Discord account unlinked successfully',
            });
        });
    });

    describe('getDiscordStatus', () => {
        it('should return linked status with avatar URL', async () => {
            const [userId] = await db('users').insert({
                email: 'test@test.com',
                password: 'hash',
                firstname: 'Test',
                lastname: 'User',
                role_id: 1,
                discord_id: 'discord-123',
                discord_username: 'testuser',
                discord_avatar: 'avatar-hash',
            });

            mockReq = { user: { id: userId } };

            await discordController.getDiscordStatus(mockReq, mockRes);

            expect(mockRes.json).toHaveBeenCalledWith({
                linked: true,
                discord_username: 'testuser',
                discord_avatar: 'https://cdn.discordapp.com/avatars/discord-123/avatar-hash.png',
            });
        });

        it('should return not linked status', async () => {
            const [userId] = await db('users').insert({
                email: 'test@test.com',
                password: 'hash',
                firstname: 'Test',
                lastname: 'User',
                role_id: 1,
            });

            mockReq = { user: { id: userId } };

            await discordController.getDiscordStatus(mockReq, mockRes);

            expect(mockRes.json).toHaveBeenCalledWith({
                linked: false,
                discord_username: null,
                discord_avatar: null,
            });
        });

        it('should return 404 when user not found', async () => {
            mockReq = { user: { id: 99999 } };

            await discordController.getDiscordStatus(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(404);
            expect(mockRes.json).toHaveBeenCalledWith({ error: 'User not found' });
        });

        it('should return null avatar when discord_avatar is null', async () => {
            const [userId] = await db('users').insert({
                email: 'test@test.com',
                password: 'hash',
                firstname: 'Test',
                lastname: 'User',
                role_id: 1,
                discord_id: 'discord-123',
                discord_username: 'testuser',
                discord_avatar: null,
            });

            mockReq = { user: { id: userId } };

            await discordController.getDiscordStatus(mockReq, mockRes);

            expect(mockRes.json).toHaveBeenCalledWith({
                linked: true,
                discord_username: 'testuser',
                discord_avatar: null,
            });
        });
    });
});
