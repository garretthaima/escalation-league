const knex = require('knex');

// Use environment variables for flexibility
const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_USER = process.env.DB_USER || 'league_user';
const DB_PASSWORD = process.env.DB_PASSWORD || 'secure_password';
const DB_NAME = process.env.DB_NAME || 'escalation_league_dev';

// Initialize Knex
const db = knex({
    client: 'mysql2',
    connection: {
        host: DB_HOST,
        user: DB_USER,
        password: DB_PASSWORD,
        database: DB_NAME,
    },
    pool: { min: 2, max: 10 }, // Optional: Configure connection pooling
});

module.exports = db;