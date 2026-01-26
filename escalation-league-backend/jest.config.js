module.exports = {
    testEnvironment: 'node',
    // setupFiles runs BEFORE modules are loaded - sets DB env vars to test database
    setupFiles: ['<rootDir>/tests/setupEnv.js'],
    // setupFilesAfterEnv runs after env setup - handles DB seeding and cleanup
    setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
    testMatch: ['**/tests/**/*.test.js'],

    // Coverage configuration
    collectCoverageFrom: [
        'controllers/**/*.js',
        'models/**/*.js',
        'routes/**/*.js',
        'middlewares/**/*.js',
        'services/**/*.js',
        'utils/**/*.js',
        '!**/node_modules/**',
        '!**/tests/**',
        '!**/migrations/**',
        '!**/seeds/**',
        '!**/scripts/**',
        // Infrastructure files that are always mocked in tests
        '!**/utils/redisClient.js',
        '!**/utils/settingsUtils.js'
    ],

    coverageDirectory: 'coverage',

    coverageReporters: [
        'text',           // Console output
        'text-summary',   // Brief summary
        'html',           // HTML report
        'lcov'            // For CI/CD tools
    ],

    coverageThreshold: {
        global: {
            branches: 70,
            functions: 70,
            lines: 70,
            statements: 70
        },
        // Optional: Per-file thresholds
        './controllers/**/*.js': {
            branches: 80,
            functions: 80,
            lines: 80,
            statements: 80
        }
    },

    // Run tests serially to prevent database conflicts
    maxWorkers: 1,
    testTimeout: 30000,

    // Better error messages
    verbose: true
};