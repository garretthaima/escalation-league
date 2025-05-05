require('dotenv').config();
const bcrypt = require('bcrypt');

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
    // Fetch the role ID for super_admin
    const superAdminRole = await knex('roles').where({ name: 'super_admin' }).first();

    // Use a fallback value if SECRET_KEY is not defined
    const adminPassword = '';

    // Generate a hashed password for the admin
    const hashedAdminPassword = await bcrypt.hash(adminPassword, 10);

    // Insert the admin user with id: 1
    await knex('users').insert({
        id: 1,
        email: 'admin',
        firstname: 'Admin',
        lastname: 'User',
        role_id: superAdminRole.id,
        password: hashedAdminPassword,
    });

    console.log('Admin user created successfully!');
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
    // Delete the admin user with id: 1
    await knex('users').where({ id: 1 }).del();
};