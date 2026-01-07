/**
 * Check and fix production permissions for league_view_active
 * Run with: NODE_ENV=production node scripts/check-prod-permissions.js
 */
const knex = require('knex')(require('../knexfile.js')[process.env.NODE_ENV || 'production']);

async function checkAndFixPermissions() {
    try {
        console.log('🔍 Checking production permissions...\n');

        // Get role IDs
        const leagueUserRole = await knex('roles').where('name', 'league_user').first();
        const userRole = await knex('roles').where('name', 'user').first();

        console.log(`league_user role ID: ${leagueUserRole?.id}`);
        console.log(`user role ID: ${userRole?.id}\n`);

        // Check if league_view_active permission exists
        const viewActivePerm = await knex('permissions').where('name', 'league_view_active').first();
        console.log(`league_view_active permission ID: ${viewActivePerm?.id}\n`);

        if (!viewActivePerm) {
            console.log('❌ league_view_active permission does not exist!');
            console.log('Creating it now...');

            const [permId] = await knex('permissions').insert({
                name: 'league_view_active',
                description: 'Allow users to view the currently active league'
            });

            console.log(`✓ Created league_view_active permission with ID: ${permId}\n`);
            viewActivePerm.id = permId;
        }

        // Check if league_user has league_view_active
        const leagueUserHasPerm = await knex('role_permissions')
            .where({ role_id: leagueUserRole.id, permission_id: viewActivePerm.id })
            .first();

        console.log(`league_user has league_view_active: ${!!leagueUserHasPerm}`);

        if (!leagueUserHasPerm) {
            console.log('Adding league_view_active to league_user...');
            await knex('role_permissions').insert({
                role_id: leagueUserRole.id,
                permission_id: viewActivePerm.id
            });
            console.log('✓ Added league_view_active to league_user\n');
        }

        // Check if user role has league_view_active (shouldn't, but let's check)
        const userHasPerm = await knex('role_permissions')
            .where({ role_id: userRole.id, permission_id: viewActivePerm.id })
            .first();

        console.log(`user role has league_view_active: ${!!userHasPerm}`);

        if (!userHasPerm) {
            console.log('Adding league_view_active to user role...');
            await knex('role_permissions').insert({
                role_id: userRole.id,
                permission_id: viewActivePerm.id
            });
            console.log('✓ Added league_view_active to user role\n');
        }

        // Show all permissions for both roles
        console.log('\n📋 Current permissions for league_user:');
        const leagueUserPerms = await knex('role_permissions as rp')
            .join('permissions as p', 'rp.permission_id', 'p.id')
            .where('rp.role_id', leagueUserRole.id)
            .select('p.name');
        leagueUserPerms.forEach(p => console.log(`  - ${p.name}`));

        console.log('\n📋 Current permissions for user:');
        const userPerms = await knex('role_permissions as rp')
            .join('permissions as p', 'rp.permission_id', 'p.id')
            .where('rp.role_id', userRole.id)
            .select('p.name');
        userPerms.forEach(p => console.log(`  - ${p.name}`));

        console.log('\n✅ Permission check complete!');

    } catch (err) {
        console.error('❌ Error checking permissions:', err.message);
        throw err;
    } finally {
        await knex.destroy();
    }
}

checkAndFixPermissions();
