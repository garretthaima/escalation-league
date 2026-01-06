/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
    // Add budget_manage_league permission to league_admin role (role 2)
    const exists = await knex('role_permissions')
        .where({ role_id: 2, permission_id: 26 })
        .first();

    if (!exists) {
        await knex('role_permissions').insert({
            role_id: 2,
            permission_id: 26
        });
    }
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
    await knex('role_permissions')
        .where({ role_id: 2, permission_id: 26 })
        .del();
};
