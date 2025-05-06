/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
    // Rename the column in the user_leagues table
    await knex.schema.table('user_leagues', (table) => {
        table.renameColumn('decklist_url', 'deck_id'); // Rename the column
    });

    // Alter the column type (if necessary)
    await knex.schema.table('user_leagues', (table) => {
        table.string('deck_id').alter(); // Ensure the column is a string
    });

    // Add the deck_validate permission to the permissions table
    await knex('permissions').insert({
        id: 43, // Use the next available ID
        name: 'deck_validate',
        description: 'Allow users to validate and cache decks',
    });

    // Assign the deck_validate permission to the user role
    const userRoleId = await knex('roles').where({ name: 'user' }).select('id').first();
    if (userRoleId) {
        await knex('role_permissions').insert({
            role_id: userRoleId.id,
            permission_id: 43, // ID of the deck_validate permission
        });
    }
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
    // Revert the column name in the user_leagues table
    await knex.schema.table('user_leagues', (table) => {
        table.renameColumn('deck_id', 'decklist_url'); // Revert the column name
    });

    // Revert the column type (if necessary)
    await knex.schema.table('user_leagues', (table) => {
        table.text('decklist_url').alter(); // Revert the column type
    });

    // Remove the deck_validate permission from the role_permissions table
    const deckValidatePermission = await knex('permissions').where({ name: 'deck_validate' }).select('id').first();
    if (deckValidatePermission) {
        await knex('role_permissions').where({ permission_id: deckValidatePermission.id }).del();
    }

    // Remove the deck_validate permission from the permissions table
    await knex('permissions').where({ name: 'deck_validate' }).del();
};