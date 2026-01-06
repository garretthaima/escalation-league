/**
 * Migration to add budget_manage permissions to league_user role
 */
exports.up = async function (knex) {
    console.log('🔑 Adding budget permissions to league_user role...');

    // Add budget_manage and budget_read permissions to league_user (role_id 6)
    const permissions = [
        { role_id: 6, permission_id: 24 }, // budget_manage
        { role_id: 6, permission_id: 25 }, // budget_read
    ];

    for (const perm of permissions) {
        const exists = await knex('role_permissions').where(perm).first();
        if (!exists) {
            await knex('role_permissions').insert(perm);
            console.log(`✓ Added permission ${perm.permission_id} to role ${perm.role_id}`);
        } else {
            console.log(`- Permission ${perm.permission_id} already exists for role ${perm.role_id}`);
        }
    }

    console.log('✅ Budget permissions added successfully');
};

exports.down = async function (knex) {
    console.log('🔑 Removing budget permissions from league_user role...');

    await knex('role_permissions')
        .where({ role_id: 6, permission_id: 24 })
        .orWhere({ role_id: 6, permission_id: 25 })
        .delete();

    console.log('✅ Budget permissions removed');
};
