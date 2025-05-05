require('dotenv').config({ path: '../.env' }); // Adjust the path to point to the root .env file

module.exports = {
    development: {
        client: 'mysql2',
        connection: {
            host: process.env.DEV_MYSQL_HOST || 'localhost',
            user: process.env.DEV_MYSQL_USER,
            password: process.env.DEV_MYSQL_PASSWORD,
            database: process.env.DEV_MYSQL_DATABASE,
            port: process.env.DEV_PORT || 3306,
        },
        migrations: {
            directory: './migrations',
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
            directory: './migrations',
        },
        seeds: {
            directory: './seeds',
        },
    },
};