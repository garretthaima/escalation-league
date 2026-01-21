/**
 * Create refresh_tokens table for secure token-based authentication
 * Supports token rotation, revocation, and device tracking
 */
exports.up = async function (knex) {
    console.log('Creating refresh_tokens table...');

    await knex.schema.createTable('refresh_tokens', (table) => {
        table.increments('id').primary();
        table.integer('user_id').unsigned().notNullable();
        table.string('token_hash', 64).notNullable().unique(); // SHA-256 hash
        table.string('device_info', 255).nullable(); // User agent / device identifier
        table.string('ip_address', 45).nullable(); // IPv4 or IPv6
        table.timestamp('expires_at').notNullable();
        table.timestamp('created_at').defaultTo(knex.fn.now());
        table.timestamp('last_used_at').defaultTo(knex.fn.now());
        table.boolean('is_revoked').defaultTo(false);

        // Foreign key
        table.foreign('user_id').references('id').inTable('users').onDelete('CASCADE');

        // Indexes for common queries
        table.index('user_id', 'idx_refresh_tokens_user_id');
        table.index('token_hash', 'idx_refresh_tokens_token_hash');
        table.index('expires_at', 'idx_refresh_tokens_expires_at');
        table.index(['user_id', 'is_revoked'], 'idx_refresh_tokens_user_active');
    });

    // Add settings for token expiration configuration (idempotent)
    const existingAccessSetting = await knex('settings')
        .where({ key_name: 'access_token_expiration' })
        .first();

    if (!existingAccessSetting) {
        await knex('settings').insert({
            key_name: 'access_token_expiration',
            value: '15m',
            description: 'Expiration time for JWT access tokens'
        });
    }

    const existingRefreshSetting = await knex('settings')
        .where({ key_name: 'refresh_token_expiration' })
        .first();

    if (!existingRefreshSetting) {
        await knex('settings').insert({
            key_name: 'refresh_token_expiration',
            value: '30d',
            description: 'Expiration time for refresh tokens'
        });
    }

    console.log('refresh_tokens table created successfully');
};

exports.down = async function (knex) {
    await knex.schema.dropTableIfExists('refresh_tokens');
    await knex('settings')
        .whereIn('key_name', ['access_token_expiration', 'refresh_token_expiration'])
        .del();
};
