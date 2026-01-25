import React, { useEffect, useState, useCallback } from 'react';
import { getActivityLogs, getActionTypes } from '../../api/activityLogsApi';
import { getAllUsers } from '../../api/adminApi';
import { useToast } from '../../context/ToastContext';
import LoadingSpinner from '../Shared/LoadingSpinner';
import './ActivityLogsPage.css';

const ActivityLogsPage = () => {
    const [logs, setLogs] = useState([]);
    const [users, setUsers] = useState([]);
    const [actionTypes, setActionTypes] = useState([]);
    const [loading, setLoading] = useState(false);
    const [pagination, setPagination] = useState({
        page: 1,
        limit: 50,
        total: 0,
        totalPages: 0
    });

    // Filters
    const [filters, setFilters] = useState({
        action: '',
        userId: '',
        startDate: '',
        endDate: ''
    });

    const { showToast } = useToast();

    const fetchLogs = useCallback(async (page = 1) => {
        setLoading(true);
        try {
            const params = {
                page,
                limit: pagination.limit,
                ...filters
            };

            // Remove empty filter values
            Object.keys(params).forEach(key => {
                if (params[key] === '' || params[key] === null || params[key] === undefined) {
                    delete params[key];
                }
            });

            const data = await getActivityLogs(params);
            setLogs(data.logs || []);
            setPagination(prev => ({
                ...prev,
                page: data.pagination?.page || page,
                total: data.pagination?.total || 0,
                totalPages: data.pagination?.totalPages || 0
            }));
        } catch (err) {
            console.error('Error fetching activity logs:', err);
            showToast('Failed to load activity logs', 'error');
        } finally {
            setLoading(false);
        }
    }, [filters, pagination.limit, showToast]);

    const fetchFilterData = useCallback(async () => {
        try {
            const [usersData, actionTypesData] = await Promise.all([
                getAllUsers(),
                getActionTypes()
            ]);
            setUsers(usersData.users || usersData || []);
            setActionTypes(actionTypesData.actions || []);
        } catch (err) {
            console.error('Error fetching filter data:', err);
        }
    }, []);

    useEffect(() => {
        fetchLogs();
        fetchFilterData();
    }, [fetchLogs, fetchFilterData]);

    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        setFilters(prev => ({ ...prev, [name]: value }));
    };

    const handleApplyFilters = () => {
        fetchLogs(1);
    };

    const handleClearFilters = () => {
        setFilters({
            action: '',
            userId: '',
            startDate: '',
            endDate: ''
        });
        // Trigger a fetch with cleared filters
        setTimeout(() => fetchLogs(1), 0);
    };

    const handlePageChange = (newPage) => {
        if (newPage >= 1 && newPage <= pagination.totalPages) {
            fetchLogs(newPage);
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return '-';
        const date = new Date(dateString);
        return date.toLocaleString();
    };

    const formatMetadata = (metadata) => {
        if (!metadata) return '-';
        try {
            const parsed = typeof metadata === 'string' ? JSON.parse(metadata) : metadata;
            return (
                <ul className="metadata-list mb-0">
                    {Object.entries(parsed).map(([key, value]) => (
                        <li key={key}>
                            <strong>{key}:</strong> {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                        </li>
                    ))}
                </ul>
            );
        } catch {
            return String(metadata);
        }
    };

    return (
        <div className="container-fluid mt-4">
            <div className="d-flex justify-content-between align-items-center mb-4">
                <h1>
                    <i className="fas fa-history me-2"></i>
                    Activity Logs
                </h1>
                <span className="badge bg-secondary fs-6">
                    {pagination.total} total entries
                </span>
            </div>

            {/* Filters Card */}
            <div className="card mb-4">
                <div className="card-header">
                    <i className="fas fa-filter me-2"></i>
                    Filters
                </div>
                <div className="card-body">
                    <div className="row g-3">
                        <div className="col-md-3">
                            <label className="form-label">Action Type</label>
                            <select
                                className="form-select"
                                name="action"
                                value={filters.action}
                                onChange={handleFilterChange}
                            >
                                <option value="">All Actions</option>
                                {actionTypes.map(action => (
                                    <option key={action} value={action}>{action}</option>
                                ))}
                            </select>
                        </div>
                        <div className="col-md-3">
                            <label className="form-label">User</label>
                            <select
                                className="form-select"
                                name="userId"
                                value={filters.userId}
                                onChange={handleFilterChange}
                            >
                                <option value="">All Users</option>
                                {users.map(user => (
                                    <option key={user.id} value={user.id}>
                                        {user.firstname} {user.lastname} ({user.email})
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="col-md-2">
                            <label className="form-label">Start Date</label>
                            <input
                                type="datetime-local"
                                className="form-control"
                                name="startDate"
                                value={filters.startDate}
                                onChange={handleFilterChange}
                            />
                        </div>
                        <div className="col-md-2">
                            <label className="form-label">End Date</label>
                            <input
                                type="datetime-local"
                                className="form-control"
                                name="endDate"
                                value={filters.endDate}
                                onChange={handleFilterChange}
                            />
                        </div>
                        <div className="col-md-2 d-flex align-items-end gap-2">
                            <button
                                className="btn btn-primary"
                                onClick={handleApplyFilters}
                            >
                                <i className="fas fa-search me-1"></i>
                                Apply
                            </button>
                            <button
                                className="btn btn-outline-secondary"
                                onClick={handleClearFilters}
                            >
                                Clear
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Logs Table */}
            <div className="card">
                <div className="card-body">
                    {loading ? (
                        <div className="text-center py-5">
                            <LoadingSpinner size="md" />
                        </div>
                    ) : logs.length === 0 ? (
                        <div className="alert alert-info text-center">
                            <i className="fas fa-info-circle me-2"></i>
                            No activity logs found.
                        </div>
                    ) : (
                        <>
                            <div className="table-responsive">
                                <table className="table table-hover">
                                    <thead className="table-dark">
                                        <tr>
                                            <th style={{ width: '180px' }}>Timestamp</th>
                                            <th style={{ width: '200px' }}>User</th>
                                            <th style={{ width: '200px' }}>Action</th>
                                            <th>Details</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {logs.map(log => (
                                            <tr key={log.id}>
                                                <td className="text-nowrap">
                                                    <small>{formatDate(log.timestamp)}</small>
                                                </td>
                                                <td>
                                                    <div>
                                                        <strong>{log.firstname} {log.lastname}</strong>
                                                    </div>
                                                    <small className="text-muted">{log.email}</small>
                                                </td>
                                                <td>
                                                    <span className="badge bg-info text-dark">
                                                        {log.action}
                                                    </span>
                                                </td>
                                                <td>
                                                    {formatMetadata(log.metadata)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Pagination */}
                            {pagination.totalPages > 1 && (
                                <nav aria-label="Activity logs pagination">
                                    <ul className="pagination justify-content-center mb-0 mt-3">
                                        <li className={`page-item ${pagination.page === 1 ? 'disabled' : ''}`}>
                                            <button
                                                className="page-link"
                                                onClick={() => handlePageChange(1)}
                                                disabled={pagination.page === 1}
                                            >
                                                <i className="fas fa-angle-double-left"></i>
                                            </button>
                                        </li>
                                        <li className={`page-item ${pagination.page === 1 ? 'disabled' : ''}`}>
                                            <button
                                                className="page-link"
                                                onClick={() => handlePageChange(pagination.page - 1)}
                                                disabled={pagination.page === 1}
                                            >
                                                <i className="fas fa-angle-left"></i>
                                            </button>
                                        </li>
                                        <li className="page-item disabled">
                                            <span className="page-link">
                                                Page {pagination.page} of {pagination.totalPages}
                                            </span>
                                        </li>
                                        <li className={`page-item ${pagination.page === pagination.totalPages ? 'disabled' : ''}`}>
                                            <button
                                                className="page-link"
                                                onClick={() => handlePageChange(pagination.page + 1)}
                                                disabled={pagination.page === pagination.totalPages}
                                            >
                                                <i className="fas fa-angle-right"></i>
                                            </button>
                                        </li>
                                        <li className={`page-item ${pagination.page === pagination.totalPages ? 'disabled' : ''}`}>
                                            <button
                                                className="page-link"
                                                onClick={() => handlePageChange(pagination.totalPages)}
                                                disabled={pagination.page === pagination.totalPages}
                                            >
                                                <i className="fas fa-angle-double-right"></i>
                                            </button>
                                        </li>
                                    </ul>
                                </nav>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ActivityLogsPage;
