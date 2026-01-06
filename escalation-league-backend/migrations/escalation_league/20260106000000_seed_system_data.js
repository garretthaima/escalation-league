/**
 * Migration to seed system configuration data (RBAC, settings, win conditions)
 * This replaces the seed files: seed_rbac.js, seed_settings.js, seed_win_conditions.js
 * Made idempotent to handle existing production data
 */
exports.up = async function (knex) {
    console.log('🔧 Seeding system configuration data...');

    // ============================================================================
    // RBAC: Roles
    // ============================================================================
    const roles = [
        { id: 1, name: 'super_admin', description: 'Full access to all features' },
        { id: 2, name: 'league_admin', description: 'Manage leagues and games' },
        { id: 3, name: 'pod_admin', description: 'Manage pods' },
        { id: 4, name: 'user_admin', description: 'Manage users' },
        { id: 5, name: 'user', description: 'Regular user with limited access' },
        { id: 6, name: 'league_user', description: 'User with access to specific leagues' },
    ];

    for (const role of roles) {
        const exists = await knex('roles').where({ id: role.id }).first();
        if (!exists) {
            await knex('roles').insert(role);
        }
    }

    // ============================================================================
    // RBAC: Permissions
    // ============================================================================
    const permissions = [
        // Authentication and Profile
        { id: 1, name: 'auth_login', description: 'Allow users to log in' },
        { id: 2, name: 'auth_view_profile', description: 'Allow users to view their profile' },
        { id: 3, name: 'auth_update_profile', description: 'Allow users to update their profile' },
        { id: 4, name: 'auth_delete_account', description: 'Allow users to delete their account' },
        { id: 42, name: 'auth_view_basic_info', description: 'Allow users to view basic information about other users' },

        // Leagues
        { id: 5, name: 'league_create', description: 'Allow users or admins to create leagues' },
        { id: 6, name: 'league_read', description: 'Allow users to view leagues' },
        { id: 7, name: 'league_update', description: 'Allow admins or league admins to update leagues' },
        { id: 8, name: 'league_delete', description: 'Allow admins to delete leagues' },
        { id: 9, name: 'league_set_active', description: 'Allow admins or league admins to set a league as active' },
        { id: 10, name: 'league_manage_budget', description: 'Allow league admins to update the weekly budget' },
        { id: 11, name: 'league_manage_weeks', description: 'Allow league admins to update the current week' },
        { id: 12, name: 'league_manage_players', description: 'Allow league admins to manage the maximum number of players' },
        { id: 13, name: 'league_manage_code', description: 'Allow league admins to generate or update the league code' },
        { id: 14, name: 'league_manage_description', description: 'Allow league admins to update the league description' },
        { id: 41, name: 'league_manage_requests', description: 'Allow league admins to approve or reject new players' },
        { id: 15, name: 'league_view_active', description: 'Allow users to view the currently active league' },
        { id: 16, name: 'league_view_details', description: 'Allow users to view detailed information about a league' },
        { id: 35, name: 'league_signup', description: 'Allow users to sign up for a league' },
        { id: 36, name: 'league_leave', description: 'Allow users to leave a league' },

        // Pods
        { id: 17, name: 'pod_create', description: 'Allow users to create pods' },
        { id: 18, name: 'pod_read', description: 'Allow users to view pods' },
        { id: 19, name: 'pod_update', description: 'Allow users or admins to update pods' },
        { id: 20, name: 'pod_delete', description: 'Allow admins to delete pods' },

        // Awards
        { id: 21, name: 'award_vote', description: 'Allow users to vote for awards' },
        { id: 22, name: 'award_manage', description: 'Allow admins or league admins to manage awards' },
        { id: 23, name: 'award_read_results', description: 'Allow users to view voting results' },

        // Budget
        { id: 24, name: 'budget_manage', description: 'Allow users to manage their personal budget' },
        { id: 25, name: 'budget_read', description: 'Allow users to view their personal budget' },
        { id: 26, name: 'budget_manage_league', description: 'Allow league admins to manage the league budget' },

        // Activity Logs
        { id: 27, name: 'activity_logs_read_all', description: 'Allow admins to view all activity logs' },
        { id: 28, name: 'activity_logs_read_own', description: 'Allow users to view their own activity logs' },

        // Admin-Specific
        { id: 29, name: 'admin_user_create', description: 'Allow admins to create users' },
        { id: 30, name: 'admin_user_read', description: 'Allow admins to view users' },
        { id: 31, name: 'admin_user_update', description: 'Allow admins to update users' },
        { id: 32, name: 'admin_user_delete', description: 'Allow admins to delete users' },
        { id: 33, name: 'admin_view_logs', description: 'Allow admins to view activity logs' },
        { id: 34, name: 'admin_generate_reports', description: 'Allow admins to generate reports' },

        // Role Requests
        { id: 37, name: 'role_request_submit', description: 'Allow users to submit role upgrade requests' },
        { id: 38, name: 'role_request_view', description: 'Allow admins to view role upgrade requests' },
        { id: 39, name: 'role_request_review', description: 'Allow admins to approve or reject role upgrade requests' },

        { id: 40, name: 'admin_page_access', description: 'Allow access to the Admin Dashboard' },
    ];

    for (const permission of permissions) {
        const exists = await knex('permissions').where({ id: permission.id }).first();
        if (!exists) {
            await knex('permissions').insert(permission);
        }
    }

    // ============================================================================
    // RBAC: Role Hierarchy
    // ============================================================================
    const roleHierarchy = [
        { parent_role_id: 1, child_role_id: 2 }, // super_admin -> league_admin
        { parent_role_id: 1, child_role_id: 3 }, // super_admin -> pod_admin
        { parent_role_id: 1, child_role_id: 4 }, // super_admin -> user_admin
        { parent_role_id: 1, child_role_id: 6 }, // super_admin -> league_user
        { parent_role_id: 2, child_role_id: 5 }, // league_admin -> user
        { parent_role_id: 3, child_role_id: 5 }, // pod_admin -> user
        { parent_role_id: 4, child_role_id: 5 }, // user_admin -> user
        { parent_role_id: 6, child_role_id: 5 }, // league_user -> user
    ];

    for (const hierarchy of roleHierarchy) {
        const exists = await knex('role_hierarchy').where(hierarchy).first();
        if (!exists) {
            await knex('role_hierarchy').insert(hierarchy);
        }
    }

    // ============================================================================
    // RBAC: Role Permissions
    // ============================================================================
    const rolePermissions = [
        // User permissions
        { role_id: 5, permission_id: 1 }, // auth_login
        { role_id: 5, permission_id: 2 }, // auth_view_profile
        { role_id: 5, permission_id: 3 }, // auth_update_profile
        { role_id: 5, permission_id: 4 }, // auth_delete_account
        { role_id: 5, permission_id: 42 }, // auth_view_basic_info
        { role_id: 5, permission_id: 6 }, // league_read
        { role_id: 5, permission_id: 18 }, // pod_read
        { role_id: 5, permission_id: 25 }, // budget_read
        { role_id: 5, permission_id: 28 }, // activity_logs_read_own
        { role_id: 5, permission_id: 37 }, // role_request_submit

        // League User permissions
        { role_id: 6, permission_id: 35 }, // league_signup
        { role_id: 6, permission_id: 36 }, // league_leave
        { role_id: 6, permission_id: 16 }, // league_view_details

        // Admin permissions
        { role_id: 4, permission_id: 38 }, // role_request_view
        { role_id: 4, permission_id: 39 }, // role_request_review
        { role_id: 1, permission_id: 40 }, // super_admin
        { role_id: 2, permission_id: 40 }, // league_admin
        { role_id: 2, permission_id: 41 }, // league_admin manage requests
        { role_id: 3, permission_id: 40 }, // pod_admin
        { role_id: 4, permission_id: 40 }, // user_admin
    ];

    // Add all permissions to super_admin
    for (const permission of permissions) {
        rolePermissions.push({ role_id: 1, permission_id: permission.id });
    }

    for (const rp of rolePermissions) {
        const exists = await knex('role_permissions').where(rp).first();
        if (!exists) {
            await knex('role_permissions').insert(rp);
        }
    }

    // ============================================================================
    // Settings
    // ============================================================================
    const settings = [
        { key_name: 'token_expiration', value: '1h', description: 'Default expiration time for JWT tokens' },
        { key_name: 'google_client_id', value: '820878592438-k311ngrdvojgv1cbtn22gnsk0l7r97ju.apps.googleusercontent.com', description: 'Google OAuth client ID for authentication' },
        { key_name: 'secret_key', value: '9c9d42916c6eeef1a1db36e54dd128b3eb9c86114ed26b57a3163394ccedb6f1', description: 'Secret key used for signing JWT tokens' },
        { key_name: 'port', value: '3000', description: 'Port number for the application' },
        { key_name: 'max_login_attempts', value: '5', description: 'Maximum number of login attempts' },
        { key_name: 'feature_flags', value: '{"beta_feature": true, "maintenance_mode": false}', description: 'Feature flags configuration' },
        { key_name: 'smtp_host', value: 'smtp.example.com', description: 'SMTP server host' },
        { key_name: 'smtp_port', value: '587', description: 'SMTP server port' },
        { key_name: 'smtp_user', value: 'noreply@example.com', description: 'SMTP username' },
        { key_name: 'smtp_password', value: 'secure_smtp_password', description: 'SMTP password' },
        { key_name: 'max_token_expiration', value: '8h', description: 'Maximum allowed expiration time for JWT tokens' },
    ];

    for (const setting of settings) {
        const exists = await knex('settings').where({ key_name: setting.key_name }).first();
        if (!exists) {
            await knex('settings').insert(setting);
        }
    }

    // ============================================================================
    // Win Conditions
    // ============================================================================
    const winConditions = [
        { name: 'Combat Damage', description: 'Winning by dealing lethal damage through attacking creatures.', category: 'Combat' },
        { name: 'Commander Damage', description: '21 points of combat damage from the same commander.', category: 'Combat' },
        { name: 'Poison Counters', description: 'Giving a player 10 poison counters (Infect/Toxic).', category: 'Combat' },
        { name: 'Deck Out (Mill)', description: 'Opponent attempts to draw from an empty library and loses.', category: 'Alternate' },
        { name: 'Laboratory Maniac', description: 'Win when drawing from an empty library.', category: 'Alternate' },
        { name: 'Revel in Riches', description: '10+ treasures at upkeep = win.', category: 'Alternate' },
        { name: 'Infinite Combo', description: 'Infinite damage, mill, life loss, or similar.', category: 'Combo' },
        { name: 'Lockout/Stax', description: 'Opponents cannot take meaningful game actions, leading to a win over time.', category: 'Combo' },
    ];

    for (const condition of winConditions) {
        const exists = await knex('win_conditions').where({ name: condition.name }).first();
        if (!exists) {
            await knex('win_conditions').insert(condition);
        }
    }

    console.log('✓ System configuration data seeded successfully');
};

exports.down = async function (knex) {
    // Don't delete system data on rollback - it would break the application
    console.log('⚠️  System configuration data not removed (required for application)');
};
