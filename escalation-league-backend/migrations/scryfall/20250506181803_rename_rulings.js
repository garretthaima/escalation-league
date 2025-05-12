exports.up = function (knex) {
    return knex.schema.table('rulings', (table) => {
        table.renameColumn('ruling_date', 'published_at'); // Rename the column
    });
};

exports.down = function (knex) {
    return knex.schema.table('rulings', (table) => {
        table.renameColumn('published_at', 'ruling_date'); // Revert the column name
    });
};