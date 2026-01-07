const knex = require('knex')(require('../knexfile.js').development);

(async () => {
    const perm = await knex('permissions').where('name', 'league_view_active').first();
    const leagueUserRole = await knex('roles').where('name', 'league_user').first();

    if (perm && leagueUserRole) {
        const exists = await knex('role_permissions')
            .where({ role_id: leagueUserRole.id, permission_id: perm.id })
            .first();

        if (!exists) {
            await knex('role_permissions').insert({
                role_id: leagueUserRole.id,
                permission_id: perm.id
            });
            console.log('✓ Added league_view_active to league_user');
        } else {
            console.log('- Already has league_view_active');
        }
    } else {
        console.log('❌ Permission or role not found');
    }

    await knex.destroy();
})();
