const knex = require('knex')(require('../knexfile.js')[process.env.NODE_ENV || 'production']);

(async () => {
    console.log('🔧 Fixing permissions...');

    try {
        // Get role IDs
        const leagueUserRole = await knex('roles').where('name', 'league_user').first();
        const userRole = await knex('roles').where('name', 'user').first();

        if (!leagueUserRole || !userRole) {
            throw new Error('Required roles not found');
        }

        console.log('Found roles:', { league_user: leagueUserRole.id, user: userRole.id });

        // 1. Add budget_manage and budget_read to league_user
        const budgetPerms = [
            { name: 'budget_manage', id: 18 },
            { name: 'budget_read', id: 20 }
        ];

        for (const perm of budgetPerms) {
            const exists = await knex('role_permissions')
                .where({ role_id: leagueUserRole.id, permission_id: perm.id })
                .first();

            if (!exists) {
                await knex('role_permissions').insert({
                    role_id: leagueUserRole.id,
                    permission_id: perm.id
                });
                console.log(`✓ Added ${perm.name} to league_user`);
            } else {
                console.log(`- ${perm.name} already exists for league_user`);
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
            } else {
                console.log('- league_view_active already exists for league_user');
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
                } else {
                    console.log(`- ${permName} not found on user role`);
                }
            }
        }

        console.log('');
        console.log('✅ All permission changes applied successfully!');
        console.log('⚠️  Users must log out and back in to see changes');

    } catch (error) {
        console.error('❌ Error applying permission changes:', error.message);
        process.exit(1);
    } finally {
        await knex.destroy();
    }
})();
