const knex = require('knex')(require('../knexfile.js').development);

(async () => {
    const leagueUserRole = await knex('roles').where('name', 'league_user').first();

    const permsToAdd = [
        { role_id: leagueUserRole.id, permission_id: 18 }, // budget_manage
        { role_id: leagueUserRole.id, permission_id: 20 }  // budget_read
    ];

    for (const perm of permsToAdd) {
        const exists = await knex('role_permissions').where(perm).first();
        if (!exists) {
            await knex('role_permissions').insert(perm);
            console.log('✓ Added permission', perm.permission_id, 'to league_user');
        } else {
            console.log('- Permission', perm.permission_id, 'already exists');
        }
    }

    console.log('✅ Done');
    await knex.destroy();
})();
