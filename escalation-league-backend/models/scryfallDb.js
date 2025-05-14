const knex = require('knex');
const path = require('path');

// Load the appropriate .env file based on NODE_ENV
const envFile = process.env.NODE_ENV === 'production' ? '../.env.prod' : '../.env.dev';
require('dotenv').config({ path: path.resolve(__dirname, envFile) });


// Initialize Knex
const scryfallDb = knex({
    client: 'mysql2',
    connection: {
        host: process.env.CARD_MYSQL_HOST,
        user: process.env.CARD_MYSQL_USER,
        password: process.env.CARD_MYSQL_PASSWORD,
        database: process.env.CARD_MYSQL_DATABASE,
        port: process.env.CARD_MYSQL_PORT,
    },
    pool: { min: 2, max: 10 }, // Optional: Configure connection pooling
});

// Debugging: Log the database connection details
console.log('Scryfall Database connection details:', {
    host: process.env.CARD_MYSQL_HOST,
    user: process.env.CARD_MYSQL_USER,
    database: process.env.CARD_MYSQL_DATABASE,
    port: process.env.CARD_MYSQL_PORT,
});

module.exports = scryfallDb;