const db = require('../models/db');
const logger = require('../utils/logger');

/**
 * Get all permissions
 * GET /admin/permissions
 */
const getAllPermissions = async (req, res) => {
    try {
        const permissions = await db('permissions')
            .select('id', 'name', 'description')
            .orderBy('name');

        res.json({ permissions });
    } catch (err) {
        logger.error('Error fetching permissions', err);
        res.status(500).json({ error: 'Failed to fetch permissions' });
    }
};

/**
 * Get all roles with their descriptions
 * GET /admin/permissions/roles
 */
const getAllRolesWithDetails = async (req, res) => {
    try {
        const roles = await db('roles')
            .select('id', 'name', 'description')
            .orderBy('id');

        res.json({ roles });
    } catch (err) {
        logger.error('Error fetching roles', err);
        res.status(500).json({ error: 'Failed to fetch roles' });
    }
};

/**
 * Get role hierarchy as a tree structure
 * GET /admin/permissions/hierarchy
 */
const getRoleHierarchy = async (req, res) => {
    try {
        // Get all roles
        const roles = await db('roles')
            .select('id', 'name', 'description')
            .orderBy('id');

        // Get all hierarchy relationships
        const hierarchy = await db('role_hierarchy')
            .select('parent_role_id', 'child_role_id');

        // Build a map of role ID to role details
        const roleMap = {};
        roles.forEach(role => {
            roleMap[role.id] = {
                ...role,
                children: [],
                parents: []
            };
        });

        // Build parent-child relationships
        hierarchy.forEach(h => {
            if (roleMap[h.parent_role_id] && roleMap[h.child_role_id]) {
                roleMap[h.parent_role_id].children.push(h.child_role_id);
                roleMap[h.child_role_id].parents.push(h.parent_role_id);
            }
        });

        // Find root nodes (roles with no parents that have children)
        const rootRoles = roles.filter(r =>
            roleMap[r.id].parents.length === 0 && roleMap[r.id].children.length > 0
        );

        // Build tree recursively
        const buildTree = (roleId, visited = new Set()) => {
            if (visited.has(roleId)) return null; // Prevent cycles
            visited.add(roleId);

            const role = roleMap[roleId];
            if (!role) return null;

            return {
                id: role.id,
                name: role.name,
                description: role.description,
                children: role.children
                    .map(childId => buildTree(childId, new Set(visited)))
                    .filter(Boolean)
            };
        };

        const tree = rootRoles.map(r => buildTree(r.id));

        res.json({
            roles: roles.map(r => ({
                id: r.id,
                name: r.name,
                description: r.description,
                parents: roleMap[r.id].parents,
                children: roleMap[r.id].children
            })),
            hierarchy: tree,
            rawHierarchy: hierarchy
        });
    } catch (err) {
        logger.error('Error fetching role hierarchy', err);
        res.status(500).json({ error: 'Failed to fetch role hierarchy' });
    }
};

/**
 * Get permissions for a specific role (direct and inherited)
 * GET /admin/permissions/roles/:roleId
 */
const getRolePermissions = async (req, res) => {
    try {
        const { roleId } = req.params;

        // Get role details
        const role = await db('roles').where('id', roleId).first();
        if (!role) {
            return res.status(404).json({ error: 'Role not found' });
        }

        // Get direct permissions for this role
        const directPermissions = await db('role_permissions')
            .join('permissions', 'role_permissions.permission_id', 'permissions.id')
            .where('role_permissions.role_id', roleId)
            .select('permissions.id', 'permissions.name', 'permissions.description');

        // Get all inherited roles using recursive CTE
        const inheritedRoles = await db.withRecursive('role_inheritance', (builder) => {
            builder
                .select('parent_role_id as role_id', 'child_role_id')
                .from('role_hierarchy')
                .unionAll(function () {
                    this.select('ri.role_id', 'rh.child_role_id')
                        .from('role_inheritance as ri')
                        .join('role_hierarchy as rh', 'ri.child_role_id', 'rh.parent_role_id');
                });
        })
            .select('child_role_id')
            .from('role_inheritance')
            .where('role_id', roleId)
            .then((roles) => roles.map((r) => r.child_role_id));

        // Get inherited permissions with source role
        const inheritedPermissions = [];
        for (const inheritedRoleId of inheritedRoles) {
            const inheritedRole = await db('roles').where('id', inheritedRoleId).first();
            const perms = await db('role_permissions')
                .join('permissions', 'role_permissions.permission_id', 'permissions.id')
                .where('role_permissions.role_id', inheritedRoleId)
                .select('permissions.id', 'permissions.name', 'permissions.description');

            perms.forEach(p => {
                inheritedPermissions.push({
                    ...p,
                    sourceRoleId: inheritedRoleId,
                    sourceRoleName: inheritedRole?.name
                });
            });
        }

        // Combine and deduplicate
        const directPermissionIds = new Set(directPermissions.map(p => p.id));
        const filteredInherited = inheritedPermissions.filter(p => !directPermissionIds.has(p.id));

        res.json({
            role,
            directPermissions,
            inheritedPermissions: filteredInherited,
            inheritedRoles
        });
    } catch (err) {
        logger.error('Error fetching role permissions', err);
        res.status(500).json({ error: 'Failed to fetch role permissions' });
    }
};

