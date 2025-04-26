const mysql = require('mysql2');

const config = {
    development: {
        host: 'localhost',
        user: 'league_user',
        password: 'uwtsSU8WTdGSTk!cH&%6kEeb!pN996T&jL*ZcnUwdn2zEZd@',
        database: 'escalation_league_dev',
    },
    production: {
        host: 'localhost',
        user: 'league_user',
        password: 'uwtsSU8WTdGSTk!cH&%6kEeb!pN996T&jL*ZcnUwdn2zEZd@',
        database: 'escalation_league_prod',
    },
};

const env = process.env.NODE_ENV || 'development';
const pool = mysql.createPool(config[env]);

module.exports = pool.promise();