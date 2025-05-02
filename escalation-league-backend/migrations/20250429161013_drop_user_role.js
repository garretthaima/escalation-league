/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
    await knex.schema.table('users', (table) => {
        table.dropColumn('role'); // Drop the role column
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
    await knex.schema.table('users', (table) => {
        table.string('role').notNullable(); // Re-add the role column if rollback is needed
    });
};