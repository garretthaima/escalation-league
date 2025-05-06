const knex = require('knex');

// Use environment variables for flexibility
const DB_HOST = process.env.PROD_DB_HOST || 'localhost';
const DB_USER = process.env.PROD_MYSQL_USER || process.env.DEV_MYSQL_USER || 'league_user';
const DB_PASSWORD = process.env.PROD_MYSQL_PASSWORD || process.env.DEV_MYSQL_PASSWORD || 'secure_password';
const DB_NAME = process.env.PROD_MYSQL_DATABASE || process.env.DEV_MYSQL_DATABASE || 'escalation_league_dev';
const DB_PORT = process.env.PROD_DB_PORT || process.env.DEV_PORT || 3306;

// Initialize Knex
const db = knex({
    client: 'mysql2',
    connection: {
        host: DB_HOST,
        user: DB_USER,
        password: DB_PASSWORD,
        database: DB_NAME,
        port: DB_PORT,
    },
    pool: { min: 2, max: 10 }, // Optional: Configure connection pooling
});

// Debugging: Log the database connection details
console.log('Database connection details:', {
    host: DB_HOST,
    user: DB_USER,
    database: DB_NAME,
    port: DB_PORT,
});

module.exports = db;