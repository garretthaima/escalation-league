exports.up = async function (knex) {
    await knex.schema.createTable('role_requests', (table) => {
        table.increments('id').primary();
        table.integer('user_id').unsigned().notNullable().references('id').inTable('users').onDelete('CASCADE');
        table.integer('requested_role_id').unsigned().notNullable().references('id').inTable('roles').onDelete('CASCADE');
        table.string('status').notNullable().defaultTo('pending'); // 'pending', 'approved', 'rejected'
        table.text('admin_comment'); // Optional comment from the admin
        table.timestamp('created_at').defaultTo(knex.fn.now());
        table.timestamp('updated_at').defaultTo(knex.fn.now());
    });
};

exports.down = async function (knex) {
    await knex.schema.dropTableIfExists('role_requests');
};