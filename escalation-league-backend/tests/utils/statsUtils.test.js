/**
 * Tests for statsUtils.js
 * Stats calculation and update utilities
 */

// Mock the db module
jest.mock('../../models/db', () => require('../helpers/testDb'));

const db = require('../helpers/testDb');
const bcrypt = require('bcrypt');
const { updateStats } = require('../../utils/statsUtils');

describe('statsUtils', () => {
    // Use the 'users' table which has wins/losses/draws columns
    const testTableName = 'users';
    let testUserId;

    // Helper to create a fresh test user before each test
    const createTestUser = async () => {
        const timestamp = Date.now();
        const random = Math.floor(Math.random() * 10000);
        const hashedPassword = await bcrypt.hash('TestPass123!', 10);

        const [userId] = await db('users').insert({
            email: `stats_test_${timestamp}_${random}@test.com`,
            password: hashedPassword,
            firstname: 'Stats',
            lastname: 'TestUser',
            is_active: 1,
            is_deleted: 0,
            wins: 5,
            losses: 3,
            draws: 1,
            elo_rating: 1500,
            role_id: 1
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

    describe('updateStats', () => {
        it('should throw error when tableName is not provided', async () => {
            await expect(updateStats(null, { id: 1 }, { wins: 1 }))
                .rejects.toThrow('Table name, conditions, and stats are required.');
        });

        it('should throw error when conditions are not provided', async () => {
            await expect(updateStats('users', null, { wins: 1 }))
                .rejects.toThrow('Table name, conditions, and stats are required.');
        });

        it('should throw error when stats are not provided', async () => {
            await expect(updateStats('users', { id: 1 }, null))
                .rejects.toThrow('Table name, conditions, and stats are required.');
        });

        it('should throw error when stats object is empty', async () => {
            await expect(updateStats(testTableName, { id: testUserId }, {}))
                .rejects.toThrow('No valid stats provided for update.');
        });

        it('should throw error when all stats values are undefined', async () => {
            await expect(updateStats(testTableName, { id: testUserId }, { wins: undefined }))
                .rejects.toThrow('No valid stats provided for update.');
        });

        it('should throw error when no rows match conditions', async () => {
            await expect(updateStats(testTableName, { id: 999999 }, { wins: 1 }))
                .rejects.toThrow('No rows were updated. Check the conditions.');
        });

        it('should increment wins stat', async () => {
            await updateStats(
                testTableName,
                { id: testUserId },
                { wins: 1 }
            );

            const record = await db(testTableName)
                .where({ id: testUserId })
                .first();

            expect(record.wins).toBe(6); // 5 + 1
        });

        it('should increment losses stat', async () => {
            await updateStats(
                testTableName,
                { id: testUserId },
                { losses: 2 }
            );

            const record = await db(testTableName)
                .where({ id: testUserId })
                .first();

            expect(record.losses).toBe(5); // 3 + 2
        });

        it('should increment multiple stats at once', async () => {
            await updateStats(
                testTableName,
                { id: testUserId },
                { wins: 2, losses: 1, draws: 1 }
            );

            const record = await db(testTableName)
                .where({ id: testUserId })
                .first();

            expect(record.wins).toBe(7);    // 5 + 2
            expect(record.losses).toBe(4);  // 3 + 1
            expect(record.draws).toBe(2);   // 1 + 1
        });

        it('should handle negative values (decrement)', async () => {
            await updateStats(
                testTableName,
                { id: testUserId },
                { wins: -1 }
            );

            const record = await db(testTableName)
                .where({ id: testUserId })
                .first();

            expect(record.wins).toBe(4); // 5 - 1
        });

        it('should handle zero values', async () => {
            await updateStats(
                testTableName,
                { id: testUserId },
                { wins: 0 }
            );

            const record = await db(testTableName)
                .where({ id: testUserId })
                .first();

            expect(record.wins).toBe(5); // 5 + 0
        });

        it('should skip undefined values but process defined ones', async () => {
            await updateStats(
                testTableName,
                { id: testUserId },
                { wins: 1, losses: undefined, draws: 2 }
            );

            const record = await db(testTableName)
                .where({ id: testUserId })
                .first();

            expect(record.wins).toBe(6);    // 5 + 1
            expect(record.losses).toBe(3);  // unchanged
            expect(record.draws).toBe(3);   // 1 + 2
        });
    });
});
