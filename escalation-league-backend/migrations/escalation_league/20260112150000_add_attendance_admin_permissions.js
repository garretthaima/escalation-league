/**
 * Add attendance admin permissions
 * Following the same pattern as pod admin permissions
 */
exports.up = async function(knex) {
    const permissions = [
        { id: 60, name: 'admin_session_create', description: 'Allow admins to create game sessions' },
        { id: 61, name: 'admin_session_update', description: 'Allow admins to update game sessions' },
        { id: 62, name: 'admin_attendance_manage', description: 'Allow admins to manage user attendance' },
        { id: 63, name: 'admin_discord_poll', description: 'Allow admins to post Discord attendance polls' },
    ];

    // Insert permissions (ignore if they already exist)
    for (const perm of permissions) {
        const exists = await knex('permissions').where('id', perm.id).first();
        if (!exists) {
            await knex('permissions').insert(perm);
        }
    }

    // Get the league_admin role
    const leagueAdminRole = await knex('roles').where('name', 'league_admin').first();

    if (leagueAdminRole) {
        // Assign all new permissions to league_admin
        for (const perm of permissions) {
            const exists = await knex('role_permissions')
                .where({ role_id: leagueAdminRole.id, permission_id: perm.id })
                .first();
            if (!exists) {
                await knex('role_permissions').insert({
                    role_id: leagueAdminRole.id,
                    permission_id: perm.id
                });
            }
        }
    }

    console.log('✅ Added attendance admin permissions');
};

exports.down = async function(knex) {
    const permissionIds = [60, 61, 62, 63];

    // Remove role_permissions entries
    await knex('role_permissions').whereIn('permission_id', permissionIds).del();

    // Remove permissions
    await knex('permissions').whereIn('id', permissionIds).del();

    console.log('✅ Removed attendance admin permissions');
};
