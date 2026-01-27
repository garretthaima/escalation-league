/**
 * Tests for deckService lazy sync functionality
 */

// Mock dependencies before requiring the module
const mockRedis = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn()
};

const mockDb = jest.fn(() => ({
    join: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    select: jest.fn().mockResolvedValue([]),
    update: jest.fn().mockResolvedValue(1)
}));

const mockLogger = {
    debug: jest.fn(),
    info: jest.fn(),
    error: jest.fn()
};

const mockFetchMoxfieldDeck = jest.fn();
const mockFetchArchidektDeck = jest.fn();

jest.mock('../../utils/redisClient', () => mockRedis);
jest.mock('../../models/db', () => mockDb);
jest.mock('../../utils/logger', () => mockLogger);
jest.mock('../../services/deckFetchers', () => ({
    fetchMoxfieldDeck: mockFetchMoxfieldDeck,
    fetchArchidektDeck: mockFetchArchidektDeck
}));

// Now require the module
const {
    triggerLazySyncIfNeeded,
    LAZY_SYNC_INTERVAL_HOURS
} = require('../../services/deckService');

describe('deckService - Lazy Sync', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('triggerLazySyncIfNeeded', () => {
        it('should skip sync if lock already exists', async () => {
            mockRedis.get.mockResolvedValueOnce('1234567890'); // Lock exists

            const result = await triggerLazySyncIfNeeded(1);

            expect(result).toBe(false);
            expect(mockLogger.debug).toHaveBeenCalledWith(
                'Lazy sync already in progress, skipping',
                { leagueId: 1 }
            );
        });

        it('should skip sync if last sync was recent', async () => {
            const recentTime = Date.now() - (1 * 60 * 60 * 1000); // 1 hour ago
            mockRedis.get
                .mockResolvedValueOnce(null) // No lock
                .mockResolvedValueOnce(recentTime.toString()); // Recent sync

            const result = await triggerLazySyncIfNeeded(1);

            expect(result).toBe(false);
            expect(mockLogger.debug).toHaveBeenCalledWith(
                'Lazy sync not needed, last sync was recent',
                expect.objectContaining({ leagueId: 1 })
            );
        });

        it('should trigger sync if last sync was long ago', async () => {
            const oldTime = Date.now() - (12 * 60 * 60 * 1000); // 12 hours ago
            mockRedis.get
                .mockResolvedValueOnce(null) // No lock
                .mockResolvedValueOnce(oldTime.toString()); // Old sync
            mockRedis.set.mockResolvedValue('OK'); // Lock acquired

            const result = await triggerLazySyncIfNeeded(1);

            expect(result).toBe(true);
            expect(mockLogger.info).toHaveBeenCalledWith(
                'Triggered lazy sync for league decks',
                { leagueId: 1 }
            );
        });

        it('should trigger sync if no previous sync exists', async () => {
            mockRedis.get
                .mockResolvedValueOnce(null) // No lock
                .mockResolvedValueOnce(null); // No previous sync
            mockRedis.set.mockResolvedValue('OK'); // Lock acquired

            const result = await triggerLazySyncIfNeeded(1);

            expect(result).toBe(true);
            expect(mockLogger.info).toHaveBeenCalledWith(
                'Triggered lazy sync for league decks',
                { leagueId: 1 }
            );
        });

        it('should skip sync if lock cannot be acquired', async () => {
            const oldTime = Date.now() - (12 * 60 * 60 * 1000);
            mockRedis.get
                .mockResolvedValueOnce(null) // No lock
                .mockResolvedValueOnce(oldTime.toString()); // Old sync
            mockRedis.set.mockResolvedValue(null); // Lock NOT acquired

            const result = await triggerLazySyncIfNeeded(1);

            expect(result).toBe(false);
            expect(mockLogger.debug).toHaveBeenCalledWith(
                'Could not acquire sync lock, another sync may have started',
                { leagueId: 1 }
            );
        });

        it('should return false on error', async () => {
            mockRedis.get.mockRejectedValueOnce(new Error('Redis error'));

            const result = await triggerLazySyncIfNeeded(1);

            expect(result).toBe(false);
            expect(mockLogger.error).toHaveBeenCalledWith(
                'Error checking lazy sync status',
                expect.objectContaining({ leagueId: 1, error: 'Redis error' })
            );
        });
    });

    describe('LAZY_SYNC_INTERVAL_HOURS', () => {
        it('should be set to 6 hours by default', () => {
            expect(LAZY_SYNC_INTERVAL_HOURS).toBe(6);
        });
    });
});
