import React, { useEffect, useState, useCallback } from 'react';
import { getMyActivityLogs } from '../../../api/activityLogsApi';

const ActivityTab = () => {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [pagination, setPagination] = useState({
        page: 1,
        limit: 10,
        total: 0,
        totalPages: 0
    });

    const fetchLogs = useCallback(async (page = 1) => {
        setLoading(true);
        setError(null);
        try {
            const data = await getMyActivityLogs({ page, limit: pagination.limit });
            setLogs(data.logs || []);
            setPagination(prev => ({
                ...prev,
                page: data.pagination?.page || page,
                total: data.pagination?.total || 0,
                totalPages: data.pagination?.totalPages || 0
            }));
        } catch (err) {
            console.error('Error fetching activity logs:', err);
            setError('Failed to load activity history.');
        } finally {
            setLoading(false);
        }
    }, [pagination.limit]);

    useEffect(() => {
        fetchLogs();
    }, [fetchLogs]);

    const formatDate = (dateString) => {
        if (!dateString) return '-';
        const date = new Date(dateString);
        return date.toLocaleString();
    };

    const getActionIcon = (action) => {
        const actionLower = action.toLowerCase();
        if (actionLower.includes('login') || actionLower.includes('logged in')) return 'fa-sign-in-alt';
        if (actionLower.includes('logout') || actionLower.includes('logged out')) return 'fa-sign-out-alt';
        if (actionLower.includes('profile')) return 'fa-user-edit';
        if (actionLower.includes('password')) return 'fa-key';
        if (actionLower.includes('league') || actionLower.includes('signup')) return 'fa-trophy';
        if (actionLower.includes('game') || actionLower.includes('pod')) return 'fa-dice';
        if (actionLower.includes('confirm')) return 'fa-check-circle';
        return 'fa-history';
    };

    const handlePageChange = (newPage) => {
        if (newPage >= 1 && newPage <= pagination.totalPages) {
            fetchLogs(newPage);
        }
    };

    if (loading && logs.length === 0) {
        return (
            <div className="text-center py-4">
                <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Loading...</span>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="alert alert-danger">
                <i className="fas fa-exclamation-circle me-2"></i>
                {error}
            </div>
        );
    }

    return (
        <div className="activity-tab">
            <h5 className="mb-3">
                <i className="fas fa-history me-2"></i>
                Recent Activity
            </h5>

            {logs.length === 0 ? (
                <div className="alert alert-info">
                    <i className="fas fa-info-circle me-2"></i>
                    No activity recorded yet.
                </div>
            ) : (
                <>
                    <div className="list-group mb-3">
                        {logs.map(log => (
                            <div key={log.id} className="list-group-item">
                                <div className="d-flex w-100 justify-content-between align-items-start">
                                    <div>
                                        <i className={`fas ${getActionIcon(log.action)} me-2 text-primary`}></i>
                                        <strong>{log.action}</strong>
                                    </div>
                                    <small className="text-muted">
                                        {formatDate(log.timestamp)}
                                    </small>
                                </div>
                                {log.metadata && Object.keys(log.metadata).length > 0 && (
                                    <small className="text-muted d-block mt-1">
                                        {Object.entries(log.metadata).map(([key, value]) => (
                                            <span key={key} className="me-3">
                                                <em>{key}:</em> {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                                            </span>
                                        ))}
                                    </small>
                                )}
                            </div>
                        ))}
                    </div>

                    {/* Pagination */}
                    {pagination.totalPages > 1 && (
                        <nav aria-label="Activity pagination">
                            <ul className="pagination pagination-sm justify-content-center">
                                <li className={`page-item ${pagination.page === 1 ? 'disabled' : ''}`}>
                                    <button
                                        className="page-link"
                                        onClick={() => handlePageChange(pagination.page - 1)}
                                        disabled={pagination.page === 1}
                                    >
                                        Previous
                                    </button>
                                </li>
                                <li className="page-item disabled">
                                    <span className="page-link">
                                        {pagination.page} / {pagination.totalPages}
                                    </span>
                                </li>
                                <li className={`page-item ${pagination.page === pagination.totalPages ? 'disabled' : ''}`}>
                                    <button
                                        className="page-link"
                                        onClick={() => handlePageChange(pagination.page + 1)}
                                        disabled={pagination.page === pagination.totalPages}
                                    >
                                        Next
                                    </button>
                                </li>
                            </ul>
                        </nav>
                    )}

                    <p className="text-muted text-center mb-0">
                        <small>Showing {logs.length} of {pagination.total} activities</small>
                    </p>
                </>
            )}
        </div>
    );
};

export default ActivityTab;
