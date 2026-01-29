/**
 * Jest configuration for smoke tests (critical path only)
 * Used during deployment to quickly validate core functionality
 * Full test suite runs in CI/CD pipeline
 */
module.exports = {
    // Inherit from main config
    ...require('./jest.config'),

    // Only run critical test files
    testMatch: [
        '**/tests/routes/auth.test.js',      // Auth is critical
        '**/tests/routes/leagues.test.js',    // Core business logic
        '**/tests/routes/pods.test.js',       // Game management
        '**/tests/routes/users.test.js',      // User management
    ],

    // Run tests sequentially to avoid DB conflicts
    // Still fast enough (~22s) for critical path validation
    runInBand: true,

    // Shorter timeout for smoke tests
    testTimeout: 10000,

    // Don't collect coverage for smoke tests
    collectCoverage: false,
};
