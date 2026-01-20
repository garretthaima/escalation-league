import React, { useEffect, useState } from 'react';
import { getPods } from '../../api/podsApi';
import { useNavigate } from 'react-router-dom';
import { Pagination, usePagination } from '../Shared';
import { SkeletonTable } from '../Shared/Skeleton';
import './PodAdminPage.css';

const PodAdminPage = () => {
    const navigate = useNavigate();
    const [allPods, setAllPods] = useState([]);
    const [filteredPods, setFilteredPods] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Pagination
    const {
        page,
        pageSize,
        totalPages,
        setTotalItems,
        handlePageChange,
        handlePageSizeChange,
        paginationProps,
        reset: resetPagination
    } = usePagination();

    // Filter states
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [leagueFilter, setLeagueFilter] = useState('all');
    const [showDeleted, setShowDeleted] = useState(false);

    // Statistics
    const [stats, setStats] = useState({
        open: 0,
        active: 0,
        pending: 0,
        complete: 0,
        total: 0
    });

    // Fetch all pods
    const fetchPods = async () => {
        setLoading(true);
        setError('');
        try {
            const filter = showDeleted ? { includeDeleted: 'true' } : {};
            const pods = await getPods(filter);
            setAllPods(pods);
            setFilteredPods(pods);

            // Calculate statistics
            const newStats = {
                open: pods.filter(p => p.confirmation_status === 'open' && !p.deleted_at).length,
                active: pods.filter(p => p.confirmation_status === 'active' && !p.deleted_at).length,
                pending: pods.filter(p => p.confirmation_status === 'pending' && !p.deleted_at).length,
                complete: pods.filter(p => p.confirmation_status === 'complete' && !p.deleted_at).length,
                deleted: pods.filter(p => p.deleted_at).length,
                total: pods.length
            };
            setStats(newStats);
        } catch (err) {
            console.error('Error fetching pods:', err.message);
            setError('Failed to fetch pods.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPods();
    }, [showDeleted]);

    // Apply filters
    useEffect(() => {
        let filtered = [...allPods];

        // Status filter
        if (statusFilter !== 'all') {
            filtered = filtered.filter(pod => pod.confirmation_status === statusFilter);
        }

        // League filter
        if (leagueFilter !== 'all') {
            filtered = filtered.filter(pod => pod.league_id === parseInt(leagueFilter));
        }

        // Search filter (search by pod ID, player names, league name)
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            filtered = filtered.filter(pod => {
                const podId = pod.id.toString();
                const leagueName = (pod.league_name || '').toLowerCase();
                const playerNames = pod.participants
                    .map(p => `${p.firstname} ${p.lastname}`.toLowerCase())
                    .join(' ');

                return podId.includes(term) ||
                    leagueName.includes(term) ||
                    playerNames.includes(term);
            });
        }

        setFilteredPods(filtered);
        setTotalItems(filtered.length);
        resetPagination(); // Reset to page 1 when filters change
    }, [statusFilter, leagueFilter, searchTerm, allPods, setTotalItems, resetPagination]);

    const handleEditPod = (pod) => {
        navigate(`/admin/pods/${pod.id}`);
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

    // Get unique leagues for filter
    const leagueMap = new Map();
    allPods.forEach(pod => {
        if (!leagueMap.has(pod.league_id)) {
            leagueMap.set(pod.league_id, { id: pod.league_id, name: pod.league_name });
        }
    });
    const uniqueLeagues = Array.from(leagueMap.values());

    // Get paginated pods
    const paginatedPods = filteredPods.slice(
        (page - 1) * pageSize,
        page * pageSize
    );

    return (
        <div className="container mt-4">
            <h2 className="mb-4">
                <i className="fas fa-users-cog me-2"></i>
                Pods Administration
            </h2>

            {/* Statistics Dashboard */}
            <div className="row mb-4 stats-row">
                <div className="col-md-2">
                    <div className="card text-center">
                        <div className="card-body">
                            <h5 className="card-title text-muted">Total</h5>
                            <h2 className="mb-0">{stats.total}</h2>
                        </div>
                    </div>
                </div>
                <div className="col-md-2">
                    <div className="card text-center border-info">
                        <div className="card-body">
                            <h5 className="card-title text-info">Open</h5>
                            <h2 className="mb-0">{stats.open}</h2>
                        </div>
                    </div>
                </div>
                <div className="col-md-2">
                    <div className="card text-center border-warning">
                        <div className="card-body">
                            <h5 className="card-title text-warning">Active</h5>
                            <h2 className="mb-0">{stats.active}</h2>
                        </div>
                    </div>
                </div>
                <div className="col-md-2">
                    <div className="card text-center border-warning">
                        <div className="card-body">
                            <h5 className="card-title text-warning">Pending</h5>
                            <h2 className="mb-0">{stats.pending}</h2>
                        </div>
                    </div>
                </div>
                <div className="col-md-2">
                    <div className="card text-center border-success">
                        <div className="card-body">
                            <h5 className="card-title text-success">Complete</h5>
                            <h2 className="mb-0">{stats.complete}</h2>
                        </div>
                    </div>
                </div>
                <div className="col-md-2">
                    <div className="card text-center border-danger">
                        <div className="card-body">
                            <h5 className="card-title text-danger">Deleted</h5>
                            <h2 className="mb-0">{stats.deleted || 0}</h2>
                        </div>
                    </div>
                </div>
            </div>

            {/* Show Deleted Toggle */}
            <div className="form-check mb-3">
                <input
                    className="form-check-input"
                    type="checkbox"
                    id="showDeleted"
                    checked={showDeleted}
                    onChange={(e) => setShowDeleted(e.target.checked)}
                />
                <label className="form-check-label" htmlFor="showDeleted">
                    <i className="fas fa-trash me-2"></i>
                    Show deleted pods
                </label>
            </div>

            {/* Filters */}
            <div className="row mb-3">
                <div className="col-md-4">
                    <input
                        type="text"
                        className="form-control"
                        placeholder="Search by pod ID, league, or player name..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="col-md-3">
                    <select
                        className="form-select"
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                    >
                        <option value="all">All Statuses</option>
                        <option value="open">Open</option>
                        <option value="active">Active</option>
                        <option value="pending">Pending</option>
                        <option value="complete">Complete</option>
                    </select>
                </div>
                <div className="col-md-3">
                    <select
                        className="form-select"
                        value={leagueFilter}
                        onChange={(e) => setLeagueFilter(e.target.value)}
                    >
                        <option value="all">All Leagues</option>
                        {uniqueLeagues.map((league) => (
                            <option key={league.id} value={league.id}>
                                {league.name || `League #${league.id}`}
                            </option>
                        ))}
                    </select>
                </div>
                <div className="col-md-2">
                    <button
                        className="btn btn-secondary w-100"
                        onClick={() => {
                            setSearchTerm('');
                            setStatusFilter('all');
                            setLeagueFilter('all');
                        }}
                    >
                        Clear Filters
                    </button>
                </div>
            </div>

            {error && <p className="text-danger">{error}</p>}

            {/* Desktop Table View */}
            {loading ? (
                <div className="pod-table-desktop">
                    <SkeletonTable rows={10} cols={8} />
                </div>
            ) : (
            <div className="table-responsive pod-table-desktop">
                <table className="table table-hover">
                    <thead>
                        <tr>
                            <th>Pod #</th>
                            <th>League</th>
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
                                <td colSpan="8" className="text-center text-muted">
                                    No pods found
                                </td>
                            </tr>
                        ) : (
                            paginatedPods.map((pod) => (
                                <tr key={pod.id} className={pod.deleted_at ? 'table-danger' : ''}>
                                    <td>#{pod.id}</td>
                                    <td>{pod.league_name || `League #${pod.league_id}`}</td>
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
                                                <span>
                                                    {getWinnerName(pod)}
                                                </span>
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
                <div className="pod-card-mobile">
                    <SkeletonTable rows={5} cols={1} />
                </div>
            ) : (
            <div className="pod-card-mobile">
                {paginatedPods.length === 0 ? (
                    <div className="text-center text-muted py-4">
                        No pods found
                    </div>
                ) : (
                    paginatedPods.map((pod) => (
                        <div
                            key={pod.id}
                            className={`pod-card ${pod.deleted_at ? 'deleted' : ''}`}
                            onClick={() => handleEditPod(pod)}
                        >
                            <div className="d-flex justify-content-between align-items-start mb-2">
                                <div>
                                    <h6 className="mb-1">Pod #{pod.id}</h6>
                                    <small className="text-muted">{pod.league_name || `League #${pod.league_id}`}</small>
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

                            <div className="row small mb-2">
                                <div className="col-6">
                                    <i className="fas fa-calendar me-1"></i>
                                    {new Date(pod.created_at).toLocaleDateString()}
                                </div>
                                <div className="col-6">
                                    <i className="fas fa-users me-1"></i>
                                    {pod.participants.length} players
                                </div>
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

export default PodAdminPage;