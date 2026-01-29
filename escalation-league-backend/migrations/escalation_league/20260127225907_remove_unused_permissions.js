/**
 * Remove unused permissions:
 * - auth_login: Login doesn't need permission check - authentication is how you get permissions
 * - role_request_submit: Role request feature not implemented
 * - role_request_view: Role request feature not implemented
 * - role_request_review: Role request feature not implemented
 */
exports.up = async function(knex) {
    const permissionsToRemove = [
        'auth_login',
        'role_request_submit',
        'role_request_view',
        'role_request_review'
    ];

    // Get permission IDs
    const permissions = await knex('permissions')
        .whereIn('name', permissionsToRemove)
        .select('id', 'name');

    const permissionIds = permissions.map(p => p.id);

    if (permissionIds.length > 0) {
        // Remove role_permissions entries first (foreign key constraint)
        await knex('role_permissions').whereIn('permission_id', permissionIds).del();

        // Remove the permissions
        await knex('permissions').whereIn('id', permissionIds).del();

        console.log(`✅ Removed ${permissions.length} unused permissions: ${permissions.map(p => p.name).join(', ')}`);
    } else {
        console.log('✅ No unused permissions found to remove');
    }
};

exports.down = async function(knex) {
    // Re-add the permissions if needed
    const permissions = [
        { name: 'auth_login', description: 'Allow users to log in' },
        { name: 'role_request_submit', description: 'Allow users to submit role upgrade requests' },
        { name: 'role_request_view', description: 'Allow admins to view role upgrade requests' },
        { name: 'role_request_review', description: 'Allow admins to approve or reject role upgrade requests' }
    ];

    for (const perm of permissions) {
        const exists = await knex('permissions').where('name', perm.name).first();
        if (!exists) {
            await knex('permissions').insert(perm);
        }
    }

    console.log('✅ Re-added unused permissions');
};
