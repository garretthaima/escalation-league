exports.up = function (knex) {
    return knex.schema.table('user_leagues', (table) => {
        table.string('commander_partner').nullable(); // Add commander_partner column
    });
};

exports.down = function (knex) {
    return knex.schema.table('user_leagues', (table) => {
        table.dropColumn('commander_partner'); // Remove commander_partner column
    });
};