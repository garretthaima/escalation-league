exports.up = async function (knex) {
    await knex.schema.alterTable('games', (table) => {
        table.timestamp('deleted_at').nullable();
    });
};

exports.down = async function (knex) {
    await knex.schema.alterTable('games', (table) => {
        table.dropColumn('deleted_at');
    });
};