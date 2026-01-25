/**
 * Shared test utilities for the escalation-league frontend
 *
 * These utilities solve common testing problems:
 * - localStorage mocking that survives jest.clearAllMocks()
 * - Common render wrappers with providers
 * - Async test helpers
 */

// Re-export localStorage utilities
export {
    mockLocalStorage,
    setupMockLocalStorage,
    setLocalStorageItem,
    setLocalStorageItems,
    getLocalStorageStore,
    clearLocalStorageStore,
    installMockLocalStorage
} from './mockLocalStorage';

// Re-export other utilities as they're added
