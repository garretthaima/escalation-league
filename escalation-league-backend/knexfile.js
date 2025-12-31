require('dotenv').config({ path: '../.env.prod' });
require('dotenv').config({ path: '../.env.dev' });
require('dotenv').config({ path: '.env.prod' });
require('dotenv').config({ path: '.env.dev' });

module.exports = {
    production: {
        client: 'mysql2',
        connection: {
            host: process.env.DB_HOST || 'db-prod',
            port: parseInt(process.env.DB_PORT || '3306'),
            user: process.env.DB_USER || 'prod_user',
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME || 'escalation_league_prod',
        },
        migrations: {
            directory: './migrations/escalation_league',
            tableName: 'knex_migrations',
        },
        seeds: {
            directory: './seeds',
        },
    },

    development: {
        client: 'mysql2',
        connection: {
            host: process.env.DB_HOST || 'db-dev',
            port: parseInt(process.env.DB_PORT || '3306'),
            user: process.env.DB_USER || 'league_user',
            password: process.env.DB_PASSWORD || 'uwtsSU8WTdGSTk!cH&%6kEeb!pN996T&jL*ZcnUwdn2zEZd@',
            database: process.env.DB_NAME || 'escalation_league_dev',
        },
        migrations: {
            directory: './migrations/escalation_league',
            tableName: 'knex_migrations',
        },
        seeds: {
            directory: './seeds',
        },
    },

    scryfall: {
        client: 'mysql2',
        connection: {
            host: process.env.CARD_DB_HOST || 'card-db',
            port: parseInt(process.env.CARD_DB_PORT || '3306'),
            user: process.env.CARD_DB_USER || 'card_user',
            password: process.env.CARD_DB_PASSWORD,
            database: process.env.CARD_DB_NAME || 'scryfall_card_db',
        },
        migrations: {
            directory: './migrations/scryfall',
            tableName: 'knex_migrations_scryfall',
        },
        seeds: {
            directory: './seeds/scryfall',
        },
    },

    test: {
        client: 'mysql2',
        connection: {
            host: process.env.TEST_DB_HOST || 'db-dev',
            port: parseInt(process.env.TEST_DB_PORT || '3306'),
            user: process.env.TEST_DB_USER || 'league_user',
            password: process.env.TEST_DB_PASSWORD,
            database: process.env.TEST_DB_NAME || 'escalation_league_test',
        },
        migrations: {
            directory: './migrations/escalation_league',
            tableName: 'knex_migrations',
        },
        seeds: {
            directory: './seeds',
        },
    },
};