exports.up = async function (knex) {
    await knex.schema.alterTable('users', (table) => {
        table.boolean('is_deleted').defaultTo(false); // Add is_deleted column with a default value of false
    });
};

exports.down = async function (knex) {
    await knex.schema.alterTable('users', (table) => {
        table.dropColumn('is_deleted'); // Remove is_deleted column on rollback
    });
};