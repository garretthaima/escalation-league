exports.up = async function (knex) {
    // Check if the google_id column exists
    const hasGoogleId = await knex.schema.hasColumn('users', 'google_id');

    // Alter the users table
    return knex.schema.alterTable('users', (table) => {
        // Drop the username column
        table.dropColumn('username');

        // Ensure email is unique and not nullable
        table.string('email').notNullable().alter();

        // Make password nullable
        table.string('password').nullable().alter();

        // Add google_id column if it doesn't exist
        if (!hasGoogleId) {
            table.string('google_id').unique().nullable();
        }
    });
};

exports.down = async function (knex) {
    // Alter the users table to revert changes
    return knex.schema.alterTable('users', (table) => {
        // Re-add the username column
        table.string('username').unique().notNullable();

        // Revert email to nullable (if needed)
        table.string('email').nullable().alter();

        // Revert password to not nullable
        table.string('password').notNullable().alter();

        // Drop the google_id column if it was added
        table.dropColumn('google_id');
    });
};