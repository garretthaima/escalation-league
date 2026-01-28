import React, { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getAllUsers, getAllRoles, assignUserRole } from '../../api/adminApi';
import { getPermissionMatrix, getRoleHierarchy, updateRolePermissions, createRole, deleteRole } from '../../api/permissionsApi';
import { useToast } from '../../context/ToastContext';
import LoadingSpinner from '../Shared/LoadingSpinner';
import './UserRoleManagementPage.css';

const VALID_TABS = ['users', 'matrix', 'hierarchy', 'roles'];

const UserRoleManagementPage = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const [users, setUsers] = useState([]);
    const [roles, setRoles] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [roleFilter, setRoleFilter] = useState('all');
    const [selectedUser, setSelectedUser] = useState(null);
    const [selectedRoleId, setSelectedRoleId] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [updating, setUpdating] = useState(false);
    const { showToast } = useToast();

    // Get active tab from URL, default to 'users'
    const tabParam = searchParams.get('tab');
    const activeTab = VALID_TABS.includes(tabParam) ? tabParam : 'users';

    const setActiveTab = (tab) => {
        setSearchParams({ tab });
    };
    const [matrixData, setMatrixData] = useState(null);
    const [hierarchyData, setHierarchyData] = useState(null);
    const [selectedRole, setSelectedRole] = useState(null);
    const [editedPermissions, setEditedPermissions] = useState(new Set());
    const [showPermissionModal, setShowPermissionModal] = useState(false);
    const [savingPermissions, setSavingPermissions] = useState(false);

    // Create role state
    const [showCreateRoleModal, setShowCreateRoleModal] = useState(false);
    const [newRoleName, setNewRoleName] = useState('');
    const [newRoleDescription, setNewRoleDescription] = useState('');
    const [newRoleParentId, setNewRoleParentId] = useState('');
    const [newRolePermissions, setNewRolePermissions] = useState(new Set());
    const [creatingRole, setCreatingRole] = useState(false);
    const [permissionSearch, setPermissionSearch] = useState('');
    const [permissionSort, setPermissionSort] = useState('name'); // 'name' or 'selected'

    // Delete role state
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [roleToDelete, setRoleToDelete] = useState(null);
    const [deletingRole, setDeletingRole] = useState(false);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [usersData, rolesData] = await Promise.all([
                getAllUsers(),
                getAllRoles()
            ]);
            setUsers(usersData.users || []);
            setRoles(rolesData || []);
        } catch (err) {
            console.error('Error fetching data:', err);
            showToast('Failed to load users and roles', 'error');
        } finally {
            setLoading(false);
        }
    }, [showToast]);

    const fetchPermissionsData = useCallback(async () => {
        try {
            const [matrix, hierarchy] = await Promise.all([
                getPermissionMatrix(),
                getRoleHierarchy()
            ]);
            setMatrixData(matrix);
            setHierarchyData(hierarchy);
        } catch (err) {
            console.error('Error fetching permissions data:', err);
            showToast('Failed to load permissions data', 'error');
        }
    }, [showToast]);

    useEffect(() => {
        fetchData();
        fetchPermissionsData();
    }, [fetchData, fetchPermissionsData]);

    const handleOpenModal = (user) => {
        setSelectedUser(user);
        setSelectedRoleId(user.role_id || null);
        setShowModal(true);
    };

    const handleCloseModal = () => {
        setSelectedUser(null);
        setSelectedRoleId(null);
        setShowModal(false);
    };

    const handleAssignRole = async () => {
        if (!selectedUser || !selectedRoleId) {
            showToast('Please select a role', 'warning');
            return;
        }

        setUpdating(true);
        try {
            const response = await assignUserRole(selectedUser.id, selectedRoleId);
            showToast(response.message || 'Role assigned successfully!', 'success');

            // Update local state
            setUsers(prev => prev.map(user =>
                user.id === selectedUser.id
                    ? { ...user, role_id: selectedRoleId, role: roles.find(r => r.id === selectedRoleId)?.name }
                    : user
            ));

            handleCloseModal();
        } catch (err) {
            console.error('Error assigning role:', err);
            showToast(err.response?.data?.error || 'Failed to assign role', 'error');
        } finally {
            setUpdating(false);
        }
    };

    // Permission editing handlers
    const handleEditRole = (roleData) => {
        setSelectedRole(roleData);
        const directPermissionIds = new Set();
        Object.entries(roleData.permissions).forEach(([permId, permData]) => {
            if (permData.isDirect) {
                directPermissionIds.add(parseInt(permId));
            }
        });
        setEditedPermissions(directPermissionIds);
        setShowPermissionModal(true);
    };

    const handleClosePermissionModal = () => {
        setSelectedRole(null);
        setEditedPermissions(new Set());
        setShowPermissionModal(false);
    };

    const handleTogglePermission = (permissionId) => {
        setEditedPermissions(prev => {
            const newSet = new Set(prev);
            if (newSet.has(permissionId)) {
                newSet.delete(permissionId);
            } else {
                newSet.add(permissionId);
            }
            return newSet;
        });
    };

    const handleSavePermissions = async () => {
        if (!selectedRole) return;

        setSavingPermissions(true);
        try {
            await updateRolePermissions(selectedRole.role.id, Array.from(editedPermissions));
            showToast('Permissions updated successfully', 'success');
            handleClosePermissionModal();
            fetchPermissionsData();
        } catch (err) {
            console.error('Error saving permissions:', err);
            showToast(err.response?.data?.error || 'Failed to save permissions', 'error');
        } finally {
            setSavingPermissions(false);
        }
    };

    // Create role handlers
    const handleOpenCreateRoleModal = () => {
        setNewRoleName('');
        setNewRoleDescription('');
        setNewRoleParentId('');
        setNewRolePermissions(new Set());
        setPermissionSearch('');
        setPermissionSort('name');
        setShowCreateRoleModal(true);
    };

    const handleCloseCreateRoleModal = () => {
        setShowCreateRoleModal(false);
        setNewRoleName('');
        setNewRoleDescription('');
        setNewRoleParentId('');
        setNewRolePermissions(new Set());
        setPermissionSearch('');
        setPermissionSort('name');
    };

    // Filter and sort permissions for create role modal
    const getFilteredSortedPermissions = () => {
        if (!matrixData?.permissions) return [];

        let filtered = matrixData.permissions.filter(p =>
            p.name.toLowerCase().includes(permissionSearch.toLowerCase()) ||
            p.description?.toLowerCase().includes(permissionSearch.toLowerCase())
        );

        if (permissionSort === 'selected') {
            filtered = [...filtered].sort((a, b) => {
                const aSelected = newRolePermissions.has(a.id);
                const bSelected = newRolePermissions.has(b.id);
                if (aSelected && !bSelected) return -1;
                if (!aSelected && bSelected) return 1;
                return a.name.localeCompare(b.name);
            });
        } else {
            filtered = [...filtered].sort((a, b) => a.name.localeCompare(b.name));
        }

        return filtered;
    };

    const handleToggleNewRolePermission = (permissionId) => {
        setNewRolePermissions(prev => {
            const newSet = new Set(prev);
            if (newSet.has(permissionId)) {
                newSet.delete(permissionId);
            } else {
                newSet.add(permissionId);
            }
            return newSet;
        });
    };

    const handleCreateRole = async () => {
        if (!newRoleName.trim()) {
            showToast('Role name is required', 'warning');
            return;
        }

        setCreatingRole(true);
        try {
            await createRole(
                newRoleName.trim(),
                newRoleDescription.trim(),
                Array.from(newRolePermissions),
                newRoleParentId ? parseInt(newRoleParentId) : null
            );
            showToast('Role created successfully', 'success');
            handleCloseCreateRoleModal();
            fetchData();
            fetchPermissionsData();
        } catch (err) {
            console.error('Error creating role:', err);
            showToast(err.response?.data?.error || 'Failed to create role', 'error');
        } finally {
            setCreatingRole(false);
        }
    };

    // Delete role handlers
    const handleOpenDeleteModal = (roleData) => {
        setRoleToDelete(roleData);
        setShowDeleteModal(true);
    };

    const handleCloseDeleteModal = () => {
        setShowDeleteModal(false);
        setRoleToDelete(null);
    };

    const handleDeleteRole = async () => {
        if (!roleToDelete) return;

        setDeletingRole(true);
        try {
            await deleteRole(roleToDelete.role.id);
            showToast(`Role '${roleToDelete.role.name}' deleted successfully`, 'success');
            handleCloseDeleteModal();
            fetchData();
            fetchPermissionsData();
        } catch (err) {
            console.error('Error deleting role:', err);
            showToast(err.response?.data?.error || 'Failed to delete role', 'error');
        } finally {
            setDeletingRole(false);
        }
    };

    const isProtectedRole = (roleName) => {
        return ['super_admin', 'user', 'league_user'].includes(roleName);
    };

    const renderHierarchyTree = (nodes, level = 0) => {
        if (!nodes || nodes.length === 0) return null;

        return (
            <ul className={`hierarchy-list ${level === 0 ? 'root' : ''}`}>
                {nodes.map(node => (
                    <li key={node.id} className="hierarchy-item">
                        <div className="hierarchy-node">
                            <span className="hierarchy-role-name">{node.name}</span>
                            <span className="hierarchy-role-id">(ID: {node.id})</span>
                        </div>
                        {node.children && node.children.length > 0 && renderHierarchyTree(node.children, level + 1)}
                    </li>
                ))}
            </ul>
        );
    };

    // Filter users based on search and role
    const filteredUsers = users.filter(user => {
        const matchesSearch = searchTerm === '' ||
            user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.firstname?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.lastname?.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesRole = roleFilter === 'all' || user.role_id === parseInt(roleFilter);

        return matchesSearch && matchesRole;
    });

    // Statistics
    const stats = {
        total: users.length,
        active: users.filter(u => u.is_active).length,
        inactive: users.filter(u => !u.is_active).length,
        byRole: roles.reduce((acc, role) => {
            acc[role.name] = users.filter(u => u.role_id === role.id).length;
            return acc;
        }, {})
    };

    if (loading) {
        return (
            <div className="container mt-4 text-center py-5">
                <LoadingSpinner size="lg" />
            </div>
        );
    }

    return (
        <div className="container-fluid mt-4 user-role-management">
            <div className="d-flex justify-content-between align-items-center mb-4">
                <h1>User & Role Management</h1>
            </div>

            {/* Tab Navigation */}
            <ul className="nav nav-tabs mb-4">
                <li className="nav-item">
                    <button
                        className={`nav-link ${activeTab === 'users' ? 'active' : ''}`}
                        onClick={() => setActiveTab('users')}
                    >
                        <i className="fas fa-users me-2"></i>
                        Users
                    </button>
                </li>
                <li className="nav-item">
                    <button
                        className={`nav-link ${activeTab === 'matrix' ? 'active' : ''}`}
                        onClick={() => setActiveTab('matrix')}
                    >
                        <i className="fas fa-table me-2"></i>
                        Permission Matrix
                    </button>
                </li>
                <li className="nav-item">
                    <button
                        className={`nav-link ${activeTab === 'hierarchy' ? 'active' : ''}`}
                        onClick={() => setActiveTab('hierarchy')}
                    >
                        <i className="fas fa-sitemap me-2"></i>
                        Role Hierarchy
                    </button>
                </li>
                <li className="nav-item">
                    <button
                        className={`nav-link ${activeTab === 'roles' ? 'active' : ''}`}
                        onClick={() => setActiveTab('roles')}
                    >
                        <i className="fas fa-users-cog me-2"></i>
                        Role Permissions
                    </button>
                </li>
            </ul>

            {/* Users Tab */}
            {activeTab === 'users' && (
                <>
                    {/* Statistics Dashboard */}
                    <div className="row mb-4">
                        <div className="col-md-3">
                            <div className="card text-center">
                                <div className="card-body">
                                    <h6 className="card-title text-muted">Total Users</h6>
                                    <h2 className="mb-0">{stats.total}</h2>
                                </div>
                            </div>
                        </div>
                        <div className="col-md-3">
                            <div className="card text-center">
                                <div className="card-body">
                                    <h6 className="card-title text-muted">Active</h6>
                                    <h2 className="mb-0 text-success">{stats.active}</h2>
                                </div>
                            </div>
                        </div>
                        <div className="col-md-3">
                            <div className="card text-center">
                                <div className="card-body">
                                    <h6 className="card-title text-muted">Inactive</h6>
                                    <h2 className="mb-0 text-warning">{stats.inactive}</h2>
                                </div>
                            </div>
                        </div>
                        <div className="col-md-3">
                            <div className="card text-center">
                                <div className="card-body">
                                    <h6 className="card-title text-muted">Roles</h6>
                                    <h2 className="mb-0">{roles.length}</h2>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Role Distribution */}
                    <div className="card mb-4">
                        <div className="card-body">
                            <h5 className="card-title mb-3">Role Distribution</h5>
                            <div className="row">
                                {roles.map(role => (
                                    <div key={role.id} className="col-md-4 mb-2">
                                        <div className="d-flex justify-content-between align-items-center">
                                            <span className="badge bg-secondary">{role.name}</span>
                                            <span className="badge bg-light text-dark">{stats.byRole[role.name] || 0} users</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Filters */}
                    <div className="card mb-4">
                        <div className="card-body">
                            <div className="row g-3">
                                <div className="col-md-6">
                                    <label htmlFor="searchTerm" className="form-label">Search Users</label>
                                    <input
                                        type="text"
                                        id="searchTerm"
                                        className="form-control"
                                        placeholder="Search by name or email..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                    />
                                </div>
                                <div className="col-md-6">
                                    <label htmlFor="roleFilter" className="form-label">Filter by Role</label>
                                    <select
                                        id="roleFilter"
                                        className="form-select"
                                        value={roleFilter}
                                        onChange={(e) => setRoleFilter(e.target.value)}
                                    >
                                        <option value="all">All Roles</option>
                                        {roles.map(role => (
                                            <option key={role.id} value={role.id}>{role.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Users Table */}
                    <div className="card">
                        <div className="card-body">
                            <h5 className="card-title mb-3">Users ({filteredUsers.length})</h5>

                            {/* Desktop Table */}
                            <div className="table-responsive user-table-desktop">
                                <table className="table table-hover">
                                    <thead>
                                        <tr>
                                            <th>ID</th>
                                            <th>Name</th>
                                            <th>Email</th>
                                            <th>Current Role</th>
                                            <th>Status</th>
                                            <th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredUsers.length === 0 ? (
                                            <tr>
                                                <td colSpan="6" className="text-center text-muted">
                                                    No users found
                                                </td>
                                            </tr>
                                        ) : (
                                            filteredUsers.map(user => {
                                                const userRole = roles.find(r => r.id === user.role_id);
                                                return (
                                                    <tr key={user.id} className={!user.is_active ? 'table-warning' : ''}>
                                                        <td>{user.id}</td>
                                                        <td>{user.firstname} {user.lastname}</td>
                                                        <td>{user.email}</td>
                                                        <td>
                                                            <span className="badge bg-secondary">
                                                                {userRole?.name || user.role || 'No Role'}
                                                            </span>
                                                        </td>
                                                        <td>
                                                            {user.is_active ? (
                                                                <span className="badge bg-success">Active</span>
                                                            ) : (
                                                                <span className="badge bg-warning">Inactive</span>
                                                            )}
                                                        </td>
                                                        <td>
                                                            <button
                                                                className="btn btn-sm btn-primary"
                                                                onClick={() => handleOpenModal(user)}
                                                            >
                                                                Change Role
                                                            </button>
                                                        </td>
                                                    </tr>
                                                );
                                            })
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            {/* Mobile Cards */}
                            <div className="user-cards-mobile">
                                {filteredUsers.length === 0 ? (
                                    <p className="text-center text-muted">No users found</p>
                                ) : (
                                    filteredUsers.map(user => {
                                        const userRole = roles.find(r => r.id === user.role_id);
                                        return (
                                            <div key={user.id} className={`card user-card mb-3 ${!user.is_active ? 'inactive' : ''}`}>
                                                <div className="card-body">
                                                    <div className="d-flex justify-content-between align-items-start mb-2">
                                                        <div>
                                                            <h6 className="card-title mb-1">
                                                                {user.firstname} {user.lastname}
                                                            </h6>
                                                            <small className="text-muted">{user.email}</small>
                                                        </div>
                                                        {user.is_active ? (
                                                            <span className="badge bg-success">Active</span>
                                                        ) : (
                                                            <span className="badge bg-warning">Inactive</span>
                                                        )}
                                                    </div>
                                                    <div className="mb-2">
                                                        <strong>Role:</strong>{' '}
                                                        <span className="badge bg-secondary">
                                                            {userRole?.name || user.role || 'No Role'}
                                                        </span>
                                                    </div>
                                                    <button
                                                        className="btn btn-sm btn-primary w-100"
                                                        onClick={() => handleOpenModal(user)}
                                                    >
                                                        Change Role
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>
                    </div>
                </>
            )}

            {/* Permission Matrix Tab */}
            {activeTab === 'matrix' && matrixData && (
                <div className="card">
                    <div className="card-header">
                        <h5 className="mb-0">
                            <i className="fas fa-table me-2"></i>
                            Permission Matrix
                        </h5>
                        <small className="text-muted">
                            Click on a role name to edit its permissions
                        </small>
                    </div>
                    <div className="card-body p-0">
                        <div className="table-responsive permission-matrix-container">
                            <table className="table table-bordered table-hover permission-matrix mb-0">
                                <thead className="sticky-header">
                                    <tr>
                                        <th className="permission-name-header">Permission</th>
                                        {matrixData.roles.map(role => (
                                            <th
                                                key={role.id}
                                                className="role-header"
                                                onClick={() => {
                                                    const roleData = matrixData.matrix.find(m => m.role.id === role.id);
                                                    if (roleData) handleEditRole(roleData);
                                                }}
                                                title={`Click to edit ${role.name} permissions`}
                                            >
                                                <span className="role-name">{role.name}</span>
                                                <i className="fas fa-edit edit-icon ms-1"></i>
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {matrixData.permissions.map(permission => (
                                        <tr key={permission.id}>
                                            <td className="permission-name" title={permission.description}>
                                                {permission.name}
                                            </td>
                                            {matrixData.matrix.map(roleData => {
                                                const permData = roleData.permissions[permission.id];
                                                const hasPermission = permData?.hasPermission;
                                                const isDirect = permData?.isDirect;

                                                return (
                                                    <td
                                                        key={`${roleData.role.id}-${permission.id}`}
                                                        className={`permission-cell ${hasPermission ? (isDirect ? 'direct' : 'inherited') : ''}`}
                                                        title={
                                                            hasPermission
                                                                ? isDirect
                                                                    ? 'Direct permission'
                                                                    : `Inherited from ${permData.sourceRoleName}`
                                                                : 'No permission'
                                                        }
                                                    >
                                                        {hasPermission && (
                                                            <i className={`fas ${isDirect ? 'fa-circle' : 'fa-circle-notch'}`}></i>
                                                        )}
                                                    </td>
                                                );
                                            })}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                    <div className="card-footer">
                        <div className="d-flex gap-4">
                            <span>
                                <i className="fas fa-circle text-primary me-2"></i>
                                Direct permission (editable)
                            </span>
                            <span>
                                <i className="fas fa-circle-notch text-info me-2"></i>
                                Inherited permission
                            </span>
                        </div>
                    </div>
                </div>
            )}

            {/* Role Hierarchy Tab */}
            {activeTab === 'hierarchy' && hierarchyData && (
                <div className="card">
                    <div className="card-header">
                        <h5 className="mb-0">
                            <i className="fas fa-sitemap me-2"></i>
                            Role Hierarchy
                        </h5>
                        <small className="text-muted">
                            Shows how roles inherit permissions from child roles
                        </small>
                    </div>
                    <div className="card-body">
                        <div className="hierarchy-container">
                            {hierarchyData.hierarchy && hierarchyData.hierarchy.length > 0 ? (
                                renderHierarchyTree(hierarchyData.hierarchy)
                            ) : (
                                <p className="text-muted">No hierarchy data available</p>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Role Permissions Tab */}
            {activeTab === 'roles' && matrixData && (
                <>
                    <div className="d-flex justify-content-between align-items-center mb-4">
                        <h5 className="mb-0">Roles ({matrixData.roles.length})</h5>
                        <button
                            className="btn btn-primary"
                            onClick={handleOpenCreateRoleModal}
                        >
                            <i className="fas fa-plus me-2"></i>
                            Create Role
                        </button>
                    </div>
                    <div className="row">
                    {matrixData.matrix.map(roleData => {
                        const directCount = Object.values(roleData.permissions)
                            .filter(p => p.isDirect).length;
                        const inheritedCount = Object.values(roleData.permissions)
                            .filter(p => !p.isDirect && p.hasPermission).length;
                        const totalCount = directCount + inheritedCount;
                        const userCount = users.filter(u => u.role_id === roleData.role.id).length;

                        return (
                            <div key={roleData.role.id} className="col-md-6 col-lg-4 mb-4">
                                <div className="card role-card h-100">
                                    <div className="card-header d-flex justify-content-between align-items-center">
                                        <h5 className="mb-0">{roleData.role.name}</h5>
                                        <div className="d-flex gap-2">
                                            <span className="badge bg-secondary" title="Users with this role">
                                                <i className="fas fa-users me-1"></i>{userCount}
                                            </span>
                                            <span className="badge bg-primary">{totalCount} permissions</span>
                                        </div>
                                    </div>
                                    <div className="card-body">
                                        <p className="text-muted small mb-3">
                                            {roleData.role.description || 'No description'}
                                        </p>
                                        <div className="d-flex gap-3 mb-3">
                                            <div>
                                                <strong className="text-primary">{directCount}</strong>
                                                <span className="text-muted ms-1">direct</span>
                                            </div>
                                            <div>
                                                <strong className="text-info">{inheritedCount}</strong>
                                                <span className="text-muted ms-1">inherited</span>
                                            </div>
                                        </div>
                                        {roleData.inheritedRoles.length > 0 && (
                                            <div className="mb-3">
                                                <small className="text-muted">Inherits from:</small>
                                                <div className="mt-1">
                                                    {roleData.inheritedRoles.map(roleId => {
                                                        const inheritedRole = matrixData.roles.find(r => r.id === roleId);
                                                        return inheritedRole ? (
                                                            <span key={roleId} className="badge bg-secondary me-1">
                                                                {inheritedRole.name}
                                                            </span>
                                                        ) : null;
                                                    })}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                    <div className="card-footer">
                                        <div className="d-flex gap-2 align-items-center">
                                            <button
                                                className="btn btn-primary btn-sm flex-grow-1"
                                                onClick={() => handleEditRole(roleData)}
                                            >
                                                <i className="fas fa-edit me-2"></i>
                                                Edit
                                            </button>
                                            {!isProtectedRole(roleData.role.name) ? (
                                                <button
                                                    className="btn btn-outline-danger btn-sm d-flex align-items-center justify-content-center"
                                                    onClick={() => handleOpenDeleteModal(roleData)}
                                                    title="Delete role"
                                                    style={{ width: '36px', height: '36px' }}
                                                >
                                                    <i className="fas fa-trash"></i>
                                                </button>
                                            ) : (
                                                <div style={{ width: '36px' }}></div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                    </div>
                </>
            )}

            {/* Role Assignment Modal */}
            {showModal && selectedUser && (
                <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
                    <div className="modal-dialog modal-dialog-centered">
                        <div className="modal-content">
                            <div className="modal-header">
                                <h5 className="modal-title">Assign Role to {selectedUser.firstname} {selectedUser.lastname}</h5>
                                <button
                                    type="button"
                                    className="btn-close"
                                    onClick={handleCloseModal}
                                    disabled={updating}
                                ></button>
                            </div>
                            <div className="modal-body">
                                <div className="mb-3">
                                    <p className="text-muted mb-2">
                                        <strong>Email:</strong> {selectedUser.email}
                                    </p>
                                    <p className="text-muted mb-3">
                                        <strong>Current Role:</strong>{' '}
                                        <span className="badge bg-secondary">
                                            {roles.find(r => r.id === selectedUser.role_id)?.name || 'No Role'}
                                        </span>
                                    </p>
                                </div>
                                <div className="mb-3">
                                    <label htmlFor="roleSelect" className="form-label">
                                        Select New Role
                                    </label>
                                    <select
                                        id="roleSelect"
                                        className="form-select"
                                        value={selectedRoleId || ''}
                                        onChange={(e) => setSelectedRoleId(parseInt(e.target.value))}
                                        disabled={updating}
                                    >
                                        <option value="">-- Select a Role --</option>
                                        {roles.map(role => (
                                            <option key={role.id} value={role.id}>
                                                {role.name} - {role.description}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button
                                    type="button"
                                    className="btn btn-secondary"
                                    onClick={handleCloseModal}
                                    disabled={updating}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    className="btn btn-primary"
                                    onClick={handleAssignRole}
                                    disabled={updating || !selectedRoleId}
                                >
                                    {updating ? (
                                        <>
                                            <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                                            Assigning...
                                        </>
                                    ) : (
                                        'Assign Role'
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Permissions Modal */}
            {showPermissionModal && selectedRole && (
                <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
                    <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
                        <div className="modal-content">
                            <div className="modal-header">
                                <h5 className="modal-title">
                                    Edit Permissions: {selectedRole.role.name}
                                </h5>
                                <button
                                    type="button"
                                    className="btn-close"
                                    onClick={handleClosePermissionModal}
                                    disabled={savingPermissions}
                                ></button>
                            </div>
                            <div className="modal-body">
                                <p className="text-muted mb-3">
                                    {selectedRole.role.description}
                                </p>

                                {selectedRole.role.name === 'super_admin' && (
                                    <div className="alert alert-warning">
                                        <i className="fas fa-exclamation-triangle me-2"></i>
                                        Super admin must have all permissions. Changes are restricted.
                                    </div>
                                )}

                                <div className="permission-list">
                                    {matrixData.permissions.map(permission => {
                                        const permData = selectedRole.permissions[permission.id];
                                        const isInherited = permData?.hasPermission && !permData?.isDirect;
                                        const isChecked = editedPermissions.has(permission.id) || isInherited;
                                        const isDisabled = savingPermissions || isInherited || selectedRole.role.name === 'super_admin';

                                        return (
                                            <div
                                                key={permission.id}
                                                className={`form-check permission-item ${isInherited ? 'inherited' : ''}`}
                                            >
                                                <input
                                                    type="checkbox"
                                                    className="form-check-input"
                                                    id={`perm-${permission.id}`}
                                                    checked={isChecked}
                                                    onChange={() => handleTogglePermission(permission.id)}
                                                    disabled={isDisabled}
                                                />
                                                <label
                                                    className="form-check-label"
                                                    htmlFor={`perm-${permission.id}`}
                                                >
                                                    <strong>{permission.name}</strong>
                                                    {isInherited && (
                                                        <span className="badge bg-info ms-2">
                                                            Inherited from {permData.sourceRoleName}
                                                        </span>
                                                    )}
                                                    <br />
                                                    <small className="text-muted">{permission.description}</small>
                                                </label>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button
                                    type="button"
                                    className="btn btn-secondary"
                                    onClick={handleClosePermissionModal}
                                    disabled={savingPermissions}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    className="btn btn-primary"
                                    onClick={handleSavePermissions}
                                    disabled={savingPermissions || selectedRole.role.name === 'super_admin'}
                                >
                                    {savingPermissions ? (
                                        <>
                                            <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                                            Saving...
                                        </>
                                    ) : (
                                        <>
                                            <i className="fas fa-save me-2"></i>
                                            Save Changes
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Create Role Modal */}
            {showCreateRoleModal && matrixData && (
                <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
                    <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
                        <div className="modal-content">
                            <div className="modal-header">
                                <h5 className="modal-title">
                                    <i className="fas fa-plus-circle me-2"></i>
                                    Create New Role
                                </h5>
                                <button
                                    type="button"
                                    className="btn-close"
                                    onClick={handleCloseCreateRoleModal}
                                    disabled={creatingRole}
                                ></button>
                            </div>
                            <div className="modal-body">
                                <div className="mb-3">
                                    <label htmlFor="newRoleName" className="form-label">
                                        Role Name <span className="text-danger">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        className="form-control"
                                        id="newRoleName"
                                        value={newRoleName}
                                        onChange={(e) => setNewRoleName(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                                        placeholder="e.g., content_moderator"
                                        disabled={creatingRole}
                                    />
                                    <small className="text-muted">
                                        Lowercase letters, numbers, and underscores only
                                    </small>
                                </div>

                                <div className="mb-3">
                                    <label htmlFor="newRoleDescription" className="form-label">
                                        Description
                                    </label>
                                    <input
                                        type="text"
                                        className="form-control"
                                        id="newRoleDescription"
                                        value={newRoleDescription}
                                        onChange={(e) => setNewRoleDescription(e.target.value)}
                                        placeholder="A brief description of this role"
                                        disabled={creatingRole}
                                    />
                                </div>

                                <div className="mb-3">
                                    <label htmlFor="newRoleParent" className="form-label">
                                        Parent Role (Optional)
                                    </label>
                                    <select
                                        className="form-select"
                                        id="newRoleParent"
                                        value={newRoleParentId}
                                        onChange={(e) => setNewRoleParentId(e.target.value)}
                                        disabled={creatingRole}
                                    >
                                        <option value="">-- No Parent (Standalone Role) --</option>
                                        {matrixData.roles.map(role => (
                                            <option key={role.id} value={role.id}>
                                                {role.name}
                                            </option>
                                        ))}
                                    </select>
                                    <small className="text-muted">
                                        If set, this role will inherit permissions from the parent role
                                    </small>
                                </div>

                                <div className="mb-3">
                                    <label className="form-label">
                                        Direct Permissions
                                        {newRolePermissions.size > 0 && (
                                            <span className="badge bg-primary ms-2">{newRolePermissions.size} selected</span>
                                        )}
                                    </label>
                                    <div className="d-flex gap-2 mb-2">
                                        <div className="flex-grow-1">
                                            <input
                                                type="text"
                                                className="form-control form-control-sm"
                                                placeholder="Search permissions..."
                                                value={permissionSearch}
                                                onChange={(e) => setPermissionSearch(e.target.value)}
                                                disabled={creatingRole}
                                            />
                                        </div>
                                        <select
                                            className="form-select form-select-sm"
                                            style={{ width: 'auto' }}
                                            value={permissionSort}
                                            onChange={(e) => setPermissionSort(e.target.value)}
                                            disabled={creatingRole}
                                        >
                                            <option value="name">Sort by Name</option>
                                            <option value="selected">Selected First</option>
                                        </select>
                                    </div>
                                    <div className="permission-list border rounded p-2">
                                        {getFilteredSortedPermissions().map(permission => (
                                            <div key={permission.id} className="form-check permission-item">
                                                <input
                                                    type="checkbox"
                                                    className="form-check-input"
                                                    id={`new-perm-${permission.id}`}
                                                    checked={newRolePermissions.has(permission.id)}
                                                    onChange={() => handleToggleNewRolePermission(permission.id)}
                                                    disabled={creatingRole}
                                                />
                                                <label
                                                    className="form-check-label"
                                                    htmlFor={`new-perm-${permission.id}`}
                                                >
                                                    <strong>{permission.name}</strong>
                                                    <br />
                                                    <small className="text-muted">{permission.description}</small>
                                                </label>
                                            </div>
                                        ))}
                                        {getFilteredSortedPermissions().length === 0 && (
                                            <p className="text-muted text-center mb-0 py-2">
                                                No permissions match "{permissionSearch}"
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button
                                    type="button"
                                    className="btn btn-secondary"
                                    onClick={handleCloseCreateRoleModal}
                                    disabled={creatingRole}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    className="btn btn-primary"
                                    onClick={handleCreateRole}
                                    disabled={creatingRole || !newRoleName.trim()}
                                >
                                    {creatingRole ? (
                                        <>
                                            <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                                            Creating...
                                        </>
                                    ) : (
                                        <>
                                            <i className="fas fa-plus me-2"></i>
                                            Create Role
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Role Confirmation Modal */}
            {showDeleteModal && roleToDelete && (
                <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
                    <div className="modal-dialog modal-dialog-centered">
                        <div className="modal-content">
                            <div className="modal-header bg-danger text-white">
                                <h5 className="modal-title">
                                    <i className="fas fa-exclamation-triangle me-2"></i>
                                    Delete Role
                                </h5>
                                <button
                                    type="button"
                                    className="btn-close btn-close-white"
                                    onClick={handleCloseDeleteModal}
                                    disabled={deletingRole}
                                ></button>
                            </div>
                            <div className="modal-body">
                                <p>Are you sure you want to delete the role <strong>"{roleToDelete.role.name}"</strong>?</p>
                                <div className="alert alert-warning">
                                    <i className="fas fa-info-circle me-2"></i>
                                    This action cannot be undone. All permissions and hierarchy links for this role will be removed.
                                </div>
                                {roleToDelete.role.description && (
                                    <p className="text-muted small">
                                        <strong>Description:</strong> {roleToDelete.role.description}
                                    </p>
                                )}
                            </div>
                            <div className="modal-footer">
                                <button
                                    type="button"
                                    className="btn btn-secondary"
                                    onClick={handleCloseDeleteModal}
                                    disabled={deletingRole}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    className="btn btn-danger"
                                    onClick={handleDeleteRole}
                                    disabled={deletingRole}
                                >
                                    {deletingRole ? (
                                        <>
                                            <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                                            Deleting...
                                        </>
                                    ) : (
                                        <>
                                            <i className="fas fa-trash me-2"></i>
                                            Delete Role
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default UserRoleManagementPage;
