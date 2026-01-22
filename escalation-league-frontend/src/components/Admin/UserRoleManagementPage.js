import React, { useEffect, useState } from 'react';
import { getAllUsers, getAllRoles, assignUserRole } from '../../api/adminApi';
import { useToast } from '../context/ToastContext';
import LoadingSpinner from '../Shared/LoadingSpinner';
import './UserRoleManagementPage.css';

const UserRoleManagementPage = () => {
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

    useEffect(() => {
        fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const fetchData = async () => {
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
    };

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
        <div className="container mt-4 user-role-management">
            <div className="d-flex justify-content-between align-items-center mb-4">
                <h1>User Role Management</h1>
            </div>

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
        </div>
    );
};

export default UserRoleManagementPage;
