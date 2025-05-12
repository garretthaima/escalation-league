exports.up = function (knex) {
    return knex.schema.table('user_leagues', (table) => {
        table.integer('request_id').unsigned().nullable(); // Add request_id column
        table.foreign('request_id').references('id').inTable('league_signup_requests'); // Foreign key
    });
};

exports.down = function (knex) {
    return knex.schema.table('user_leagues', (table) => {
        table.dropColumn('request_id'); // Remove request_id column
    });
};