/**
 * Shared localStorage mock for Jest tests
 *
 * Problem: Jest's clearAllMocks() and mockReset() wipe mock implementations.
 * When localStorage is mocked with a closure like:
 *   let store = {};
 *   getItem: jest.fn((key) => store[key])
 *
 * The mock implementation gets lost after clearAllMocks().
 *
 * Solution: Use an object wrapper that survives mock resets, and provide
 * a setup function that reinstalls implementations in beforeEach.
 *
 * Usage:
 *   import { setupMockLocalStorage, mockLocalStorage, setLocalStorageItem } from '../../testUtils/mockLocalStorage';
 *
 *   beforeEach(() => {
 *       setupMockLocalStorage();
 *       // ... other setup
 *   });
 *
 *   it('should work with token', () => {
 *       setLocalStorageItem('token', 'test-token');
 *       // ... test code
 *   });
 */

// Object wrapper - survives variable reassignment issues with closures
const localStorageWrapper = { store: {} };

// The mock object that gets attached to window.localStorage
const mockLocalStorage = {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
    clear: jest.fn(),
    key: jest.fn(),
    get length() {
        return Object.keys(localStorageWrapper.store).length;
    }
};

/**
 * Sets up localStorage mock implementations.
 * Call this in beforeEach() to ensure mocks work after jest.clearAllMocks().
 */
const setupMockLocalStorage = () => {
    // Clear the store
    localStorageWrapper.store = {};

    // Reset and reinstall implementations
    mockLocalStorage.getItem.mockReset();
    mockLocalStorage.getItem.mockImplementation((key) => {
        const value = localStorageWrapper.store[key];
        return value !== undefined ? value : null;
    });

    mockLocalStorage.setItem.mockReset();
    mockLocalStorage.setItem.mockImplementation((key, value) => {
        localStorageWrapper.store[key] = String(value);
    });

    mockLocalStorage.removeItem.mockReset();
    mockLocalStorage.removeItem.mockImplementation((key) => {
        delete localStorageWrapper.store[key];
    });

    mockLocalStorage.clear.mockReset();
    mockLocalStorage.clear.mockImplementation(() => {
        localStorageWrapper.store = {};
    });

    mockLocalStorage.key.mockReset();
    mockLocalStorage.key.mockImplementation((index) => {
        const keys = Object.keys(localStorageWrapper.store);
        return keys[index] || null;
    });
};

/**
 * Helper to set a localStorage item directly (bypasses the mock for setup)
 */
const setLocalStorageItem = (key, value) => {
    localStorageWrapper.store[key] = String(value);
};

/**
 * Helper to set multiple localStorage items at once
 */
const setLocalStorageItems = (items) => {
    Object.entries(items).forEach(([key, value]) => {
        localStorageWrapper.store[key] = value !== null ? String(value) : null;
    });
};

/**
 * Helper to get the raw store (useful for assertions)
 */
const getLocalStorageStore = () => localStorageWrapper.store;

/**
 * Helper to clear the store directly
 */
const clearLocalStorageStore = () => {
    localStorageWrapper.store = {};
};

/**
 * Install the mock on window.localStorage
 * Call this once at the top of your test file, outside describe blocks
 */
const installMockLocalStorage = () => {
    Object.defineProperty(window, 'localStorage', {
        value: mockLocalStorage,
        writable: true,
        configurable: true
    });
};

module.exports = {
    mockLocalStorage,
    setupMockLocalStorage,
    setLocalStorageItem,
    setLocalStorageItems,
    getLocalStorageStore,
    clearLocalStorageStore,
    installMockLocalStorage
};
