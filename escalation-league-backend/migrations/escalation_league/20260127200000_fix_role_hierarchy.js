/**
 * Migration to fix role hierarchy for proper inheritance chain
 *
 * Current hierarchy:
 * - super_admin (1) → league_admin (2), pod_admin (3), user_admin (4), league_user (6)
 * - league_admin (2) → user (5)
 * - pod_admin (3) → user (5)
 * - user_admin (4) → user (5)
 * - league_user (6) → user (5)
 *
 * Problem: pod_admin doesn't inherit league_user permissions
 *
 * This migration:
 * - Removes: league_admin → user, pod_admin → user (will inherit through chain)
 * - Adds: league_admin → pod_admin, pod_admin → league_user
 *
 * NOTE: This migration alone creates redundant paths. The follow-up migration
 * 20260127200001_fix_role_hierarchy_recursion.js removes the redundant
 * super_admin → pod_admin and super_admin → league_user links.
 */
exports.up = async function (knex) {
    console.log('Fixing role hierarchy for proper inheritance chain...');

    // Remove old direct links to user role (will be inherited through chain)
    await knex('role_hierarchy')
        .where({ parent_role_id: 2, child_role_id: 5 }) // league_admin → user
        .del();

    await knex('role_hierarchy')
        .where({ parent_role_id: 3, child_role_id: 5 }) // pod_admin → user
        .del();

    // Add new hierarchy chain: league_admin → pod_admin → league_user
    const newHierarchy = [
        { parent_role_id: 2, child_role_id: 3 }, // league_admin → pod_admin
        { parent_role_id: 3, child_role_id: 6 }, // pod_admin → league_user
    ];

    for (const hierarchy of newHierarchy) {
        const exists = await knex('role_hierarchy').where(hierarchy).first();
        if (!exists) {
            await knex('role_hierarchy').insert(hierarchy);
        }
    }

    console.log('Role hierarchy fixed successfully');
};

exports.down = async function (knex) {
    console.log('Reverting role hierarchy to original state...');

    // Remove new links
    await knex('role_hierarchy')
        .where({ parent_role_id: 2, child_role_id: 3 }) // league_admin → pod_admin
        .del();

    await knex('role_hierarchy')
        .where({ parent_role_id: 3, child_role_id: 6 }) // pod_admin → league_user
        .del();

    // Restore old direct links
    const oldHierarchy = [
        { parent_role_id: 2, child_role_id: 5 }, // league_admin → user
        { parent_role_id: 3, child_role_id: 5 }, // pod_admin → user
    ];

    for (const hierarchy of oldHierarchy) {
        const exists = await knex('role_hierarchy').where(hierarchy).first();
        if (!exists) {
            await knex('role_hierarchy').insert(hierarchy);
        }
    }

    console.log('Role hierarchy reverted');
};
