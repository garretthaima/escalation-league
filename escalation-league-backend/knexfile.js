module.exports = {
    development: {
        client: 'mysql2',
        connection: {
            host: 'localhost',
            user: 'league_user',
            password: 'uwtsSU8WTdGSTk!cH&%6kEeb!pN996T&jL*ZcnUwdn2zEZd@',
            database: 'escalation_league_dev',
        },
        migrations: {
            directory: './migrations',
        },
    },
    production: {
        client: 'mysql2',
        connection: {
            host: 'your-production-host',
            user: 'league_user',
            password: 'uwtsSU8WTdGSTk!cH&%6kEeb!pN996T&jL*ZcnUwdn2zEZd@',
            database: 'escalation_league_prod',
        },
        migrations: {
            directory: './migrations',
        },
    },
};