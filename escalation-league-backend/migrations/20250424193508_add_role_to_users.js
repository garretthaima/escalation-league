exports.up = async function (knex) {
    await knex.schema.alterTable('users', (table) => {
        table.string('role').notNullable().defaultTo('user'); // Add role column with default value 'user'
    });
};

exports.down = async function (knex) {
    await knex.schema.alterTable('users', (table) => {
        table.dropColumn('role'); // Remove role column
    });
};