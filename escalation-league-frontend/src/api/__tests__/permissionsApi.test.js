// Mock axiosInstance BEFORE importing modules that use it
jest.mock('../axiosConfig', () => ({
    __esModule: true,
    default: {
        get: jest.fn(),
        post: jest.fn(),
        put: jest.fn(),
        delete: jest.fn(),
    },
}));

import axiosInstance from '../axiosConfig';
import {
    getAllPermissions,
    getAllRolesWithDetails,
    getRoleHierarchy,
    getPermissionMatrix,
    getRolePermissions,
    updateRolePermissions,
    updateRoleHierarchy,
    createRole,
    deleteRole,
} from '../permissionsApi';

describe('permissionsApi', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('getAllPermissions', () => {
        it('should fetch all permissions successfully', async () => {
            const mockPermissions = {
                permissions: [
                    { id: 1, name: 'permission1' },
                    { id: 2, name: 'permission2' },
                ],
            };
            axiosInstance.get.mockResolvedValue({ data: mockPermissions });

            const result = await getAllPermissions();

            expect(axiosInstance.get).toHaveBeenCalledWith('/admin/permissions');
            expect(result).toEqual(mockPermissions);
        });

        it('should propagate errors', async () => {
            const error = new Error('Network error');
            axiosInstance.get.mockRejectedValue(error);

            await expect(getAllPermissions()).rejects.toThrow('Network error');
        });
    });

    describe('getAllRolesWithDetails', () => {
        it('should fetch all roles with details', async () => {
            const mockRoles = {
                roles: [
                    { id: 1, name: 'super_admin', description: 'Admin' },
                    { id: 2, name: 'user', description: 'User' },
                ],
            };
            axiosInstance.get.mockResolvedValue({ data: mockRoles });

            const result = await getAllRolesWithDetails();

            expect(axiosInstance.get).toHaveBeenCalledWith('/admin/permissions/roles');
            expect(result).toEqual(mockRoles);
        });
    });

    describe('getRoleHierarchy', () => {
        it('should fetch role hierarchy', async () => {
            const mockHierarchy = {
                roles: [{ id: 1, name: 'super_admin' }],
                hierarchy: [{ id: 1, name: 'super_admin', children: [] }],
            };
            axiosInstance.get.mockResolvedValue({ data: mockHierarchy });

            const result = await getRoleHierarchy();

            expect(axiosInstance.get).toHaveBeenCalledWith('/admin/permissions/hierarchy');
            expect(result).toEqual(mockHierarchy);
        });
    });

    describe('getPermissionMatrix', () => {
        it('should fetch permission matrix', async () => {
            const mockMatrix = {
                roles: [{ id: 1, name: 'super_admin' }],
                permissions: [{ id: 1, name: 'admin_page_access' }],
                matrix: [
                    {
                        role: { id: 1, name: 'super_admin' },
                        permissions: { 1: { hasPermission: true, isDirect: true } },
                        inheritedRoles: [],
                    },
                ],
            };
            axiosInstance.get.mockResolvedValue({ data: mockMatrix });

            const result = await getPermissionMatrix();

            expect(axiosInstance.get).toHaveBeenCalledWith('/admin/permissions/matrix');
            expect(result).toEqual(mockMatrix);
        });
    });

    describe('getRolePermissions', () => {
        it('should fetch permissions for a specific role', async () => {
            const roleId = 5;
            const mockResponse = {
                role: { id: 5, name: 'user' },
                directPermissions: [{ id: 1, name: 'perm1' }],
                inheritedPermissions: [],
            };
            axiosInstance.get.mockResolvedValue({ data: mockResponse });

            const result = await getRolePermissions(roleId);

            expect(axiosInstance.get).toHaveBeenCalledWith('/admin/permissions/roles/5');
            expect(result).toEqual(mockResponse);
        });
    });

    describe('updateRolePermissions', () => {
        it('should update role permissions', async () => {
            const roleId = 5;
            const permissionIds = [1, 2, 3];
            const mockResponse = { message: 'Permissions updated' };
            axiosInstance.put.mockResolvedValue({ data: mockResponse });

            const result = await updateRolePermissions(roleId, permissionIds);

            expect(axiosInstance.put).toHaveBeenCalledWith('/admin/permissions/roles/5', {
                permissionIds,
            });
            expect(result).toEqual(mockResponse);
        });

        it('should handle empty permission array', async () => {
            const roleId = 5;
            const permissionIds = [];
            const mockResponse = { message: 'Permissions updated' };
            axiosInstance.put.mockResolvedValue({ data: mockResponse });

            const result = await updateRolePermissions(roleId, permissionIds);

            expect(axiosInstance.put).toHaveBeenCalledWith('/admin/permissions/roles/5', {
                permissionIds: [],
            });
            expect(result).toEqual(mockResponse);
        });
    });

    describe('updateRoleHierarchy', () => {
        it('should update role hierarchy with a parent', async () => {
            const roleId = 7;
            const parentRoleId = 5;
            const mockResponse = {
                message: 'Role hierarchy updated successfully',
                roleId: 7,
                parentRoleId: 5,
            };
            axiosInstance.put.mockResolvedValue({ data: mockResponse });

            const result = await updateRoleHierarchy(roleId, parentRoleId);

            expect(axiosInstance.put).toHaveBeenCalledWith('/admin/permissions/roles/7/hierarchy', {
                parentRoleId: 5,
            });
            expect(result).toEqual(mockResponse);
        });

        it('should update role hierarchy to remove parent (null)', async () => {
            const roleId = 7;
            const parentRoleId = null;
            const mockResponse = {
                message: 'Role hierarchy updated successfully',
                roleId: 7,
                parentRoleId: null,
            };
            axiosInstance.put.mockResolvedValue({ data: mockResponse });

            const result = await updateRoleHierarchy(roleId, parentRoleId);

            expect(axiosInstance.put).toHaveBeenCalledWith('/admin/permissions/roles/7/hierarchy', {
                parentRoleId: null,
            });
            expect(result).toEqual(mockResponse);
        });

        it('should propagate errors for protected roles', async () => {
            const roleId = 1;
            const error = {
                response: {
                    data: { error: 'Cannot modify hierarchy for protected role' },
                },
            };
            axiosInstance.put.mockRejectedValue(error);

            await expect(updateRoleHierarchy(roleId, 5)).rejects.toEqual(error);
        });
    });

    describe('createRole', () => {
        it('should create a new role without parent', async () => {
            const name = 'test_role';
            const description = 'Test role';
            const permissionIds = [1, 2];
            const mockResponse = {
                message: 'Role created successfully',
                role: { id: 10, name: 'test_role' },
            };
            axiosInstance.post.mockResolvedValue({ data: mockResponse });

            const result = await createRole(name, description, permissionIds);

            expect(axiosInstance.post).toHaveBeenCalledWith('/admin/permissions/roles', {
                name,
                description,
                permissionIds,
                parentRoleId: null,
            });
            expect(result).toEqual(mockResponse);
        });

        it('should create a new role with parent', async () => {
            const name = 'child_role';
            const description = 'Child role';
            const permissionIds = [];
            const parentRoleId = 5;
            const mockResponse = {
                message: 'Role created successfully',
                role: { id: 11, name: 'child_role' },
            };
            axiosInstance.post.mockResolvedValue({ data: mockResponse });

            const result = await createRole(name, description, permissionIds, parentRoleId);

            expect(axiosInstance.post).toHaveBeenCalledWith('/admin/permissions/roles', {
                name,
                description,
                permissionIds,
                parentRoleId: 5,
            });
            expect(result).toEqual(mockResponse);
        });

        it('should handle duplicate name error', async () => {
            const error = {
                response: {
                    data: { error: 'A role with this name already exists' },
                },
            };
            axiosInstance.post.mockRejectedValue(error);

            await expect(createRole('user', 'Duplicate', [])).rejects.toEqual(error);
        });
    });

    describe('deleteRole', () => {
        it('should delete a role', async () => {
            const roleId = 10;
            const mockResponse = { message: "Role 'test_role' deleted successfully" };
            axiosInstance.delete.mockResolvedValue({ data: mockResponse });

            const result = await deleteRole(roleId);

            expect(axiosInstance.delete).toHaveBeenCalledWith('/admin/permissions/roles/10');
            expect(result).toEqual(mockResponse);
        });

        it('should handle protected role error', async () => {
            const roleId = 1;
            const error = {
                response: {
                    data: { error: 'Cannot delete protected system role' },
                },
            };
            axiosInstance.delete.mockRejectedValue(error);

            await expect(deleteRole(roleId)).rejects.toEqual(error);
        });

        it('should handle role with users error', async () => {
            const roleId = 5;
            const error = {
                response: {
                    data: { error: '10 user(s) are assigned to this role' },
                },
            };
            axiosInstance.delete.mockRejectedValue(error);

            await expect(deleteRole(roleId)).rejects.toEqual(error);
        });
    });
});
