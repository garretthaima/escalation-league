/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
    // Alter the `confirmation_status` column to use an ENUM with the new statuses
    await knex.schema.alterTable('game_pods', (table) => {
        table
            .enum('confirmation_status', ['open', 'active', 'pending', 'complete'])
            .defaultTo('open')
            .alter(); // Change the column type and set a default value
    });

    // Update existing rows to match the new enum values
    await knex('game_pods')
        .where('confirmation_status', 0) // Previously `false`
        .update({ confirmation_status: 'open' });

    await knex('game_pods')
        .where('confirmation_status', 1) // Previously `true`
        .update({ confirmation_status: 'complete' });
};

exports.down = async function (knex) {
    // Revert the `confirmation_status` column back to a boolean
    await knex.schema.alterTable('game_pods', (table) => {
        table.boolean('confirmation_status').defaultTo(false).alter();
    });

    // Update rows back to boolean values
    await knex('game_pods')
        .where('confirmation_status', 'open')
        .update({ confirmation_status: 0 });

    await knex('game_pods')
        .where('confirmation_status', 'complete')
        .update({ confirmation_status: 1 });
};