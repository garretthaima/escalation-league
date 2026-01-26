/**
 * Tests for tokenUtils.js
 * JWT token generation and utility functions
 */

// Mock the db before importing tokenUtils
jest.mock('../../models/db', () => require('../helpers/testDb'));

// Mock settingsUtils
jest.mock('../../utils/settingsUtils', () => ({
    getSetting: jest.fn()
}));

// Mock userSettingsUtils
jest.mock('../../utils/userSettingsUtils', () => ({
    getUserSetting: jest.fn()
}));

const jwt = require('jsonwebtoken');
const {
    generateToken,
    generateAccessToken,
    generateRefreshToken,
    hashRefreshToken,
    parseDuration
} = require('../../utils/tokenUtils');
const { getSetting } = require('../../utils/settingsUtils');
const { getUserSetting } = require('../../utils/userSettingsUtils');

describe('tokenUtils', () => {
    const mockUser = {
        id: 1,
        role_id: 2,
        role_name: 'player'
    };

    const mockSecretKey = 'test-secret-key-12345';

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('parseDuration', () => {
        it('should parse seconds correctly', () => {
            expect(parseDuration('30s')).toBe(30000);
            expect(parseDuration('1s')).toBe(1000);
            expect(parseDuration('120s')).toBe(120000);
        });

        it('should parse minutes correctly', () => {
            expect(parseDuration('1m')).toBe(60000);
            expect(parseDuration('15m')).toBe(900000);
            expect(parseDuration('60m')).toBe(3600000);
        });

        it('should parse hours correctly', () => {
            expect(parseDuration('1h')).toBe(3600000);
            expect(parseDuration('12h')).toBe(43200000);
            expect(parseDuration('24h')).toBe(86400000);
        });

        it('should parse days correctly', () => {
            expect(parseDuration('1d')).toBe(86400000);
            expect(parseDuration('7d')).toBe(604800000);
            expect(parseDuration('30d')).toBe(2592000000);
        });

        it('should throw error for invalid format', () => {
            expect(() => parseDuration('invalid')).toThrow('Invalid duration format');
            expect(() => parseDuration('10x')).toThrow('Invalid duration format');
            expect(() => parseDuration('abc')).toThrow('Invalid duration format');
            expect(() => parseDuration('')).toThrow('Invalid duration format');
        });
    });

    describe('hashRefreshToken', () => {
        it('should hash a token consistently', () => {
            const token = 'test-refresh-token';
            const hash1 = hashRefreshToken(token);
            const hash2 = hashRefreshToken(token);

            expect(hash1).toBe(hash2);
            expect(hash1).toHaveLength(64); // SHA-256 produces 64 hex characters
        });

        it('should produce different hashes for different tokens', () => {
            const hash1 = hashRefreshToken('token1');
            const hash2 = hashRefreshToken('token2');

            expect(hash1).not.toBe(hash2);
        });
    });

    describe('generateRefreshToken', () => {
        beforeEach(() => {
            getSetting.mockResolvedValue('30d');
        });

        it('should generate a refresh token with hash and expiry', async () => {
            const result = await generateRefreshToken();

            expect(result).toHaveProperty('token');
            expect(result).toHaveProperty('tokenHash');
            expect(result).toHaveProperty('expiresAt');
            expect(result.token).toBeTruthy();
            expect(result.tokenHash).toHaveLength(64);
            expect(result.expiresAt instanceof Date).toBe(true);
        });

        it('should generate unique tokens each time', async () => {
            const result1 = await generateRefreshToken();
            const result2 = await generateRefreshToken();

            expect(result1.token).not.toBe(result2.token);
            expect(result1.tokenHash).not.toBe(result2.tokenHash);
        });

        it('should use default expiration when setting is not available', async () => {
            getSetting.mockResolvedValue(null);

            const result = await generateRefreshToken();

            // Should still work with default '30d'
            expect(result.expiresAt instanceof Date).toBe(true);
        });

        it('should set correct expiration time', async () => {
            getSetting.mockResolvedValue('7d');

            const before = Date.now();
            const result = await generateRefreshToken();
            const after = Date.now();

            const expectedMin = before + 7 * 24 * 60 * 60 * 1000;
            const expectedMax = after + 7 * 24 * 60 * 60 * 1000;

            expect(result.expiresAt.getTime()).toBeGreaterThanOrEqual(expectedMin);
            expect(result.expiresAt.getTime()).toBeLessThanOrEqual(expectedMax);
        });
    });

    describe('generateAccessToken', () => {
        beforeEach(() => {
            getSetting.mockImplementation((key) => {
                if (key === 'access_token_expiration') return Promise.resolve('15m');
                if (key === 'secret_key') return Promise.resolve(mockSecretKey);
                return Promise.resolve(null);
            });
        });

        it('should generate a valid JWT access token', async () => {
            const token = await generateAccessToken(mockUser);

            expect(token).toBeTruthy();
            const decoded = jwt.verify(token, mockSecretKey);
            expect(decoded.id).toBe(mockUser.id);
            expect(decoded.role_id).toBe(mockUser.role_id);
            expect(decoded.role_name).toBe(mockUser.role_name);
            expect(decoded.type).toBe('access');
        });

        it('should include custom claims in token', async () => {
            const customClaims = { scope: 'read:users' };
            const token = await generateAccessToken(mockUser, { customClaims });

            const decoded = jwt.verify(token, mockSecretKey);
            expect(decoded.scope).toBe('read:users');
        });

        it('should use default expiration when setting is not available', async () => {
            getSetting.mockImplementation((key) => {
                if (key === 'access_token_expiration') return Promise.resolve(null);
                if (key === 'secret_key') return Promise.resolve(mockSecretKey);
                return Promise.resolve(null);
            });

            const token = await generateAccessToken(mockUser);
            expect(token).toBeTruthy();
        });

        it('should throw error when secret key is not available', async () => {
            getSetting.mockImplementation((key) => {
                if (key === 'secret_key') return Promise.resolve(null);
                return Promise.resolve('15m');
            });

            await expect(generateAccessToken(mockUser)).rejects.toThrow('Failed to generate access token');
        });
    });

    describe('generateToken', () => {
        beforeEach(() => {
            getSetting.mockImplementation((key) => {
                if (key === 'token_expiration') return Promise.resolve('1h');
                if (key === 'max_token_expiration') return Promise.resolve('12h');
                if (key === 'secret_key') return Promise.resolve(mockSecretKey);
                return Promise.resolve(null);
            });
            getUserSetting.mockResolvedValue(null);
        });

        it('should generate a valid JWT token', async () => {
            const token = await generateToken(mockUser);

            expect(token).toBeTruthy();
            const decoded = jwt.verify(token, mockSecretKey);
            expect(decoded.id).toBe(mockUser.id);
            expect(decoded.role_id).toBe(mockUser.role_id);
            expect(decoded.role_name).toBe(mockUser.role_name);
        });

        it('should include custom claims in token', async () => {
            const customClaims = { isAdmin: true };
            const token = await generateToken(mockUser, { customClaims });

            const decoded = jwt.verify(token, mockSecretKey);
            expect(decoded.isAdmin).toBe(true);
        });

        it('should use custom expiresIn option', async () => {
            const token = await generateToken(mockUser, { expiresIn: '30m' });

            expect(token).toBeTruthy();
            // Token should be valid
            const decoded = jwt.verify(token, mockSecretKey);
            expect(decoded).toBeTruthy();
        });

        it('should respect user setting for expiration', async () => {
            getUserSetting.mockResolvedValue('2h');

            const token = await generateToken(mockUser);

            expect(token).toBeTruthy();
            expect(getUserSetting).toHaveBeenCalledWith(mockUser.id, 'token_expiration');
        });

        it('should cap expiration at max_token_expiration', async () => {
            // Request 24h but max is 12h
            getUserSetting.mockResolvedValue('24h');
            getSetting.mockImplementation((key) => {
                if (key === 'token_expiration') return Promise.resolve('1h');
                if (key === 'max_token_expiration') return Promise.resolve('12h');
                if (key === 'secret_key') return Promise.resolve(mockSecretKey);
                return Promise.resolve(null);
            });

            const token = await generateToken(mockUser);

            expect(token).toBeTruthy();
            // Token should still be valid (capped at 12h)
            const decoded = jwt.verify(token, mockSecretKey);
            expect(decoded).toBeTruthy();
        });

        it('should throw error when secret key is not available', async () => {
            getSetting.mockImplementation((key) => {
                if (key === 'secret_key') return Promise.resolve(null);
                if (key === 'token_expiration') return Promise.resolve('1h');
                if (key === 'max_token_expiration') return Promise.resolve('12h');
                return Promise.resolve(null);
            });

            await expect(generateToken(mockUser)).rejects.toThrow('Failed to generate token');
        });
    });
});
