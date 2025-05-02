/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
    // Create roles table
    await knex.schema.createTable('roles', (table) => {
        table.increments('id').primary(); // Role ID
        table.string('name').notNullable().unique(); // Role name (e.g., 'admin', 'user')
        table.string('description').nullable(); // Optional description of the role
        table.timestamps(true, true); // Created/updated timestamps
    });

    // Create permissions table
    await knex.schema.createTable('permissions', (table) => {
        table.increments('id').primary(); // Permission ID
        table.string('name').notNullable().unique(); // Permission name (e.g., 'manage_users')
        table.string('description').nullable(); // Optional description of the permission
        table.timestamps(true, true); // Created/updated timestamps
    });

    // Create role_permissions table
    await knex.schema.createTable('role_permissions', (table) => {
        table.increments('id').primary(); // Role-Permission ID
        table.integer('role_id').unsigned().notNullable().references('id').inTable('roles').onDelete('CASCADE'); // Foreign key to roles
        table.integer('permission_id').unsigned().notNullable().references('id').inTable('permissions').onDelete('CASCADE'); // Foreign key to permissions
        table.timestamps(true, true); // Created/updated timestamps
    });

    // Add role_id column to users table
    await knex.schema.table('users', (table) => {
        table.integer('role_id').unsigned().references('id').inTable('roles').onDelete('SET NULL'); // Foreign key to roles
    });
};

exports.down = async function (knex) {
    // Drop role_id column from users table
    await knex.schema.table('users', (table) => {
        table.dropColumn('role_id');
    });

    // Drop role_permissions table
    await knex.schema.dropTableIfExists('role_permissions');

    // Drop permissions table
    await knex.schema.dropTableIfExists('permissions');

    // Drop roles table
    await knex.schema.dropTableIfExists('roles');
};