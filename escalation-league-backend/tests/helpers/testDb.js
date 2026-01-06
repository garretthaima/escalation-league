require('dotenv').config({ path: '../../.env.dev' });
require('dotenv').config({ path: '../.env.dev' });

const knex = require('knex');

const testDb = knex({
    client: 'mysql2',
    connection: {
        host: process.env.TEST_DB_HOST || 'db-dev',
        port: parseInt(process.env.TEST_DB_PORT || '3308'),
        user: process.env.TEST_DB_USER || 'league_user',
        password: process.env.TEST_DB_PASSWORD,
        database: process.env.TEST_DB_NAME || 'escalation_league_test'
    },
    migrations: {
        directory: './migrations/escalation_league',
        tableName: 'knex_migrations'
    },
    pool: { min: 2, max: 10 }
});

console.log('Test DB configured:', {
    host: process.env.TEST_DB_HOST || 'db-dev',
    port: process.env.TEST_DB_PORT || '3308',
    database: process.env.TEST_DB_NAME || 'escalation_league_test'
});

module.exports = testDb;