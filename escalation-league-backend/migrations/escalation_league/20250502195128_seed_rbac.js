/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
    // Insert roles
    await knex('roles').insert([
        { id: 1, name: 'super_admin', description: 'Full access to all features' },
        { id: 2, name: 'league_admin', description: 'Manage leagues and games' },
        { id: 3, name: 'pod_admin', description: 'Manage pods' },
        { id: 4, name: 'user_admin', description: 'Manage users' },
        { id: 5, name: 'user', description: 'Regular user with limited access' },
        { id: 6, name: 'league_user', description: 'User with access to specific leagues' },
    ]);

    // Insert role hierarchy
    await knex('role_hierarchy').insert([
        { parent_role_id: 1, child_role_id: 2 },
        { parent_role_id: 1, child_role_id: 3 },
        { parent_role_id: 1, child_role_id: 4 },
        { parent_role_id: 1, child_role_id: 6 },
        { parent_role_id: 2, child_role_id: 5 },
        { parent_role_id: 3, child_role_id: 5 },
        { parent_role_id: 4, child_role_id: 5 },
        { parent_role_id: 6, child_role_id: 5 },
    ]);

    // Insert permissions
    const permissions = [
        { id: 1, name: 'activity_logs_read_all', description: 'Allow admins to view all activity logs' },
        { id: 2, name: 'activity_logs_read_own', description: 'Allow users to view their own activity logs' },
        { id: 3, name: 'admin_generate_reports', description: 'Allow admins to generate reports' },
        { id: 4, name: 'admin_page_access', description: 'Allow access to the Admin Dashboard' },
        { id: 5, name: 'admin_user_create', description: 'Allow admins to create users' },
        { id: 6, name: 'admin_user_delete', description: 'Allow admins to delete users' },
        { id: 7, name: 'admin_user_read', description: 'Allow admins to view users' },
        { id: 8, name: 'admin_user_update', description: 'Allow admins to update users' },
        { id: 9, name: 'admin_view_logs', description: 'Allow admins to view activity logs' },
        { id: 10, name: 'auth_delete_account', description: 'Allow users to delete their account' },
        { id: 11, name: 'auth_login', description: 'Allow users to log in' },
        { id: 12, name: 'auth_update_profile', description: 'Allow users to update their profile' },
        { id: 13, name: 'auth_view_basic_info', description: 'Allow users to view basic information about other users' },
        { id: 14, name: 'auth_view_profile', description: 'Allow users to view their profile' },
        { id: 15, name: 'award_manage', description: 'Allow admins or league admins to manage awards' },
        { id: 16, name: 'award_read_results', description: 'Allow users to view voting results' },
        { id: 17, name: 'award_vote', description: 'Allow users to vote for awards' },
        { id: 18, name: 'budget_manage', description: 'Allow users to manage their personal budget' },
        { id: 19, name: 'budget_manage_league', description: 'Allow league admins to manage the league budget' },
        { id: 20, name: 'budget_read', description: 'Allow users to view their personal budget' },
        { id: 21, name: 'league_create', description: 'Allow users or admins to create leagues' },
        { id: 22, name: 'league_delete', description: 'Allow admins to delete leagues' },
        { id: 23, name: 'league_leave', description: 'Allow users to leave a league' },
        { id: 24, name: 'league_manage_budget', description: 'Allow league admins to update the weekly budget' },
        { id: 25, name: 'league_manage_code', description: 'Allow league admins to generate or update the league code' },
        { id: 26, name: 'league_manage_description', description: 'Allow league admins to update the league description' },
        { id: 27, name: 'league_manage_players', description: 'Allow league admins to manage the maximum number of players' },
        { id: 28, name: 'league_manage_requests', description: 'Allow league admins to approve or reject new players' },
        { id: 29, name: 'league_manage_weeks', description: 'Allow league admins to update the current week' },
        { id: 30, name: 'league_read', description: 'Allow users to view leagues' },
        { id: 31, name: 'league_set_active', description: 'Allow admins or league admins to set a league as active' },
        { id: 32, name: 'league_signup', description: 'Allow users to sign up for a league' },
        { id: 33, name: 'league_update', description: 'Allow admins or league admins to update leagues' },
        { id: 34, name: 'league_view_active', description: 'Allow users to view the currently active league' },
        { id: 35, name: 'league_view_details', description: 'Allow users to view detailed information about a league' },
        { id: 36, name: 'pod_create', description: 'Allow users to create pods' },
        { id: 37, name: 'pod_delete', description: 'Allow admins to delete pods' },
        { id: 38, name: 'pod_read', description: 'Allow users to view pods' },
        { id: 39, name: 'pod_update', description: 'Allow users or admins to update pods' },
        { id: 40, name: 'role_request_review', description: 'Allow admins to approve or reject role upgrade requests' },
        { id: 41, name: 'role_request_submit', description: 'Allow users to submit role upgrade requests' },
        { id: 42, name: 'role_request_view', description: 'Allow admins to view role upgrade requests' },
    ];
    await knex('permissions').insert(permissions);

    // Insert role-permissions mappings
    const rolePermissions = [
        // User permissions
        { role_id: 5, permission_id: 11 }, // auth_login
        { role_id: 5, permission_id: 14 }, // auth_view_profile
        { role_id: 5, permission_id: 12 }, // auth_update_profile
        { role_id: 5, permission_id: 10 }, // auth_delete_account
        { role_id: 5, permission_id: 13 }, // auth_view_basic_info
        { role_id: 5, permission_id: 30 }, // league_read
        { role_id: 5, permission_id: 38 }, // pod_read
        { role_id: 5, permission_id: 20 }, // budget_read
        { role_id: 5, permission_id: 2 },  // activity_logs_read_own
        { role_id: 5, permission_id: 41 }, // role_request_submit

        // League User permissions
        { role_id: 6, permission_id: 32 }, // league_signup
        { role_id: 6, permission_id: 23 }, // league_leave

        // Admin permissions
        { role_id: 4, permission_id: 42 }, // role_request_view
        { role_id: 4, permission_id: 40 }, // role_request_review
        { role_id: 1, permission_id: 4 },  // admin_page_access
        { role_id: 2, permission_id: 4 },  // admin_page_access
        { role_id: 2, permission_id: 28 }, // league_manage_requests
        { role_id: 3, permission_id: 4 },  // admin_page_access
        { role_id: 4, permission_id: 4 },  // admin_page_access
    ];
    await knex('role_permissions').insert(rolePermissions);

    // Catch-all for super_admin (assign all permissions)
    const allPermissions = await knex('permissions').select('id');
    const superAdminPermissions = allPermissions.map((permission) => ({
        role_id: 1,
        permission_id: permission.id,
    }));
    await knex('role_permissions').insert(superAdminPermissions);
};

exports.down = async function (knex) {
    // Delete all role-related data
    await knex('role_permissions').del();
    await knex('permissions').del();
    await knex('role_hierarchy').del();
    await knex('roles').del();
};