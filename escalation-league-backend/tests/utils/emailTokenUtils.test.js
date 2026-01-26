/**
 * Tests for emailTokenUtils.js
 * Email verification and password reset token utilities
 */

// Mock the db module
jest.mock('../../models/db', () => require('../helpers/testDb'));

const db = require('../helpers/testDb');
const crypto = require('crypto');
const bcrypt = require('bcrypt');
const {
    createVerificationToken,
    validateVerificationToken,
    createResetToken,
    validateResetToken,
    cleanupExpiredTokens,
    VERIFICATION_TOKEN_EXPIRY_HOURS,
    RESET_TOKEN_EXPIRY_HOURS
} = require('../../utils/emailTokenUtils');

describe('emailTokenUtils', () => {
    let testUserId;

    // Helper to create a fresh test user before each test
    const createTestUser = async () => {
        const timestamp = Date.now();
        const random = Math.floor(Math.random() * 10000);
        const hashedPassword = await bcrypt.hash('TestPass123!', 10);

        const [userId] = await db('users').insert({
            email: `email_token_test_${timestamp}_${random}@test.com`,
            password: hashedPassword,
            firstname: 'EmailToken',
            lastname: 'TestUser',
            is_active: 1,
            is_deleted: 0,
            wins: 0,
            losses: 0,
            draws: 0,
            elo_rating: 1500,
            role_id: 1,
            email_verified: false
        });
        return userId;
    };

    beforeEach(async () => {
        // Create a fresh user before each test
        testUserId = await createTestUser();
    });

    afterAll(async () => {
        await db.destroy();
    });

    describe('constants', () => {
        it('should export verification token expiry hours', () => {
            expect(VERIFICATION_TOKEN_EXPIRY_HOURS).toBe(24);
        });

        it('should export reset token expiry hours', () => {
            expect(RESET_TOKEN_EXPIRY_HOURS).toBe(1);
        });
    });

    describe('createVerificationToken', () => {
        it('should create a verification token', async () => {
            const token = await createVerificationToken(testUserId);

            expect(token).toBeTruthy();
            expect(typeof token).toBe('string');
            expect(token.length).toBe(64); // 32 bytes hex = 64 characters
        });

        it('should store hashed token in database', async () => {
            const token = await createVerificationToken(testUserId);
            const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

            const record = await db('email_verification_tokens')
                .where({ user_id: testUserId, token_hash: tokenHash })
                .first();

            expect(record).toBeTruthy();
            expect(record.is_used).toBe(0);
        });

        it('should invalidate existing tokens when creating new one', async () => {
            // Create first token
            const token1 = await createVerificationToken(testUserId);
            const tokenHash1 = crypto.createHash('sha256').update(token1).digest('hex');

            // Create second token
            await createVerificationToken(testUserId);

            // First token should be marked as used
            const record = await db('email_verification_tokens')
                .where({ token_hash: tokenHash1 })
                .first();

            expect(record.is_used).toBe(1);
        });

        it('should set correct expiration time', async () => {
            const before = new Date();
            const token = await createVerificationToken(testUserId);
            const after = new Date();

            const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
            const record = await db('email_verification_tokens')
                .where({ token_hash: tokenHash })
                .first();

            const expiresAt = new Date(record.expires_at);
            const expectedMin = new Date(before.getTime() + VERIFICATION_TOKEN_EXPIRY_HOURS * 60 * 60 * 1000);
            const expectedMax = new Date(after.getTime() + VERIFICATION_TOKEN_EXPIRY_HOURS * 60 * 60 * 1000);

            expect(expiresAt.getTime()).toBeGreaterThanOrEqual(expectedMin.getTime() - 1000);
            expect(expiresAt.getTime()).toBeLessThanOrEqual(expectedMax.getTime() + 1000);
        });
    });

    describe('validateVerificationToken', () => {
        it('should validate a valid token', async () => {
            const token = await createVerificationToken(testUserId);
            const result = await validateVerificationToken(token);

            expect(result.valid).toBe(true);
            expect(result.userId).toBe(testUserId);
            expect(result.error).toBeUndefined();
        });

        it('should mark token as used after validation', async () => {
            const token = await createVerificationToken(testUserId);
            const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

            await validateVerificationToken(token);

            const record = await db('email_verification_tokens')
                .where({ token_hash: tokenHash })
                .first();

            expect(record.is_used).toBe(1);
        });

        it('should reject invalid token', async () => {
            const result = await validateVerificationToken('invalid-token');

            expect(result.valid).toBe(false);
            expect(result.error).toBe('Invalid verification link');
        });

        it('should reject already used token', async () => {
            const token = await createVerificationToken(testUserId);

            // Use the token
            await validateVerificationToken(token);

            // Try to use again
            const result = await validateVerificationToken(token);

            expect(result.valid).toBe(false);
            expect(result.error).toBe('This verification link has already been used');
        });

        it('should reject expired token', async () => {
            const token = await createVerificationToken(testUserId);
            const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

            // Manually expire the token
            await db('email_verification_tokens')
                .where({ token_hash: tokenHash })
                .update({ expires_at: new Date(Date.now() - 1000) });

            const result = await validateVerificationToken(token);

            expect(result.valid).toBe(false);
            expect(result.error).toBe('This verification link has expired');
        });
    });

    describe('createResetToken', () => {
        it('should create a reset token', async () => {
            const token = await createResetToken(testUserId);

            expect(token).toBeTruthy();
            expect(typeof token).toBe('string');
            expect(token.length).toBe(64);
        });

        it('should store hashed token in database', async () => {
            const token = await createResetToken(testUserId);
            const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

            const record = await db('password_reset_tokens')
                .where({ user_id: testUserId, token_hash: tokenHash })
                .first();

            expect(record).toBeTruthy();
            expect(record.is_used).toBe(0);
        });

        it('should invalidate existing tokens when creating new one', async () => {
            const token1 = await createResetToken(testUserId);
            const tokenHash1 = crypto.createHash('sha256').update(token1).digest('hex');

            await createResetToken(testUserId);

            const record = await db('password_reset_tokens')
                .where({ token_hash: tokenHash1 })
                .first();

            expect(record.is_used).toBe(1);
        });

        it('should set correct expiration time (1 hour)', async () => {
            const before = new Date();
            const token = await createResetToken(testUserId);
            const after = new Date();

            const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
            const record = await db('password_reset_tokens')
                .where({ token_hash: tokenHash })
                .first();

            const expiresAt = new Date(record.expires_at);
            const expectedMin = new Date(before.getTime() + RESET_TOKEN_EXPIRY_HOURS * 60 * 60 * 1000);
            const expectedMax = new Date(after.getTime() + RESET_TOKEN_EXPIRY_HOURS * 60 * 60 * 1000);

            expect(expiresAt.getTime()).toBeGreaterThanOrEqual(expectedMin.getTime() - 1000);
            expect(expiresAt.getTime()).toBeLessThanOrEqual(expectedMax.getTime() + 1000);
        });
    });

    describe('validateResetToken', () => {
        it('should validate a valid token', async () => {
            const token = await createResetToken(testUserId);
            const result = await validateResetToken(token);

            expect(result.valid).toBe(true);
            expect(result.userId).toBe(testUserId);
        });

        it('should mark token as used after validation', async () => {
            const token = await createResetToken(testUserId);
            const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

            await validateResetToken(token);

            const record = await db('password_reset_tokens')
                .where({ token_hash: tokenHash })
                .first();

            expect(record.is_used).toBe(1);
        });

        it('should reject invalid token', async () => {
            const result = await validateResetToken('invalid-token');

            expect(result.valid).toBe(false);
            expect(result.error).toBe('Invalid reset link');
        });

        it('should reject already used token', async () => {
            const token = await createResetToken(testUserId);

            await validateResetToken(token);
            const result = await validateResetToken(token);

            expect(result.valid).toBe(false);
            expect(result.error).toBe('This reset link has already been used');
        });

        it('should reject expired token', async () => {
            const token = await createResetToken(testUserId);
            const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

            await db('password_reset_tokens')
                .where({ token_hash: tokenHash })
                .update({ expires_at: new Date(Date.now() - 1000) });

            const result = await validateResetToken(token);

            expect(result.valid).toBe(false);
            expect(result.error).toBe('This reset link has expired');
        });
    });

    describe('cleanupExpiredTokens', () => {
        it('should delete expired verification tokens', async () => {
            // Create a token and expire it
            const token = await createVerificationToken(testUserId);
            const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

            await db('email_verification_tokens')
                .where({ token_hash: tokenHash })
                .update({ expires_at: new Date(Date.now() - 1000) });

            const result = await cleanupExpiredTokens();

            expect(result.verificationDeleted).toBeGreaterThanOrEqual(1);

            const record = await db('email_verification_tokens')
                .where({ token_hash: tokenHash })
                .first();

            expect(record).toBeUndefined();
        });

        it('should delete used verification tokens', async () => {
            const token = await createVerificationToken(testUserId);
            const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

            await db('email_verification_tokens')
                .where({ token_hash: tokenHash })
                .update({ is_used: true });

            const result = await cleanupExpiredTokens();

            expect(result.verificationDeleted).toBeGreaterThanOrEqual(1);
        });

        it('should delete expired reset tokens', async () => {
            const token = await createResetToken(testUserId);
            const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

            await db('password_reset_tokens')
                .where({ token_hash: tokenHash })
                .update({ expires_at: new Date(Date.now() - 1000) });

            const result = await cleanupExpiredTokens();

            expect(result.resetDeleted).toBeGreaterThanOrEqual(1);

            const record = await db('password_reset_tokens')
                .where({ token_hash: tokenHash })
                .first();

            expect(record).toBeUndefined();
        });

        it('should delete used reset tokens', async () => {
            const token = await createResetToken(testUserId);
            const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

            await db('password_reset_tokens')
                .where({ token_hash: tokenHash })
                .update({ is_used: true });

            const result = await cleanupExpiredTokens();

            expect(result.resetDeleted).toBeGreaterThanOrEqual(1);
        });

        it('should return counts of deleted tokens', async () => {
            const result = await cleanupExpiredTokens();

            expect(typeof result.verificationDeleted).toBe('number');
            expect(typeof result.resetDeleted).toBe('number');
        });
    });
});
