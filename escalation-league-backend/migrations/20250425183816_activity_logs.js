exports.up = async function (knex) {
    await knex.schema.createTable('activity_logs', (table) => {
        table.increments('id').primary();
        table.integer('user_id').unsigned().references('id').inTable('users').onDelete('CASCADE');
        table.string('action').notNullable();
        table.timestamp('timestamp').defaultTo(knex.fn.now());
        table.json('metadata').nullable(); // Optional metadata for additional details
    });
};

exports.down = async function (knex) {
    await knex.schema.dropTable('activity_logs');
};