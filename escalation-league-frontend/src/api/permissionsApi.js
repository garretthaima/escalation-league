import axiosInstance from './axiosConfig';

/**
 * Get all permissions
 */
export const getAllPermissions = async () => {
    const response = await axiosInstance.get('/admin/permissions');
    return response.data;
};

/**
 * Get all roles with details
 */
export const getAllRolesWithDetails = async () => {
    const response = await axiosInstance.get('/admin/permissions/roles');
    return response.data;
};

/**
 * Get role hierarchy tree
 */
export const getRoleHierarchy = async () => {
    const response = await axiosInstance.get('/admin/permissions/hierarchy');
    return response.data;
};

/**
 * Get permission matrix (all roles x all permissions)
 */
export const getPermissionMatrix = async () => {
    const response = await axiosInstance.get('/admin/permissions/matrix');
    return response.data;
};

/**
 * Get permissions for a specific role (direct + inherited)
 * @param {number} roleId - Role ID
 */
export const getRolePermissions = async (roleId) => {
    const response = await axiosInstance.get(`/admin/permissions/roles/${roleId}`);
    return response.data;
};

/**
 * Update permissions for a role
 * @param {number} roleId - Role ID
 * @param {number[]} permissionIds - Array of permission IDs to assign
 */
export const updateRolePermissions = async (roleId, permissionIds) => {
    const response = await axiosInstance.put(`/admin/permissions/roles/${roleId}`, {
        permissionIds
    });
    return response.data;
};

/**
 * Create a new role
 * @param {string} name - Role name (lowercase, underscores only)
 * @param {string} description - Role description
 * @param {number[]} permissionIds - Array of permission IDs to assign
 * @param {number} parentRoleId - Optional parent role ID for hierarchy
 */
export const createRole = async (name, description, permissionIds = [], parentRoleId = null) => {
    const response = await axiosInstance.post('/admin/permissions/roles', {
        name,
        description,
        permissionIds,
        parentRoleId
    });
    return response.data;
};

/**
 * Delete a role
 * @param {number} roleId - Role ID to delete
 */
export const deleteRole = async (roleId) => {
    const response = await axiosInstance.delete(`/admin/permissions/roles/${roleId}`);
    return response.data;
};
