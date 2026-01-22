/**
 * Migration to add tournament_view permission to pod_admin role
 * Quick fix until proper RBAC inheritance is implemented (Issue #111)
 */
exports.up = async function (knex) {
    const podAdminRole = await knex('roles').where({ name: 'pod_admin' }).first();
    const tournamentViewPerm = await knex('permissions').where({ name: 'tournament_view' }).first();

    if (podAdminRole && tournamentViewPerm) {
        // Check if already exists
        const exists = await knex('role_permissions')
            .where({ role_id: podAdminRole.id, permission_id: tournamentViewPerm.id })
            .first();

        if (!exists) {
            await knex('role_permissions').insert({
                role_id: podAdminRole.id,
                permission_id: tournamentViewPerm.id
            });
            console.log('Added tournament_view permission to pod_admin role');
        }
    }
};

exports.down = async function (knex) {
    const podAdminRole = await knex('roles').where({ name: 'pod_admin' }).first();
    const tournamentViewPerm = await knex('permissions').where({ name: 'tournament_view' }).first();

    if (podAdminRole && tournamentViewPerm) {
        await knex('role_permissions')
            .where({ role_id: podAdminRole.id, permission_id: tournamentViewPerm.id })
            .del();
        console.log('Removed tournament_view permission from pod_admin role');
    }
};
