/**
 * Add attendance admin permissions to super_admin role
 * (The previous migration only assigned them to league_admin)
 */
exports.up = async function(knex) {
    const permissionIds = [60, 61, 62, 63]; // attendance admin permissions
    const superAdminRole = await knex('roles').where('name', 'super_admin').first();

    if (superAdminRole) {
        for (const permId of permissionIds) {
            const exists = await knex('role_permissions')
                .where({ role_id: superAdminRole.id, permission_id: permId })
                .first();
            if (!exists) {
                await knex('role_permissions').insert({
                    role_id: superAdminRole.id,
                    permission_id: permId
                });
            }
        }
    }

    console.log('✅ Added attendance admin permissions to super_admin');
};

exports.down = async function(knex) {
    const permissionIds = [60, 61, 62, 63];
    const superAdminRole = await knex('roles').where('name', 'super_admin').first();

    if (superAdminRole) {
        await knex('role_permissions')
            .where('role_id', superAdminRole.id)
            .whereIn('permission_id', permissionIds)
            .del();
    }

    console.log('✅ Removed attendance admin permissions from super_admin');
};
