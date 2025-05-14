const { debug } = require('console');
const { connect } = require('http2');
const path = require('path');

// Load the appropriate .env file based on NODE_ENV
const envFile = process.env.NODE_ENV === 'production' ? '../.env.prod' : '../.env.dev';
require('dotenv').config({ path: path.resolve(__dirname, envFile) });

module.exports = {
    development: {
        client: 'mysql2',
        connection: {
            host: process.env.DEV_MYSQL_HOST || 'localhost',
            user: process.env.DEV_MYSQL_USER,
            password: process.env.DEV_MYSQL_PASSWORD,
            database: process.env.DEV_MYSQL_DATABASE,
            port: process.env.DEV_PORT || 3308
        },
        migrations: {
            directory: './migrations/escalation_league',
        },
        seeds: {
            directory: './seeds',
        },
    },
    production: {
        client: 'mysql2',
        connection: {
            host: process.env.PROD_MYSQL_HOST || 'localhost',
            user: process.env.PROD_MYSQL_USER,
            password: process.env.PROD_MYSQL_PASSWORD,
            database: process.env.PROD_MYSQL_DATABASE,
            port: process.env.PROD_PORT || 3306,
        },
        migrations: {
            directory: './migrations/escalation_league',
        },
        seeds: {
            directory: './seeds',
        },
    },
    scryfall: {
        client: 'mysql2',
        connection: {
            host: '10.10.11.20',
            user: process.env.CARD_MYSQL_USER,
            password: process.env.CARD_MYSQL_PASSWORD,
            database: process.env.CARD_MYSQL_DATABASE || 'scryfall_card_db',
            port: process.env.CARD_MYSQL_PORT || 3307
        },
        migrations: {
            directory: './migrations/scryfall',
        },
        seeds: {
            directory: './seeds/scryfall',
        }
    },
};