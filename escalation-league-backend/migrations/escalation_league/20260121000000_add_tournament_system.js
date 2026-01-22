/**
 * Migration to add tournament system tables and fields
 * Issue #76: Finals Tournament System
 */
exports.up = async function (knex) {
    // 1. Alter leagues table - add tournament phase and settings
    await knex.schema.alterTable('leagues', (table) => {
        table.enum('league_phase', ['regular_season', 'tournament', 'completed'])
            .defaultTo('regular_season');
        table.timestamp('regular_season_locked_at').nullable();
        table.decimal('tournament_qualification_percent', 5, 2).defaultTo(75.00);
        table.integer('tournament_win_points').defaultTo(4);
        table.integer('tournament_non_win_points').defaultTo(1);
        table.integer('tournament_dq_points').defaultTo(0);
    });

    // 2. Alter user_leagues table - add tournament tracking
    // Note: finals_qualified already exists
    await knex.schema.alterTable('user_leagues', (table) => {
        table.integer('tournament_seed').nullable();
        table.integer('tournament_points').defaultTo(0);
        table.integer('tournament_wins').defaultTo(0);
        table.integer('tournament_non_wins').defaultTo(0);
        table.integer('tournament_dqs').defaultTo(0);
        table.boolean('championship_qualified').defaultTo(false);
        table.boolean('is_champion').defaultTo(false);
    });

    // 3. Alter game_pods table - add tournament game tracking
    await knex.schema.alterTable('game_pods', (table) => {
        table.boolean('is_tournament_game').defaultTo(false);
        table.integer('tournament_round').nullable(); // 1-4 for qualifying, 5 for championship
        table.boolean('is_championship_game').defaultTo(false);
    });

    // 4. Add tournament permissions
    const tournamentPermissions = [
        { name: 'tournament_manage', description: 'Manage tournament phase and operations' },
        { name: 'tournament_view', description: 'View tournament standings and pods' }
    ];

    await knex('permissions').insert(tournamentPermissions);

    // Get roles to assign permissions
    const adminRole = await knex('roles').where({ name: 'admin' }).first();
    const superAdminRole = await knex('roles').where({ name: 'super_admin' }).first();
    const leagueUserRole = await knex('roles').where({ name: 'league_user' }).first();

    const newPermissions = await knex('permissions')
        .whereIn('name', ['tournament_manage', 'tournament_view']);

    const rolePermissions = [];

    // Admin and super_admin get both permissions
    for (const perm of newPermissions) {
        if (adminRole) {
            rolePermissions.push({ role_id: adminRole.id, permission_id: perm.id });
        }
        if (superAdminRole) {
            rolePermissions.push({ role_id: superAdminRole.id, permission_id: perm.id });
        }
    }

    // League users only get view permission
    const viewPerm = newPermissions.find(p => p.name === 'tournament_view');
    if (leagueUserRole && viewPerm) {
        rolePermissions.push({ role_id: leagueUserRole.id, permission_id: viewPerm.id });
    }

    if (rolePermissions.length > 0) {
        await knex('role_permissions').insert(rolePermissions);
    }

    console.log('Added tournament system tables and permissions');
};

exports.down = async function (knex) {
    // Remove role_permissions first
    const perms = await knex('permissions').whereIn('name', ['tournament_manage', 'tournament_view']);
    const permIds = perms.map(p => p.id);

    if (permIds.length > 0) {
        await knex('role_permissions').whereIn('permission_id', permIds).del();
        await knex('permissions').whereIn('id', permIds).del();
    }

    // Revert game_pods
    await knex.schema.alterTable('game_pods', (table) => {
        table.dropColumn('is_tournament_game');
        table.dropColumn('tournament_round');
        table.dropColumn('is_championship_game');
    });

    // Revert user_leagues
    await knex.schema.alterTable('user_leagues', (table) => {
        table.dropColumn('tournament_seed');
        table.dropColumn('tournament_points');
        table.dropColumn('tournament_wins');
        table.dropColumn('tournament_non_wins');
        table.dropColumn('tournament_dqs');
        table.dropColumn('championship_qualified');
        table.dropColumn('is_champion');
    });

    // Revert leagues
    await knex.schema.alterTable('leagues', (table) => {
        table.dropColumn('league_phase');
        table.dropColumn('regular_season_locked_at');
        table.dropColumn('tournament_qualification_percent');
        table.dropColumn('tournament_win_points');
        table.dropColumn('tournament_non_win_points');
        table.dropColumn('tournament_dq_points');
    });

    console.log('Removed tournament system tables and permissions');
};
