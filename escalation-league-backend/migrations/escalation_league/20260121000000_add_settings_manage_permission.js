/**
 * Add settings management permission
 * Only superadmin should have this permission by default
 */
exports.up = async function(knex) {
    const permission = {
        id: 64,
        name: 'settings_manage',
        description: 'Allow managing application settings'
    };

    // Insert permission (ignore if it already exists)
    const exists = await knex('permissions').where('id', permission.id).first();
    if (!exists) {
        await knex('permissions').insert(permission);
    }

    // Get the superadmin role
    const superadminRole = await knex('roles').where('name', 'superadmin').first();

    if (superadminRole) {
        // Assign permission to superadmin
        const rolePermExists = await knex('role_permissions')
            .where({ role_id: superadminRole.id, permission_id: permission.id })
            .first();
        if (!rolePermExists) {
            await knex('role_permissions').insert({
                role_id: superadminRole.id,
                permission_id: permission.id
            });
        }
    }

    console.log('✅ Added settings_manage permission');
};

exports.down = async function(knex) {
    const permissionId = 64;

    // Remove role_permissions entries
    await knex('role_permissions').where('permission_id', permissionId).del();

    // Remove permission
    await knex('permissions').where('id', permissionId).del();

    console.log('✅ Removed settings_manage permission');
};