/**
 * Get permission matrix (all roles x all permissions)
 * GET /admin/permissions/matrix
 */
const getPermissionMatrix = async (req, res) => {
    try {
        // Get all roles and permissions
        const roles = await db('roles').select('id', 'name', 'description').orderBy('id');
        const permissions = await db('permissions').select('id', 'name', 'description').orderBy('name');

        // Get all direct role-permission assignments
        const rolePermissions = await db('role_permissions')
            .select('role_id', 'permission_id');

        // Get all hierarchy relationships for inheritance calculation
        const hierarchy = await db('role_hierarchy')
            .select('parent_role_id', 'child_role_id');

        // Build inheritance map (which roles each role inherits from)
        const getInheritedRoles = (roleId, visited = new Set()) => {
            if (visited.has(roleId)) return [];
            visited.add(roleId);

            const directChildren = hierarchy
                .filter(h => h.parent_role_id === roleId)
                .map(h => h.child_role_id);

            let allInherited = [...directChildren];
            directChildren.forEach(childId => {
                allInherited = [...allInherited, ...getInheritedRoles(childId, visited)];
            });

            return [...new Set(allInherited)];
        };

        // Build matrix
        const matrix = {};
        roles.forEach(role => {
            matrix[role.id] = {
                role,
                permissions: {},
                inheritedRoles: getInheritedRoles(role.id)
            };
        });

        // Mark direct permissions
        rolePermissions.forEach(rp => {
            if (matrix[rp.role_id]) {
                matrix[rp.role_id].permissions[rp.permission_id] = {
                    hasPermission: true,
                    isDirect: true,
                    sourceRoleId: rp.role_id
                };
            }
        });

        // Mark inherited permissions
        roles.forEach(role => {
            const inheritedRoles = matrix[role.id].inheritedRoles;
            inheritedRoles.forEach(inheritedRoleId => {
                const inheritedPerms = rolePermissions.filter(rp => rp.role_id === inheritedRoleId);
                inheritedPerms.forEach(rp => {
                    // Only mark as inherited if not already direct
                    if (!matrix[role.id].permissions[rp.permission_id]?.isDirect) {
                        const sourceRole = roles.find(r => r.id === inheritedRoleId);
                        matrix[role.id].permissions[rp.permission_id] = {
                            hasPermission: true,
                            isDirect: false,
                            sourceRoleId: inheritedRoleId,
                            sourceRoleName: sourceRole?.name
                        };
                    }
                });
            });
        });

        res.json({
            roles,
            permissions,
            matrix: Object.values(matrix)
        });
    } catch (err) {
        logger.error('Error fetching permission matrix', err);
        res.status(500).json({ error: 'Failed to fetch permission matrix' });
    }
};

/**
 * Update permissions for a role (set direct permissions)
 * PUT /admin/permissions/roles/:roleId
 * Body: { permissionIds: [1, 2, 3] }
 */
