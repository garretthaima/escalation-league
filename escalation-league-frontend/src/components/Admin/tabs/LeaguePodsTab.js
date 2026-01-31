import React, { useEffect, useState, useCallback } from 'react';
import { getPods } from '../../../api/podsApi';
import { useNavigate } from 'react-router-dom';
import { Pagination, usePagination } from '../../Shared';
import { SkeletonTable } from '../../Shared/Skeleton';
import './LeaguePodsTab.css';

const LeaguePodsTab = ({ leagueId }) => {
    const navigate = useNavigate();
    const [allPods, setAllPods] = useState([]);
    const [filteredPods, setFilteredPods] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Pagination
    const {
        page,
        pageSize,
        setTotalItems,
        paginationProps,
        reset: resetPagination
    } = usePagination();

    // Filter states
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [showDeleted, setShowDeleted] = useState(false);

    // Statistics
    const [stats, setStats] = useState({
        open: 0,
        active: 0,
        pending: 0,
        complete: 0,
        total: 0
    });

    // Fetch pods for this league
    const fetchPods = useCallback(async () => {
        if (!leagueId) return;

        setLoading(true);
        setError('');
        try {
            const filter = showDeleted ? { includeDeleted: 'true' } : {};
            const allPodsData = await getPods(filter);

            // Filter pods by leagueId
            const leaguePods = allPodsData.filter(pod => pod.league_id === leagueId);

            setAllPods(leaguePods);
            setFilteredPods(leaguePods);

            // Calculate statistics
            const newStats = {
                open: leaguePods.filter(p => p.confirmation_status === 'open' && !p.deleted_at).length,
                active: leaguePods.filter(p => p.confirmation_status === 'active' && !p.deleted_at).length,
                pending: leaguePods.filter(p => p.confirmation_status === 'pending' && !p.deleted_at).length,
                complete: leaguePods.filter(p => p.confirmation_status === 'complete' && !p.deleted_at).length,
                deleted: leaguePods.filter(p => p.deleted_at).length,
                total: leaguePods.length
            };
            setStats(newStats);
        } catch (err) {
            console.error('Error fetching pods:', err.message);
            setError('Failed to fetch pods.');
        } finally {
            setLoading(false);
        }
    }, [leagueId, showDeleted]);

    useEffect(() => {
        fetchPods();
    }, [fetchPods]);

    // Apply filters
    useEffect(() => {
        let filtered = [...allPods];

        // Status filter
        if (statusFilter !== 'all') {
            filtered = filtered.filter(pod => pod.confirmation_status === statusFilter);
        }

        // Search filter (search by pod ID, player names)
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            filtered = filtered.filter(pod => {
                const podId = pod.id.toString();
                const playerNames = pod.participants
                    .map(p => `${p.firstname} ${p.lastname}`.toLowerCase())
                    .join(' ');

                return podId.includes(term) || playerNames.includes(term);
            });
        }

        setFilteredPods(filtered);
        setTotalItems(filtered.length);
        resetPagination();
    }, [statusFilter, searchTerm, allPods, setTotalItems, resetPagination]);

    const handleEditPod = (pod) => {
        navigate(`/admin/pods/${pod.id}`, { state: { fromLeagueId: leagueId } });
    };

    const getStatusBadgeClass = (status) => {
        switch (status) {
            case 'open': return 'bg-info';
            case 'active': return 'bg-warning text-dark';
            case 'pending': return 'bg-warning text-dark';
            case 'complete': return 'bg-success';
            default: return 'bg-secondary';
        }
    };

    const getWinnerName = (pod) => {
        const winner = pod.participants.find(p => p.result === 'win');
        return winner ? `${winner.firstname} ${winner.lastname}` : '-';
    };

    // Get paginated pods
    const paginatedPods = filteredPods.slice(
        (page - 1) * pageSize,
        page * pageSize
    );

    return (
        <div className="league-pods-tab">
            {/* Statistics Dashboard */}
            <div className="league-pods-stats-row">
                <div className="league-pods-stat-card">
                    <div className="league-pods-stat-value">{stats.total}</div>
                    <div className="league-pods-stat-label">Total</div>
                </div>
                <div className="league-pods-stat-card league-pods-stat-info">
                    <div className="league-pods-stat-value">{stats.open}</div>
                    <div className="league-pods-stat-label">Open</div>
                </div>
                <div className="league-pods-stat-card league-pods-stat-warning">
                    <div className="league-pods-stat-value">{stats.active}</div>
                    <div className="league-pods-stat-label">Active</div>
                </div>
                <div className="league-pods-stat-card league-pods-stat-warning">
                    <div className="league-pods-stat-value">{stats.pending}</div>
                    <div className="league-pods-stat-label">Pending</div>
                </div>
                <div className="league-pods-stat-card league-pods-stat-success">
                    <div className="league-pods-stat-value">{stats.complete}</div>
                    <div className="league-pods-stat-label">Complete</div>
                </div>
                <div className="league-pods-stat-card league-pods-stat-danger">
                    <div className="league-pods-stat-value">{stats.deleted || 0}</div>
                    <div className="league-pods-stat-label">Deleted</div>
                </div>
            </div>

            {/* Show Deleted Toggle */}
            <div className="form-check mb-3">
                <input
                    className="form-check-input"
                    type="checkbox"
                    id="showDeletedPods"
                    checked={showDeleted}
                    onChange={(e) => setShowDeleted(e.target.checked)}
                />
                <label className="form-check-label" htmlFor="showDeletedPods">
                    <i className="fas fa-trash me-2"></i>
                    Show deleted pods
                </label>
            </div>

            {/* Filters */}
            <div className="league-pods-filters mb-3">
                <div className="league-pods-search">
                    <input
                        type="text"
                        className="form-control"
                        placeholder="Search by pod ID or player name..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <select
                    className="form-select league-pods-filter-select"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                >
                    <option value="all">All Statuses</option>
                    <option value="open">Open</option>
                    <option value="active">Active</option>
                    <option value="pending">Pending</option>
                    <option value="complete">Complete</option>
                </select>
                <button
                    className="btn btn-outline-secondary"
                    onClick={() => {
                        setSearchTerm('');
                        setStatusFilter('all');
                    }}
                >
                    Clear
                </button>
            </div>

            {error && <p className="text-danger">{error}</p>}

            {/* Desktop Table View */}
            {loading ? (
                <div className="league-pods-table-desktop">
                    <SkeletonTable rows={10} cols={7} />
                </div>
            ) : (
                <div className="table-responsive league-pods-table-desktop">
                    <table className="table table-hover">
                        <thead>
                            <tr>
                                <th>Pod #</th>
                                <th>Status</th>
                                <th>Date</th>
                                <th>Players</th>
                                <th>Winner</th>
                                <th>Win Condition</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {paginatedPods.length === 0 ? (
                                <tr>
                                    <td colSpan="7" className="text-center text-muted">
                                        No pods found for this league
                                    </td>
                                </tr>
                            ) : (
                                paginatedPods.map((pod) => (
                                    <tr key={pod.id} className={pod.deleted_at ? 'table-danger' : ''}>
                                        <td>#{pod.id}</td>
                                        <td>
                                            <span className={`badge ${getStatusBadgeClass(pod.confirmation_status)}`}>
                                                {pod.confirmation_status.charAt(0).toUpperCase() + pod.confirmation_status.slice(1)}
                                            </span>
                                            {pod.deleted_at && (
                                                <span className="badge bg-danger ms-2">
                                                    <i className="fas fa-trash me-1"></i>
                                                    Deleted
                                                </span>
                                            )}
                                        </td>
                                        <td>{new Date(pod.created_at).toLocaleDateString()}</td>
                                        <td>
                                            <span className="badge bg-secondary">
                                                {pod.participants.length} players
                                            </span>
                                        </td>
                                        <td>
                                            {pod.confirmation_status === 'complete' ? (
                                                pod.result === 'draw' ? (
                                                    <span className="text-muted">
                                                        <i className="fas fa-handshake me-1"></i>
                                                        Draw
                                                    </span>
                                                ) : (
                                                    <span>{getWinnerName(pod)}</span>
                                                )
                                            ) : (
                                                <span className="text-muted">-</span>
                                            )}
                                        </td>
                                        <td>{pod.win_condition?.name || '-'}</td>
                                        <td>
                                            <button
                                                className="btn btn-primary btn-sm"
                                                onClick={() => handleEditPod(pod)}
                                            >
                                                <i className="fas fa-edit me-1"></i>
                                                Edit
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Mobile Card View */}
            {loading ? (
                <div className="league-pods-card-mobile">
                    <SkeletonTable rows={5} cols={1} />
                </div>
            ) : (
                <div className="league-pods-card-mobile">
                    {paginatedPods.length === 0 ? (
                        <div className="text-center text-muted py-4">
                            No pods found for this league
                        </div>
                    ) : (
                        paginatedPods.map((pod) => (
                            <div
                                key={pod.id}
                                className={`league-pods-card ${pod.deleted_at ? 'deleted' : ''}`}
                                onClick={() => handleEditPod(pod)}
                            >
                                <div className="d-flex justify-content-between align-items-start mb-2">
                                    <div>
                                        <h6 className="mb-1">Pod #{pod.id}</h6>
                                        <small className="text-muted">
                                            {new Date(pod.created_at).toLocaleDateString()}
                                        </small>
                                    </div>
                                    <span className={`badge ${getStatusBadgeClass(pod.confirmation_status)}`}>
                                        {pod.confirmation_status.charAt(0).toUpperCase() + pod.confirmation_status.slice(1)}
                                    </span>
                                </div>

                                {pod.deleted_at && (
                                    <div className="mb-2">
                                        <span className="badge bg-danger">
                                            <i className="fas fa-trash me-1"></i>
                                            Deleted
                                        </span>
                                    </div>
                                )}

                                <div className="small mb-2">
                                    <i className="fas fa-users me-1"></i>
                                    {pod.participants.length} players
                                </div>

                                {pod.confirmation_status === 'complete' && (
                                    <div className="small mb-2">
                                        {pod.result === 'draw' ? (
                                            <span className="text-muted">
                                                <i className="fas fa-handshake me-1"></i>
                                                Draw
                                            </span>
                                        ) : (
                                            <span>
                                                <i className="fas fa-trophy text-warning me-1"></i>
                                                {getWinnerName(pod)}
                                            </span>
                                        )}
                                    </div>
                                )}

                                <div className="d-flex justify-content-between align-items-center">
                                    <small className="text-muted">
                                        {pod.win_condition?.name || 'No win condition'}
                                    </small>
                                    <i className="fas fa-chevron-right text-muted"></i>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}

            {/* Pagination */}
            {!loading && filteredPods.length > 0 && (
                <Pagination {...paginationProps} className="mt-4" />
            )}
        </div>
    );
};

export default LeaguePodsTab;
