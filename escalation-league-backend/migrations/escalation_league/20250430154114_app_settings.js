/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
    return knex.schema.createTable('settings', (table) => {
        table.increments('id').primary(); // Auto-incrementing ID
        table.string('key_name').notNullable().unique(); // Unique key for the setting
        table.text('value').notNullable(); // Value of the setting
        table.text('description'); // Optional description for the setting
        table.timestamps(true, true); // created_at and updated_at timestamps
    });
};

exports.down = function (knex) {
    return knex.schema.dropTableIfExists('settings');
};