const updateRolePermissions = async (req, res) => {
    try {
        const { roleId } = req.params;
        const { permissionIds } = req.body;

        // Validate role exists
        const role = await db('roles').where('id', roleId).first();
        if (!role) {
            return res.status(404).json({ error: 'Role not found' });
        }

        // Prevent modifying super_admin if it would remove critical permissions
        if (role.name === 'super_admin') {
            // Get all permission IDs
            const allPermissions = await db('permissions').select('id');
            const allPermissionIds = allPermissions.map(p => p.id);

            // Super admin should have all permissions
            const missingPermissions = allPermissionIds.filter(id => !permissionIds.includes(id));
            if (missingPermissions.length > 0) {
                return res.status(400).json({
                    error: 'Cannot remove permissions from super_admin role. Super admin must have all permissions.'
                });
            }
        }

        // Validate all permission IDs exist
        const validPermissions = await db('permissions')
            .whereIn('id', permissionIds)
            .select('id');
        const validIds = validPermissions.map(p => p.id);
        const invalidIds = permissionIds.filter(id => !validIds.includes(id));

        if (invalidIds.length > 0) {
            return res.status(400).json({
                error: `Invalid permission IDs: ${invalidIds.join(', ')}`
            });
        }

        // Start transaction
        await db.transaction(async (trx) => {
            // Get current permissions for logging
            const currentPermissions = await trx('role_permissions')
                .where('role_id', roleId)
                .select('permission_id');
            const currentIds = currentPermissions.map(p => p.permission_id);

            // Calculate added and removed
            const added = permissionIds.filter(id => !currentIds.includes(id));
            const removed = currentIds.filter(id => !permissionIds.includes(id));

            // Delete all current permissions for this role
            await trx('role_permissions')
                .where('role_id', roleId)
                .del();

            // Insert new permissions
            if (permissionIds.length > 0) {
                const inserts = permissionIds.map(permissionId => ({
                    role_id: parseInt(roleId),
                    permission_id: permissionId
                }));
                await trx('role_permissions').insert(inserts);
            }

            // Log the change
            await trx('activity_logs').insert({
                user_id: req.user.id,
                action: 'role_permissions_updated',
                metadata: JSON.stringify({
                    description: `Updated permissions for role '${role.name}'. Added: ${added.length}, Removed: ${removed.length}`,
                    roleId: parseInt(roleId),
                    roleName: role.name,
                    added,
                    removed,
                    newPermissions: permissionIds
                })
            });
        });

        // Get updated permissions
        const updatedPermissions = await db('role_permissions')
            .join('permissions', 'role_permissions.permission_id', 'permissions.id')
            .where('role_permissions.role_id', roleId)
            .select('permissions.id', 'permissions.name', 'permissions.description');

        res.json({
            message: 'Role permissions updated successfully',
            role,
            permissions: updatedPermissions
        });
    } catch (err) {
        logger.error('Error updating role permissions', err);
        res.status(500).json({ error: 'Failed to update role permissions' });
    }
};

/**
 * Create a new role
 * POST /admin/permissions/roles
 * Body: { name: string, description: string, permissionIds: number[], parentRoleId?: number }
 */
const createRole = async (req, res) => {
    try {
        const { name, description, permissionIds = [], parentRoleId } = req.body;

        // Validate required fields
        if (!name || !name.trim()) {
            return res.status(400).json({ error: 'Role name is required' });
        }

        // Validate name format (lowercase, underscores only)
        const nameRegex = /^[a-z][a-z0-9_]*$/;
        if (!nameRegex.test(name)) {
            return res.status(400).json({
                error: 'Role name must start with a letter and contain only lowercase letters, numbers, and underscores'
            });
        }

        // Check if role name already exists
        const existingRole = await db('roles').where('name', name).first();
        if (existingRole) {
            return res.status(400).json({ error: 'A role with this name already exists' });
        }

        // Validate parent role if provided
        if (parentRoleId) {
            const parentRole = await db('roles').where('id', parentRoleId).first();
            if (!parentRole) {
                return res.status(400).json({ error: 'Parent role not found' });
            }
        }

        // Validate permission IDs
        if (permissionIds.length > 0) {
            const validPermissions = await db('permissions')
                .whereIn('id', permissionIds)
                .select('id');
            const validIds = validPermissions.map(p => p.id);
            const invalidIds = permissionIds.filter(id => !validIds.includes(id));

            if (invalidIds.length > 0) {
                return res.status(400).json({
                    error: `Invalid permission IDs: ${invalidIds.join(', ')}`
                });
            }
        }

        let newRole;
        await db.transaction(async (trx) => {
            // Create the role
            const [roleId] = await trx('roles').insert({
                name: name.trim(),
                description: description?.trim() || null
            });

            newRole = await trx('roles').where('id', roleId).first();

            // Add permissions
            if (permissionIds.length > 0) {
                const permInserts = permissionIds.map(permissionId => ({
                    role_id: roleId,
                    permission_id: permissionId
                }));
                await trx('role_permissions').insert(permInserts);
            }

            // Add to hierarchy if parent specified
            // Note: In role_hierarchy, parent_role_id is the role that INHERITS FROM child_role_id
            // So if we want the new role to inherit from parentRoleId, we insert parent_role_id=new_role, child_role_id=parentRoleId
            if (parentRoleId) {
                await trx('role_hierarchy').insert({
                    parent_role_id: roleId,
                    child_role_id: parseInt(parentRoleId)
                });
            }

            // Log the action
            await trx('activity_logs').insert({
                user_id: req.user.id,
                action: 'role_created',
                metadata: JSON.stringify({
                    description: `Created new role '${name}'`,
                    roleId,
                    name,
                    roleDescription: description,
                    permissionIds,
                    parentRoleId
                })
            });
        });

        res.status(201).json({
            message: 'Role created successfully',
            role: newRole
        });
    } catch (err) {
        logger.error('Error creating role', err);
        res.status(500).json({ error: 'Failed to create role' });
    }
};

