/**
 * Migration to completely rebuild role hierarchy to a clean state
 *
 * This migration:
 * 1. Deletes ALL existing role_hierarchy entries
 * 2. Rebuilds the hierarchy from scratch with the correct structure
 *
 * Final hierarchy:
 * - super_admin (1) → league_admin (2), user_admin (4)
 * - league_admin (2) → pod_admin (3)
 * - pod_admin (3) → league_user (6)
 * - user_admin (4) → user (5)
 * - league_user (6) → user (5)
 *
 * This ensures:
 * - super_admin inherits all permissions through chain
 * - league_admin inherits pod_admin → league_user → user
 * - pod_admin inherits league_user → user (gets league participation)
 * - user_admin inherits user
 * - No cycles or redundant paths
 */
exports.up = async function (knex) {
    console.log('Rebuilding role hierarchy from scratch...');

    // First, delete ALL existing hierarchy entries to start fresh
    await knex('role_hierarchy').del();
    console.log('Deleted all existing role_hierarchy entries');

    // Now insert the clean hierarchy
    const hierarchy = [
        { parent_role_id: 1, child_role_id: 2 }, // super_admin → league_admin
        { parent_role_id: 1, child_role_id: 4 }, // super_admin → user_admin
        { parent_role_id: 2, child_role_id: 3 }, // league_admin → pod_admin
        { parent_role_id: 3, child_role_id: 6 }, // pod_admin → league_user
        { parent_role_id: 4, child_role_id: 5 }, // user_admin → user
        { parent_role_id: 6, child_role_id: 5 }, // league_user → user
    ];

    await knex('role_hierarchy').insert(hierarchy);
    console.log('Inserted clean role hierarchy');

    // Log the final state
    const finalState = await knex('role_hierarchy').select('*');
    console.log('Final role_hierarchy state:', finalState);
};

exports.down = async function (knex) {
    console.log('Reverting to original role hierarchy...');

    // Delete all and restore original
    await knex('role_hierarchy').del();

    // Original hierarchy from seed
    const originalHierarchy = [
        { parent_role_id: 1, child_role_id: 2 }, // super_admin → league_admin
        { parent_role_id: 1, child_role_id: 3 }, // super_admin → pod_admin
        { parent_role_id: 1, child_role_id: 4 }, // super_admin → user_admin
        { parent_role_id: 1, child_role_id: 6 }, // super_admin → league_user
        { parent_role_id: 2, child_role_id: 5 }, // league_admin → user
        { parent_role_id: 3, child_role_id: 5 }, // pod_admin → user
        { parent_role_id: 4, child_role_id: 5 }, // user_admin → user
        { parent_role_id: 6, child_role_id: 5 }, // league_user → user
    ];

    await knex('role_hierarchy').insert(originalHierarchy);
    console.log('Restored original role hierarchy');
};
