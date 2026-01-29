/**
 * Migration to add default_timezone setting
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
    return knex('settings').insert({
        key_name: 'default_timezone',
        value: 'America/Chicago',
        description: 'Default timezone for the application. Used for date/time display and calculations. Uses IANA timezone identifiers (e.g., America/New_York, America/Chicago, Europe/London).'
    });
};

exports.down = function (knex) {
    return knex('settings').where({ key_name: 'default_timezone' }).del();
};
