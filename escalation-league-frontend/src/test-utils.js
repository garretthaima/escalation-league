/**
 * Test utilities and mock helpers for React Testing Library
 *
 * This file provides common test setup including:
 * - Custom render function with providers
 * - Mock factories for common dependencies
 * - Test data generators
 */

import React from 'react';
import { render } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';

/**
 * Custom render function that wraps components with common providers
 * Use this instead of RTL's render for components that need routing context
 */
const customRender = (ui, options = {}) => {
    const { route = '/', ...renderOptions } = options;

    // Set up initial route
    window.history.pushState({}, 'Test page', route);

    const AllProviders = ({ children }) => {
        return (
            <BrowserRouter>
                {children}
            </BrowserRouter>
        );
    };

    return render(ui, { wrapper: AllProviders, ...renderOptions });
};

/**
 * Mock user factory for tests
 */
export const createMockUser = (overrides = {}) => ({
    id: 1,
    firstname: 'Test',
    lastname: 'User',
    email: 'test@example.com',
    profile_picture_url: null,
    is_active: true,
    is_banned: false,
    ...overrides
});

/**
 * Mock league factory for tests
 */
export const createMockLeague = (overrides = {}) => ({
    id: 1,
    name: 'Test League',
    description: 'A test league',
    is_active: true,
    start_date: '2024-01-01',
    end_date: '2024-12-31',
    points_per_win: 3,
    points_per_loss: 1,
    points_per_draw: 2,
    ...overrides
});

/**
 * Mock pod/game factory for tests
 */
export const createMockPod = (overrides = {}) => ({
    id: 1,
    league_id: 1,
    confirmation_status: 'open',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    participants: [],
    ...overrides
});

/**
 * Mock participant factory for tests
 */
export const createMockParticipant = (overrides = {}) => ({
    player_id: 1,
    firstname: 'Player',
    lastname: 'One',
    result: null,
    confirmed: false,
    turn_order: 1,
    ...overrides
});

/**
 * Mock permissions factory for tests
 */
export const createMockPermissions = (permissions = []) => {
    const defaultPermissions = [
        { name: 'pod_read' },
        { name: 'pod_create' }
    ];
    return permissions.length > 0 ? permissions : defaultPermissions;
};

/**
 * Mock localStorage for tests
 */
export const mockLocalStorage = () => {
    const store = {};
    return {
        getItem: jest.fn((key) => store[key] || null),
        setItem: jest.fn((key, value) => { store[key] = value; }),
        removeItem: jest.fn((key) => { delete store[key]; }),
        clear: jest.fn(() => { Object.keys(store).forEach(key => delete store[key]); }),
        get store() { return store; }
    };
};

/**
 * Wait for async operations in tests
 */
export const waitForAsync = () => new Promise(resolve => setTimeout(resolve, 0));

// Re-export everything from RTL
export * from '@testing-library/react';

// Override render with custom render
export { customRender as render };
