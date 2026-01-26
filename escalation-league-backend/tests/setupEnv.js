/**
 * This file runs BEFORE any modules are loaded.
 * It sets environment variables so that models/db.js connects to the test database.
 */

// Load test environment variables
require('dotenv').config({ path: '../.env.dev' });

// Override DB connection to use test database
process.env.DB_HOST = process.env.TEST_DB_HOST || 'db-dev';
process.env.DB_PORT = process.env.TEST_DB_PORT || '3308';
process.env.DB_NAME = process.env.TEST_DB_NAME || 'escalation_league_test';
process.env.DB_USER = process.env.TEST_DB_USER || process.env.DB_USER;
process.env.DB_PASSWORD = process.env.TEST_DB_PASSWORD || process.env.DB_PASSWORD;

console.log('Test environment configured:', {
    DB_HOST: process.env.DB_HOST,
    DB_PORT: process.env.DB_PORT,
    DB_NAME: process.env.DB_NAME
});
