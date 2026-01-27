/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
    // Add Discord requirement feature flags
    await knex('settings').insert([
        {
            key_name: 'discord_required_for_game_creation',
            value: 'false',
            description: 'When true, users must link their Discord account to create games',
        },
        {
            key_name: 'discord_required_for_league_signup',
            value: 'false',
            description: 'When true, users must link their Discord account to sign up for a league',
        },
    ]);
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
    await knex('settings')
        .whereIn('key_name', [
            'discord_required_for_game_creation',
            'discord_required_for_league_signup',
        ])
        .del();
};
