/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
    // Insert default settings
    await knex('settings').insert([
        {
            key_name: 'token_expiration',
            value: '1h',
            description: 'Default expiration time for JWT tokens',
        },
        {
            key_name: 'google_client_id',
            value: '820878592438-k311ngrdvojgv1cbtn22gnsk0l7r97ju.apps.googleusercontent.com',
            description: 'Google OAuth client ID for authentication',
        },
        {
            key_name: 'secret_key',
            value: '9c9d42916c6eeef1a1db36e54dd128b3eb9c86114ed26b57a3163394ccedb6f1',
            description: 'Secret key used for signing JWT tokens',
        },
        {
            key_name: 'port',
            value: '3000',
            description: 'Port number for the application',
        },
        {
            key_name: 'max_login_attempts',
            value: '5',
            description: 'Maximum number of login attempts',
        },
        {
            key_name: 'feature_flags',
            value: '{"beta_feature": true, "maintenance_mode": false}',
            description: 'Feature flags for enabling/disabling features',
        },
        {
            key_name: 'smtp_host',
            value: 'smtp.example.com',
            description: 'SMTP server host',
        },
        {
            key_name: 'smtp_port',
            value: '587',
            description: 'SMTP server port',
        },
        {
            key_name: 'smtp_user',
            value: 'noreply@example.com',
            description: 'SMTP username',
        },
        {
            key_name: 'smtp_password',
            value: 'secure_smtp_password',
            description: 'SMTP password',
        },
        {
            key_name: 'max_token_expiration',
            value: '8h',
            description: 'Maximum allowed expiration time for JWT tokens',
        },
    ]);
};

exports.down = async function (knex) {
    // Delete all settings
    await knex('settings').del();
};