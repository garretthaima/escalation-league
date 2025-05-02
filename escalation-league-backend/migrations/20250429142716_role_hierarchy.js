/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
    return knex.schema.createTable('role_hierarchy', (table) => {
        table.integer('parent_role_id').unsigned().notNullable();
        table.integer('child_role_id').unsigned().notNullable();
        table.primary(['parent_role_id', 'child_role_id']);
        table
            .foreign('parent_role_id')
            .references('id')
            .inTable('roles')
            .onDelete('CASCADE');
        table
            .foreign('child_role_id')
            .references('id')
            .inTable('roles')
            .onDelete('CASCADE');
    });
};

exports.down = function (knex) {
    return knex.schema.dropTableIfExists('role_hierarchy');
};