/**
 * Migration to fix role permissions
 * - Add budget permissions to league_user
 * - Add league_view_active to league_user
 * - Remove admin permissions from base user role
 */
exports.up = async function (knex) {
    console.log('🔧 Applying permission fixes...');

    // Get role IDs
    const leagueUserRole = await knex('roles').where('name', 'league_user').first();
    const userRole = await knex('roles').where('name', 'user').first();

    if (!leagueUserRole || !userRole) {
        throw new Error('Required roles not found');
    }

    // 1. Add budget_manage and budget_read to league_user
    const budgetPerms = [
        { role_id: leagueUserRole.id, permission_id: 18 }, // budget_manage
        { role_id: leagueUserRole.id, permission_id: 20 }  // budget_read
    ];

    for (const perm of budgetPerms) {
        const exists = await knex('role_permissions').where(perm).first();
        if (!exists) {
            await knex('role_permissions').insert(perm);
            console.log(`✓ Added permission ${perm.permission_id} to league_user`);
        }
    }

    // 2. Add league_view_active to league_user
    const viewActivePerm = await knex('permissions').where('name', 'league_view_active').first();
    if (viewActivePerm) {
        const exists = await knex('role_permissions')
            .where({ role_id: leagueUserRole.id, permission_id: viewActivePerm.id })
            .first();

        if (!exists) {
            await knex('role_permissions').insert({
                role_id: leagueUserRole.id,
                permission_id: viewActivePerm.id
            });
            console.log('✓ Added league_view_active to league_user');
        }
    }

    // 3. Remove admin permissions from user role
    const adminPermsToRemove = [
        'admin_page_access',
        'admin_generate_reports',
        'admin_user_delete',
        'league_manage_requests',
        'pod_delete'
    ];

    for (const permName of adminPermsToRemove) {
        const perm = await knex('permissions').where('name', permName).first();
        if (perm) {
            const deleted = await knex('role_permissions')
                .where({ role_id: userRole.id, permission_id: perm.id })
                .delete();

            if (deleted > 0) {
                console.log(`✓ Removed ${permName} from user role`);
            }
        }
    }

    console.log('✅ Permission fixes applied');
};

exports.down = async function (knex) {
    console.log('🔄 Reverting permission fixes...');

    const leagueUserRole = await knex('roles').where('name', 'league_user').first();
    const userRole = await knex('roles').where('name', 'user').first();

    // Remove permissions we added to league_user
    await knex('role_permissions')
        .where({ role_id: leagueUserRole.id, permission_id: 18 })
        .orWhere({ role_id: leagueUserRole.id, permission_id: 20 })
        .delete();

    const viewActivePerm = await knex('permissions').where('name', 'league_view_active').first();
    if (viewActivePerm) {
        await knex('role_permissions')
            .where({ role_id: leagueUserRole.id, permission_id: viewActivePerm.id })
            .delete();
    }

    // Re-add admin permissions to user role (not recommended but for rollback)
    const adminPermsToRestore = [
        'admin_page_access',
        'admin_generate_reports',
        'admin_user_delete',
        'league_manage_requests',
        'pod_delete'
    ];

    for (const permName of adminPermsToRestore) {
        const perm = await knex('permissions').where('name', permName).first();
        if (perm) {
            const exists = await knex('role_permissions')
                .where({ role_id: userRole.id, permission_id: perm.id })
                .first();

            if (!exists) {
                await knex('role_permissions').insert({
                    role_id: userRole.id,
                    permission_id: perm.id
                });
            }
        }
    }

    console.log('✅ Permission fixes reverted');
};
