/**
 * Migration to fix role hierarchy recursion issue
 *
 * The previous migration (20260127200000_fix_role_hierarchy.js) added:
 * - league_admin (2) → pod_admin (3)
 * - pod_admin (3) → league_user (6)
 *
 * But it didn't remove the redundant direct links from super_admin:
 * - super_admin (1) → pod_admin (3) (redundant - inherited via league_admin)
 * - super_admin (1) → league_user (6) (redundant - inherited via pod_admin)
 *
 * This caused multiple inheritance paths that made the recursive CTE
 * exceed 1001 iterations.
 *
 * After this migration, the clean hierarchy will be:
 * - super_admin (1) → league_admin (2), user_admin (4)
 * - league_admin (2) → pod_admin (3)
 * - pod_admin (3) → league_user (6)
 * - user_admin (4) → user (5)
 * - league_user (6) → user (5)
 */
exports.up = async function (knex) {
    console.log('Removing redundant role hierarchy links...');

    // Remove redundant direct links from super_admin
    // super_admin will inherit these through the chain: league_admin → pod_admin → league_user
    await knex('role_hierarchy')
        .where({ parent_role_id: 1, child_role_id: 3 }) // super_admin → pod_admin (redundant)
        .del();

    await knex('role_hierarchy')
        .where({ parent_role_id: 1, child_role_id: 6 }) // super_admin → league_user (redundant)
        .del();

    console.log('Redundant role hierarchy links removed successfully');
};

exports.down = async function (knex) {
    console.log('Restoring redundant role hierarchy links...');

    // Restore the redundant direct links
    const linksToRestore = [
        { parent_role_id: 1, child_role_id: 3 }, // super_admin → pod_admin
        { parent_role_id: 1, child_role_id: 6 }, // super_admin → league_user
    ];

    for (const link of linksToRestore) {
        const exists = await knex('role_hierarchy').where(link).first();
        if (!exists) {
            await knex('role_hierarchy').insert(link);
        }
    }

    console.log('Redundant role hierarchy links restored');
};
