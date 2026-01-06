exports.up = async function (knex) {
    await knex.schema.alterTable('leagues', (table) => {
        table.integer('points_per_win').defaultTo(4);
        table.integer('points_per_loss').defaultTo(1);
        table.integer('points_per_draw').defaultTo(1);
    });
};

exports.down = async function (knex) {
    await knex.schema.alterTable('leagues', (table) => {
        table.dropColumn('points_per_win');
        table.dropColumn('points_per_loss');
        table.dropColumn('points_per_draw');
    });
};