/**
 * Delete a role
 * DELETE /admin/permissions/roles/:roleId
 */
const deleteRole = async (req, res) => {
    try {
        const { roleId } = req.params;

        // Get the role
        const role = await db('roles').where('id', roleId).first();
        if (!role) {
            return res.status(404).json({ error: 'Role not found' });
        }

        // Prevent deleting protected roles
        const protectedRoles = ['super_admin', 'user', 'league_user'];
        if (protectedRoles.includes(role.name)) {
            return res.status(400).json({
                error: `Cannot delete the '${role.name}' role. This is a protected system role.`
            });
        }

        // Check if any users have this role
        const usersWithRole = await db('users').where('role_id', roleId).count('id as count').first();
        if (usersWithRole.count > 0) {
            return res.status(400).json({
                error: `Cannot delete role '${role.name}'. ${usersWithRole.count} user(s) are assigned to this role. Reassign them first.`
            });
        }

        // Check if any roles inherit from this role
        const childRoles = await db('role_hierarchy')
            .where('child_role_id', roleId)
            .join('roles', 'role_hierarchy.parent_role_id', 'roles.id')
            .select('roles.name');

        if (childRoles.length > 0) {
            const parentNames = childRoles.map(r => r.name).join(', ');
            return res.status(400).json({
                error: `Cannot delete role '${role.name}'. It is inherited by: ${parentNames}. Remove hierarchy links first.`
            });
        }

        await db.transaction(async (trx) => {
            // Delete role permissions
            await trx('role_permissions').where('role_id', roleId).del();

            // Delete hierarchy links where this role is the parent
            await trx('role_hierarchy').where('parent_role_id', roleId).del();

            // Delete hierarchy links where this role is the child
            await trx('role_hierarchy').where('child_role_id', roleId).del();

            // Delete the role
            await trx('roles').where('id', roleId).del();

            // Log the action
            await trx('activity_logs').insert({
                user_id: req.user.id,
                action: 'role_deleted',
                metadata: JSON.stringify({
                    description: `Deleted role '${role.name}'`,
                    roleId: parseInt(roleId),
                    roleName: role.name,
                    roleDescription: role.description
                })
            });
        });

        res.json({
            message: `Role '${role.name}' deleted successfully`
        });
    } catch (err) {
        logger.error('Error deleting role', err);
        res.status(500).json({ error: 'Failed to delete role' });
    }
};

/**
 * Update role hierarchy (change or remove parent role)
 * PUT /admin/permissions/roles/:roleId/hierarchy
 * Body: { parentRoleId: number | null }
 */
