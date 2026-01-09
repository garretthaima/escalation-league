/**
 * Migration to add league viewing permissions to league_admin and pod_admin roles
 * These roles need to be able to view leagues to perform their admin functions
 */
exports.up = async function (knex) {
    console.log('🔧 Adding league view permissions to admin roles...');

    // Get role IDs
    const leagueAdminRole = await knex('roles').where({ name: 'league_admin' }).select('id').first();
    const podAdminRole = await knex('roles').where({ name: 'pod_admin' }).select('id').first();

    if (!leagueAdminRole || !podAdminRole) {
        console.error('❌ Could not find league_admin or pod_admin roles');
        return;
    }

    // Get permission IDs
    const leagueReadPerm = await knex('permissions').where({ name: 'league_read' }).select('id').first();
    const leagueViewActivePerm = await knex('permissions').where({ name: 'league_view_active' }).select('id').first();
    const leagueViewDetailsPerm = await knex('permissions').where({ name: 'league_view_details' }).select('id').first();

    if (!leagueReadPerm || !leagueViewActivePerm || !leagueViewDetailsPerm) {
        console.error('❌ Could not find required permissions');
        return;
    }

    // Permissions to add to both roles
    const permissionsToAdd = [
        { role_id: leagueAdminRole.id, permission_id: leagueReadPerm.id, role: 'league_admin', perm: 'league_read' },
        { role_id: leagueAdminRole.id, permission_id: leagueViewActivePerm.id, role: 'league_admin', perm: 'league_view_active' },
        { role_id: leagueAdminRole.id, permission_id: leagueViewDetailsPerm.id, role: 'league_admin', perm: 'league_view_details' },
        { role_id: podAdminRole.id, permission_id: leagueReadPerm.id, role: 'pod_admin', perm: 'league_read' },
        { role_id: podAdminRole.id, permission_id: leagueViewActivePerm.id, role: 'pod_admin', perm: 'league_view_active' },
        { role_id: podAdminRole.id, permission_id: leagueViewDetailsPerm.id, role: 'pod_admin', perm: 'league_view_details' },
    ];

    // Add each permission if it doesn't already exist
    for (const perm of permissionsToAdd) {
        const exists = await knex('role_permissions')
            .where({ role_id: perm.role_id, permission_id: perm.permission_id })
            .first();

        if (!exists) {
            await knex('role_permissions').insert({
                role_id: perm.role_id,
                permission_id: perm.permission_id
            });
            console.log(`✅ Added ${perm.perm} permission to ${perm.role} role`);
        } else {
            console.log(`⚠️  ${perm.role} already has ${perm.perm} permission`);
        }
    }

    console.log('✅ League view permissions added to admin roles');
};

exports.down = async function (knex) {
    console.log('🔧 Removing league view permissions from admin roles...');

    // Get role IDs
    const leagueAdminRole = await knex('roles').where({ name: 'league_admin' }).select('id').first();
    const podAdminRole = await knex('roles').where({ name: 'pod_admin' }).select('id').first();

    if (!leagueAdminRole || !podAdminRole) {
        console.error('❌ Could not find league_admin or pod_admin roles');
        return;
    }

    // Get permission IDs
    const leagueReadPerm = await knex('permissions').where({ name: 'league_read' }).select('id').first();
    const leagueViewActivePerm = await knex('permissions').where({ name: 'league_view_active' }).select('id').first();
    const leagueViewDetailsPerm = await knex('permissions').where({ name: 'league_view_details' }).select('id').first();

    if (!leagueReadPerm || !leagueViewActivePerm || !leagueViewDetailsPerm) {
        console.error('❌ Could not find required permissions');
        return;
    }

    // Remove the permissions
    const permissionsToRemove = [
        { role_id: leagueAdminRole.id, permission_id: leagueReadPerm.id },
        { role_id: leagueAdminRole.id, permission_id: leagueViewActivePerm.id },
        { role_id: leagueAdminRole.id, permission_id: leagueViewDetailsPerm.id },
        { role_id: podAdminRole.id, permission_id: leagueReadPerm.id },
        { role_id: podAdminRole.id, permission_id: leagueViewActivePerm.id },
        { role_id: podAdminRole.id, permission_id: leagueViewDetailsPerm.id },
    ];

    for (const perm of permissionsToRemove) {
        await knex('role_permissions')
            .where({ role_id: perm.role_id, permission_id: perm.permission_id })
            .del();
    }

    console.log('✅ League view permissions removed from admin roles');
};
