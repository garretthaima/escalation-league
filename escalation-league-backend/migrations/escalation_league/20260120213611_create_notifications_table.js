/**
 * Migration to create notifications table
 */
exports.up = async function (knex) {
    // Check if table already exists (may have been created manually)
    const tableExists = await knex.schema.hasTable('notifications');

    if (!tableExists) {
        await knex.schema.createTable('notifications', (table) => {
            table.increments('id').primary();
            table.integer('user_id').unsigned().notNullable()
                .references('id').inTable('users').onDelete('CASCADE');
            table.string('title', 255).notNullable();
            table.text('message').nullable();
            table.enum('type', ['info', 'success', 'warning', 'error']).notNullable().defaultTo('info');
            table.string('link', 500).nullable(); // URL to navigate to when clicked
            table.boolean('is_read').notNullable().defaultTo(false);
            table.timestamp('read_at').nullable();
            table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());

            // Index for efficient queries
            table.index(['user_id', 'is_read']);
            table.index(['user_id', 'created_at']);
        });
        console.log('Created notifications table');
    } else {
        // Table exists, check if link column exists and add it if not
        const hasLinkColumn = await knex.schema.hasColumn('notifications', 'link');
        if (!hasLinkColumn) {
            await knex.schema.alterTable('notifications', (table) => {
                table.string('link', 500).nullable().after('type');
            });
            console.log('Added link column to notifications table');
        }
    }
};

exports.down = async function (knex) {
    await knex.schema.dropTableIfExists('notifications');
};
