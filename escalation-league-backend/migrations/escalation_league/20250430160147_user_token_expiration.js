/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
    return knex.schema.createTable('user_settings', (table) => {
        table.increments('id').primary(); // Auto-incrementing ID
        table.integer('user_id').unsigned().notNullable().references('id').inTable('users').onDelete('CASCADE'); // Foreign key to users table
        table.string('key_name').notNullable(); // Setting key (e.g., 'token_expiration', 'dark_mode')
        table.string('value').notNullable(); // Setting value (e.g., '8h', 'true')
        table.timestamps(true, true); // created_at and updated_at timestamps

        table.unique(['user_id', 'key_name']); // Ensure unique settings per user
    });
};

exports.down = function (knex) {
    return knex.schema.dropTableIfExists('user_settings');
};