const updateRoleHierarchy = async (req, res) => {
    try {
        const { roleId } = req.params;
        const { parentRoleId } = req.body;

        // Get the role
        const role = await db('roles').where('id', roleId).first();
        if (!role) {
            return res.status(404).json({ error: 'Role not found' });
        }

        // Prevent modifying protected roles
        const protectedRoles = ['super_admin', 'user'];
        if (protectedRoles.includes(role.name)) {
            return res.status(400).json({
                error: `Cannot modify hierarchy for the '${role.name}' role. This is a protected system role.`
            });
        }

        // Validate parent role if provided
        if (parentRoleId !== null && parentRoleId !== undefined) {
            const parentRole = await db('roles').where('id', parentRoleId).first();
            if (!parentRole) {
                return res.status(400).json({ error: 'Parent role not found' });
            }

            // Prevent circular references - check if the new parent inherits from this role
            const wouldCreateCycle = await checkForCycle(roleId, parentRoleId);
            if (wouldCreateCycle) {
                return res.status(400).json({
                    error: 'Cannot set this parent role as it would create a circular hierarchy'
                });
            }
        }

        await db.transaction(async (trx) => {
            // Get current parent for logging
            const currentHierarchy = await trx('role_hierarchy')
                .where('parent_role_id', roleId)
                .select('child_role_id');
            const currentParentId = currentHierarchy.length > 0 ? currentHierarchy[0].child_role_id : null;

            // Remove existing hierarchy where this role is the parent (correct direction)
            await trx('role_hierarchy').where('parent_role_id', roleId).del();

            // Also clean up any backwards entries from the old buggy createRole
            // (where this role was incorrectly set as the child_role_id)
            await trx('role_hierarchy').where('child_role_id', roleId).del();

            // Add new hierarchy if parentRoleId is provided
            if (parentRoleId !== null && parentRoleId !== undefined) {
                await trx('role_hierarchy').insert({
                    parent_role_id: parseInt(roleId),
                    child_role_id: parseInt(parentRoleId)
                });
            }

            // Log the action
            await trx('activity_logs').insert({
                user_id: req.user.id,
                action: 'role_hierarchy_updated',
                metadata: JSON.stringify({
                    description: `Updated hierarchy for role '${role.name}'`,
                    roleId: parseInt(roleId),
                    roleName: role.name,
                    previousParentId: currentParentId,
                    newParentId: parentRoleId
                })
            });
        });

        res.json({
            message: `Role hierarchy updated successfully`,
            roleId: parseInt(roleId),
            parentRoleId: parentRoleId
        });
    } catch (err) {
        logger.error('Error updating role hierarchy', err);
        res.status(500).json({ error: 'Failed to update role hierarchy' });
    }
};

/**
 * Check if setting a parent would create a circular hierarchy
 *
 * In role_hierarchy table:
 * - parent_role_id is the role that INHERITS FROM child_role_id
 * - So child_role_id is the actual "parent" in inheritance terms
 *
 * To check for cycles when making roleId inherit from newParentId:
 * - We need to check if newParentId already inherits from roleId
 * - If it does, setting roleId to inherit from newParentId would create a cycle
 */
const checkForCycle = async (roleId, newParentId) => {
    const hierarchy = await db('role_hierarchy')
        .select('parent_role_id', 'child_role_id');

    // Get all roles that a given role inherits FROM (following the child_role_id chain)
    const getInheritedFrom = (roleIdToCheck, visited = new Set()) => {
        if (visited.has(roleIdToCheck)) return [];
        visited.add(roleIdToCheck);

        // Find entries where this role is the "parent" (the one inheriting)
        const inheritedFrom = hierarchy
            .filter(h => h.parent_role_id === roleIdToCheck)
            .map(h => h.child_role_id);

        let allInherited = [...inheritedFrom];
        inheritedFrom.forEach(inheritedId => {
            allInherited = [...allInherited, ...getInheritedFrom(inheritedId, visited)];
        });

        return [...new Set(allInherited)];
    };

    // Check if newParentId already inherits from roleId
    // If it does, making roleId inherit from newParentId would create a cycle
    const rolesNewParentInheritsFrom = getInheritedFrom(parseInt(newParentId));
    return rolesNewParentInheritsFrom.includes(parseInt(roleId));
};

module.exports = {
    getAllPermissions,
    getAllRolesWithDetails,
    getRoleHierarchy,
    getRolePermissions,
    getPermissionMatrix,
    updateRolePermissions,
    updateRoleHierarchy,
    createRole,
    deleteRole
};
