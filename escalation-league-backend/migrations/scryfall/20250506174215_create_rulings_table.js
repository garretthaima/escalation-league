exports.up = function (knex) {
    return knex.schema.createTable('rulings', (table) => {
        table.increments('id').primary(); // Auto-incrementing ID
        table.string('oracle_id'); // Oracle ID (links to `cards.oracle_id`)
        table.date('ruling_date'); // Date of the ruling
        table.text('comment'); // Ruling text
        table.timestamp('created_at').defaultTo(knex.fn.now());
    });
};

exports.down = function (knex) {
    return knex.schema.dropTableIfExists('rulings');
};