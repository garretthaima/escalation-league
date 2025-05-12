/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */

exports.up = async function (knex) {
    await knex('settings').insert([
        {
            key_name: 'frontend_url',
            value: 'http://localhost:3001', // Default value for dev
            description: 'URL for the frontend application',
        },
    ]);
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
    await knex('settings').where({ key_name: 'frontend_url' }).del();
};