/**
 * Migration to add email verification and password reset functionality
 */
exports.up = async function (knex) {
    // Add email_verified columns to users table
    const hasEmailVerified = await knex.schema.hasColumn('users', 'email_verified');
    if (!hasEmailVerified) {
        await knex.schema.alterTable('users', (table) => {
            table.boolean('email_verified').defaultTo(false);
            table.timestamp('email_verified_at').nullable();
        });
        console.log('Added email_verified columns to users table');
    }

    // Create email verification tokens table
    const verificationTableExists = await knex.schema.hasTable('email_verification_tokens');
    if (!verificationTableExists) {
        await knex.schema.createTable('email_verification_tokens', (table) => {
            table.increments('id').primary();
            table.integer('user_id').unsigned().notNullable()
                .references('id').inTable('users').onDelete('CASCADE');
            table.string('token_hash', 64).notNullable().unique();
            table.timestamp('expires_at').notNullable();
            table.timestamp('created_at').defaultTo(knex.fn.now());
            table.boolean('is_used').defaultTo(false);

            table.index(['user_id']);
            table.index(['token_hash']);
        });
        console.log('Created email_verification_tokens table');
    }

    // Create password reset tokens table
    const resetTableExists = await knex.schema.hasTable('password_reset_tokens');
    if (!resetTableExists) {
        await knex.schema.createTable('password_reset_tokens', (table) => {
            table.increments('id').primary();
            table.integer('user_id').unsigned().notNullable()
                .references('id').inTable('users').onDelete('CASCADE');
            table.string('token_hash', 64).notNullable().unique();
            table.timestamp('expires_at').notNullable();
            table.timestamp('created_at').defaultTo(knex.fn.now());
            table.boolean('is_used').defaultTo(false);

            table.index(['user_id']);
            table.index(['token_hash']);
        });
        console.log('Created password_reset_tokens table');
    }

    // Grandfather existing users as verified (they registered before this feature)
    await knex('users')
        .whereNull('email_verified')
        .orWhere('email_verified', false)
        .update({
            email_verified: true,
            email_verified_at: knex.fn.now()
        });
    console.log('Marked existing users as email verified');
};

exports.down = async function (knex) {
    await knex.schema.dropTableIfExists('password_reset_tokens');
    await knex.schema.dropTableIfExists('email_verification_tokens');

    const hasEmailVerified = await knex.schema.hasColumn('users', 'email_verified');
    if (hasEmailVerified) {
        await knex.schema.alterTable('users', (table) => {
            table.dropColumn('email_verified');
            table.dropColumn('email_verified_at');
        });
    }
};
