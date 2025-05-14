exports.up = function (knex) {
    // Add `win_condition_id` to `game_pods`
    return knex.schema.alterTable('exclusions', (table) => {
        table.string('set_type', 50).nullable(); // Set code

    });
};

exports.down = function (knex) {
    return knex.schema.alterTable('exclusions', (table) => {
        table.dropColumn('set_type'); // Remove the set_type column
    });
};