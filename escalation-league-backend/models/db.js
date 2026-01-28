const knex = require('knex');

// Use environment variables for flexibility
const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_USER = process.env.DB_USER || 'league_user';
const DB_PASSWORD = process.env.DB_PASSWORD || 'secure_password';
const DB_NAME = process.env.DB_NAME || 'escalation_league_dev';
const DB_PORT = process.env.DB_PORT || 3306;

// Initialize Knex
const db = knex({
    client: 'mysql2',
    connection: {
        host: DB_HOST,
        user: DB_USER,
        password: DB_PASSWORD,
        database: DB_NAME,
        port: DB_PORT,
        // Return DATE/DATETIME as strings to avoid timezone conversion issues
        dateStrings: ['DATE'],
    },
    pool: { min: 2, max: 10 },
});

// Debugging: Log the database connection details
console.log('Database connection details:', {
    host: DB_HOST,
    user: DB_USER,
    database: DB_NAME,
    port: DB_PORT,
});

module.exports = db;