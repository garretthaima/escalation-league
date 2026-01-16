/**
 * Migration to add pod_create permission to pod_admin role
 *
 * Issue: pod_admin role has admin_pod_create (id: 50) but the POST /pods route
 * requires pod_create (id: 36). This prevents pod_admins from creating games.
 */
exports.up = async function (knex) {
    const podAdminRoleId = 3;
    const podCreatePermissionId = 36;

    // Check if the permission mapping already exists
    const existing = await knex('role_permissions')
        .where({ role_id: podAdminRoleId, permission_id: podCreatePermissionId })
        .first();

    if (!existing) {
        await knex('role_permissions').insert({
            role_id: podAdminRoleId,
            permission_id: podCreatePermissionId
        });
    }
};

exports.down = async function (knex) {
    const podAdminRoleId = 3;
    const podCreatePermissionId = 36;

    await knex('role_permissions')
        .where({ role_id: podAdminRoleId, permission_id: podCreatePermissionId })
        .del();
};
