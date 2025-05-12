exports.up = async function (knex) {
    console.log('Removing unique constraint on is_active column in leagues table.');

    // Drop the unique constraint on is_active
    await knex.schema.alterTable('leagues', (table) => {
        table.dropUnique('is_active', 'unique_active_league');
    });

    console.log('Unique constraint removed successfully.');
};

exports.down = async function (knex) {
    console.log('Re-adding unique constraint on is_active column in leagues table.');

    // Re-add the unique constraint on is_active
    await knex.schema.alterTable('leagues', (table) => {
        table.unique('is_active', 'unique_active_league');
    });

    console.log('Unique constraint re-added successfully.');
};