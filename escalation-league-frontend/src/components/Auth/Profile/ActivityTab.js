import React, { useEffect, useState, useCallback } from 'react';
import { getMyActivityLogs } from '../../../api/activityLogsApi';
import LoadingSpinner from '../../Shared/LoadingSpinner';

const ActivityTab = () => {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [pagination, setPagination] = useState({
        page: 1,
        limit: 15,
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
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        // Relative time for recent activity
        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;

        // Full date for older activity
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
        });
    };

    const getActionConfig = (action) => {
        const actionLower = action.toLowerCase();
        if (actionLower.includes('login') || actionLower.includes('logged in')) {
            return { icon: 'fa-sign-in-alt', color: '#28a745', bg: 'rgba(40, 167, 69, 0.15)' };
        }
        if (actionLower.includes('logout') || actionLower.includes('logged out')) {
            return { icon: 'fa-sign-out-alt', color: '#6c757d', bg: 'rgba(108, 117, 125, 0.15)' };
        }
        if (actionLower.includes('profile') || actionLower.includes('update')) {
            return { icon: 'fa-user-edit', color: 'var(--brand-purple)', bg: 'rgba(45, 27, 78, 0.15)' };
        }
        if (actionLower.includes('password')) {
            return { icon: 'fa-key', color: '#fd7e14', bg: 'rgba(253, 126, 20, 0.15)' };
        }
        if (actionLower.includes('league') || actionLower.includes('signup') || actionLower.includes('join')) {
            return { icon: 'fa-trophy', color: 'var(--brand-gold)', bg: 'rgba(212, 175, 55, 0.15)' };
        }
        if (actionLower.includes('game') || actionLower.includes('pod') || actionLower.includes('created')) {
            return { icon: 'fa-gamepad', color: 'var(--brand-purple)', bg: 'rgba(45, 27, 78, 0.15)' };
        }
        if (actionLower.includes('confirm') || actionLower.includes('approved')) {
            return { icon: 'fa-check-circle', color: '#28a745', bg: 'rgba(40, 167, 69, 0.15)' };
        }
        if (actionLower.includes('win') || actionLower.includes('won')) {
            return { icon: 'fa-trophy', color: 'var(--brand-gold)', bg: 'rgba(212, 175, 55, 0.15)' };
        }
        if (actionLower.includes('loss') || actionLower.includes('lost')) {
            return { icon: 'fa-times-circle', color: '#dc3545', bg: 'rgba(220, 53, 69, 0.15)' };
        }
        return { icon: 'fa-history', color: 'var(--text-secondary)', bg: 'var(--bg-secondary)' };
    };

    const handlePageChange = (newPage) => {
        if (newPage >= 1 && newPage <= pagination.totalPages) {
            fetchLogs(newPage);
        }
    };

    if (loading && logs.length === 0) {
        return (
            <div className="profile-card">
                <div className="profile-card-body text-center py-5">
                    <LoadingSpinner size="md" />
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="profile-card">
                <div className="profile-card-body">
                    <div className="alert alert-danger mb-0">
                        <i className="fas fa-exclamation-circle me-2"></i>
                        {error}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="row g-4">
            <div className="col-12">
                <div className="profile-card">
                    <div className="profile-card-header">
                        <h5>
                            <i className="fas fa-history"></i>
                            Activity Log
                        </h5>
                        {pagination.total > 0 && (
                            <span className="badge ms-auto activity-badge-total">
                                {pagination.total} total
                            </span>
                        )}
                    </div>
                    <div className="profile-card-body p-0">
                        {logs.length === 0 ? (
                            <div className="text-center py-5">
                                <i className="fas fa-clipboard-list fa-4x mb-3 activity-empty-icon"></i>
                                <h5 className="mb-2">No Activity Yet</h5>
                                <p className="text-muted mb-0">
                                    Your activity will appear here as you use the app.
                                </p>
                            </div>
                        ) : (
                            <>
                                <div className="activity-list">
                                    {logs.map((log, index) => {
                                        const config = getActionConfig(log.action);
                                        const isLast = index === logs.length - 1;

                                        return (
                                            <div
                                                key={log.id}
                                                className="activity-item d-flex gap-3 p-3"
                                                style={{
                                                    borderBottom: isLast ? 'none' : '1px solid var(--border-color)'
                                                }}
                                            >
                                                <div
                                                    className="activity-icon d-flex align-items-center justify-content-center flex-shrink-0"
                                                    style={{
                                                        width: '40px',
                                                        height: '40px',
                                                        borderRadius: '10px',
                                                        background: config.bg,
                                                        color: config.color
                                                    }}
                                                >
                                                    <i className={`fas ${config.icon}`}></i>
                                                </div>
                                                <div className="activity-content flex-grow-1 min-width-0">
                                                    <div className="d-flex justify-content-between align-items-start gap-2">
                                                        <div
                                                            className="activity-title"
                                                            style={{
                                                                fontWeight: 500,
                                                                color: 'var(--text-primary)'
                                                            }}
                                                        >
                                                            {log.action}
                                                        </div>
                                                        <span
                                                            className="activity-time flex-shrink-0"
                                                            style={{
                                                                fontSize: '0.8rem',
                                                                color: 'var(--text-secondary)'
                                                            }}
                                                        >
                                                            {formatDate(log.timestamp)}
                                                        </span>
                                                    </div>
                                                    {log.metadata && Object.keys(log.metadata).length > 0 && (
                                                        <div
                                                            className="activity-meta mt-1 d-flex flex-wrap gap-2"
                                                            style={{ fontSize: '0.8rem' }}
                                                        >
                                                            {Object.entries(log.metadata).map(([key, value]) => (
                                                                <span
                                                                    key={key}
                                                                    className="badge"
                                                                    style={{
                                                                        background: 'var(--bg-secondary)',
                                                                        color: 'var(--text-secondary)',
                                                                        fontWeight: 400
                                                                    }}
                                                                >
                                                                    {key}: {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* Pagination */}
                                {pagination.totalPages > 1 && (
                                    <div
                                        className="d-flex justify-content-between align-items-center p-3"
                                        style={{ borderTop: '1px solid var(--border-color)' }}
                                    >
                                        <button
                                            className="btn btn-sm"
                                            onClick={() => handlePageChange(pagination.page - 1)}
                                            disabled={pagination.page === 1 || loading}
                                            style={{
                                                background: 'var(--bg-secondary)',
                                                border: '1px solid var(--border-color)',
                                                color: 'var(--text-primary)'
                                            }}
                                        >
                                            <i className="fas fa-chevron-left me-1"></i>
                                            Previous
                                        </button>

                                        <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                            Page {pagination.page} of {pagination.totalPages}
                                        </span>

                                        <button
                                            className="btn btn-sm"
                                            onClick={() => handlePageChange(pagination.page + 1)}
                                            disabled={pagination.page === pagination.totalPages || loading}
                                            style={{
                                                background: 'var(--bg-secondary)',
                                                border: '1px solid var(--border-color)',
                                                color: 'var(--text-primary)'
                                            }}
                                        >
                                            Next
                                            <i className="fas fa-chevron-right ms-1"></i>
                                        </button>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ActivityTab;
