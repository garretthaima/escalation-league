exports.up = async function (knex) {
    // Insert new admin-specific permissions
    const newPermissions = [
        { id: 50, name: 'admin_pod_create', description: 'Allow admins to create pods' },
        { id: 51, name: 'admin_pod_read', description: 'Allow admins to view pods' },
        { id: 52, name: 'admin_pod_update', description: 'Allow admins to update pods' },
        { id: 53, name: 'admin_pod_delete', description: 'Allow admins to delete pods' },
    ];

    // Return the promise chain
    return knex('permissions')
        .insert(newPermissions)
        .then(async () => {
            // Assign the new permissions to the pod_admin role
            const podAdminRoleId = await knex('roles').where({ name: 'pod_admin' }).select('id').first();

            const rolePermissions = newPermissions.map((permission) => ({
                role_id: podAdminRoleId.id,
                permission_id: permission.id,
            }));

            return knex('role_permissions').insert(rolePermissions);
        });
};

exports.down = async function (knex) {
    const permissionIds = [50, 51, 52, 53];

    // Return the promise chain
    return knex('role_permissions')
        .whereIn('permission_id', permissionIds)
        .del()
        .then(() => knex('permissions').whereIn('id', permissionIds).del());
};