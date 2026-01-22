import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getPods } from '../../../api/podsApi';
import { getUserProfile } from '../../../api/usersApi';
import { usePermissions } from '../../context/PermissionsProvider';
import LoadingSpinner from '../../Shared/LoadingSpinner';

/**
 * Full completed games page with filtering and export
 */
const PodsHistory = () => {
    const [completedGames, setCompletedGames] = useState([]);
    const [filteredGames, setFilteredGames] = useState([]);
    const [userId, setUserId] = useState(null);
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState('table');
    const [expandedRow, setExpandedRow] = useState(null);
    const { permissions } = usePermissions();
    const isAdmin = permissions.some(p => p.name === 'admin_pod_update');

    // Filter states
    const [playerFilter, setPlayerFilter] = useState('');
    const [dateFilter, setDateFilter] = useState('');
    const [showMyGamesOnly, setShowMyGamesOnly] = useState(!isAdmin);

    useEffect(() => {
        const fetchGames = async () => {
            try {
                const userProfile = await getUserProfile();
                setUserId(userProfile.user.id);

                const games = await getPods({ confirmation_status: 'complete' });
                setCompletedGames(games || []);

                // Apply initial filter
                const filtered = isAdmin ? games : games.filter(game =>
                    game.participants?.some(p => p.player_id === userProfile.user.id)
                );
                setFilteredGames(filtered || []);
            } catch (err) {
                console.error('Error fetching completed games:', err);
                setError('Failed to fetch completed games.');
            } finally {
                setLoading(false);
            }
        };

        fetchGames();
    }, [isAdmin]);

    // Apply filters
    useEffect(() => {
        if (!userId) return;

        let filtered = [...completedGames];

        if (showMyGamesOnly) {
            filtered = filtered.filter(game =>
                game.participants?.some(p => p.player_id === userId)
            );
        }

        if (playerFilter.trim()) {
            filtered = filtered.filter(game =>
                game.participants?.some(p =>
                    `${p.firstname} ${p.lastname}`.toLowerCase().includes(playerFilter.toLowerCase())
                )
            );
        }

        if (dateFilter) {
            const filterDate = new Date(dateFilter).toDateString();
            filtered = filtered.filter(game =>
                new Date(game.created_at).toDateString() === filterDate
            );
        }

        setFilteredGames(filtered);
    }, [completedGames, userId, showMyGamesOnly, playerFilter, dateFilter]);

    // Export to CSV
    const exportToCSV = () => {
        if (filteredGames.length === 0) return;

        const headers = ['Pod #', 'Date', 'Winner', 'Participants'];
        const rows = filteredGames.map(game => {
            const winner = game.participants?.find(p => p.result === 'win');
            const isDraw = game.participants?.some(p => p.result === 'draw');
            const winnerName = isDraw ? 'Draw' : winner ? `${winner.firstname} ${winner.lastname}` : '-';
            const participants = game.participants?.map(p => `${p.firstname} ${p.lastname}`).join('; ');

            return [
                game.id,
                new Date(game.created_at).toLocaleDateString(),
                winnerName,
                participants
            ];
        });

        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.setAttribute('href', URL.createObjectURL(blob));
        link.setAttribute('download', `game-history-${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const clearFilters = () => {
        setPlayerFilter('');
        setDateFilter('');
        setShowMyGamesOnly(true);
    };

    if (loading) {
        return (
            <div className="container mt-4">
                <div className="text-center py-5">
                    <LoadingSpinner size="lg" />
                </div>
            </div>
        );
    }

    return (
        <div className="container mt-4">
            {/* Header */}
            <div className="d-flex justify-content-between align-items-center mb-4">
                <div>
                    <nav aria-label="breadcrumb">
                        <ol className="breadcrumb mb-1">
                            <li className="breadcrumb-item">
                                <Link to="/pods">Pods</Link>
                            </li>
                            <li className="breadcrumb-item active">History</li>
                        </ol>
                    </nav>
                    <h2 className="mb-0">Game History</h2>
                </div>
                <div className="d-flex gap-2">
                    <button
                        className="btn btn-outline-secondary"
                        onClick={exportToCSV}
                        disabled={filteredGames.length === 0}
                    >
                        <i className="fas fa-download me-1"></i>
                        Export CSV
                    </button>
                    <div className="btn-group">
                        <button
                            className={`btn ${viewMode === 'cards' ? 'btn-primary' : 'btn-outline-primary'}`}
                            onClick={() => setViewMode('cards')}
                        >
                            <i className="fas fa-th-large"></i>
                        </button>
                        <button
                            className={`btn ${viewMode === 'table' ? 'btn-primary' : 'btn-outline-primary'}`}
                            onClick={() => setViewMode('table')}
                        >
                            <i className="fas fa-table"></i>
                        </button>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="card mb-4">
                <div className="card-body">
                    <div className="row g-3 align-items-end">
                        <div className="col-md-3">
                            <label className="form-label small">Player Name</label>
                            <input
                                type="text"
                                className="form-control"
                                placeholder="Search player..."
                                value={playerFilter}
                                onChange={(e) => setPlayerFilter(e.target.value)}
                            />
                        </div>
                        <div className="col-md-3">
                            <label className="form-label small">Date</label>
                            <input
                                type="date"
                                className="form-control"
                                value={dateFilter}
                                onChange={(e) => setDateFilter(e.target.value)}
                            />
                        </div>
                        <div className="col-md-3">
                            <div className="form-check">
                                <input
                                    className="form-check-input"
                                    type="checkbox"
                                    id="myGamesOnly"
                                    checked={showMyGamesOnly}
                                    onChange={(e) => setShowMyGamesOnly(e.target.checked)}
                                />
                                <label className="form-check-label" htmlFor="myGamesOnly">
                                    My games only
                                </label>
                            </div>
                        </div>
                        <div className="col-md-3">
                            {(playerFilter || dateFilter || !showMyGamesOnly) && (
                                <button className="btn btn-sm btn-secondary" onClick={clearFilters}>
                                    <i className="fas fa-times me-1"></i>
                                    Clear Filters
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {error && <div className="alert alert-danger">{error}</div>}

            {/* Results count */}
            <div className="mb-3 text-muted">
                Showing {filteredGames.length} of {completedGames.length} games
            </div>

            {/* Content */}
            {filteredGames.length === 0 ? (
                <div className="alert alert-info text-center">
                    <i className="fas fa-info-circle me-2"></i>
                    No completed games found.
                </div>
            ) : viewMode === 'table' ? (
                <div className="table-responsive">
                    <table className="table table-hover">
                        <thead>
                            <tr>
                                <th style={{ width: '70px' }}>Pod #</th>
                                <th style={{ width: '100px' }}>Date</th>
                                <th>Winner</th>
                                <th className="text-center d-none d-sm-table-cell" style={{ width: '100px' }}>Your Result</th>
                                <th className="d-none d-md-table-cell">Participants</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredGames.map(game => {
                                const userParticipant = game.participants?.find(p => p.player_id === userId);
                                const winner = game.participants?.find(p => p.result === 'win');
                                const isDraw = game.participants?.some(p => p.result === 'draw');
                                const isExpanded = expandedRow === game.id;

                                return (
                                    <React.Fragment key={game.id}>
                                        <tr
                                            onClick={() => window.innerWidth < 768 && setExpandedRow(isExpanded ? null : game.id)}
                                            style={{ cursor: window.innerWidth < 768 ? 'pointer' : 'default' }}
                                        >
                                            <td>#{game.id}</td>
                                            <td>{new Date(game.created_at).toLocaleDateString()}</td>
                                            <td>
                                                {isDraw ? (
                                                    <span className="text-muted">Draw</span>
                                                ) : winner ? (
                                                    <span>
                                                        <i className="fas fa-trophy text-warning me-1"></i>
                                                        <span className="d-none d-sm-inline">{winner.firstname} {winner.lastname}</span>
                                                        <span className="d-sm-none">{winner.firstname}</span>
                                                    </span>
                                                ) : '-'}
                                            </td>
                                            <td className="text-center d-none d-sm-table-cell">
                                                {userParticipant ? (
                                                    <span className={`badge ${userParticipant.result === 'win' ? 'bg-success' : userParticipant.result === 'draw' ? 'bg-secondary' : 'bg-danger'}`}>
                                                        {userParticipant.result}
                                                    </span>
                                                ) : (
                                                    <span className="text-muted">-</span>
                                                )}
                                            </td>
                                            <td className="d-none d-md-table-cell">
                                                {game.participants?.map((p, idx) => (
                                                    <span key={p.player_id}>
                                                        <Link
                                                            to={`/leagues/${game.league_id}/profile/${p.player_id}`}
                                                            onClick={(e) => e.stopPropagation()}
                                                        >
                                                            {p.firstname} {p.lastname}
                                                        </Link>
                                                        {idx < game.participants.length - 1 ? ', ' : ''}
                                                    </span>
                                                ))}
                                            </td>
                                        </tr>
                                        {/* Mobile expanded details */}
                                        {isExpanded && (
                                            <tr className="d-md-none" style={{ background: 'var(--bg-secondary)' }}>
                                                <td colSpan="3" style={{ padding: '0.75rem 1rem' }}>
                                                    <div style={{ fontSize: '0.85rem' }}>
                                                        {userParticipant && (
                                                            <div className="mb-2">
                                                                <span className="text-muted">Your Result: </span>
                                                                <span className={`badge ${userParticipant.result === 'win' ? 'bg-success' : userParticipant.result === 'draw' ? 'bg-secondary' : 'bg-danger'}`}>
                                                                    {userParticipant.result}
                                                                </span>
                                                            </div>
                                                        )}
                                                        <div>
                                                            <span className="text-muted d-block mb-1">Participants:</span>
                                                            <div className="d-flex flex-wrap gap-1">
                                                                {game.participants?.map((p) => (
                                                                    <Link
                                                                        key={p.player_id}
                                                                        to={`/leagues/${game.league_id}/profile/${p.player_id}`}
                                                                        className="badge text-decoration-none"
                                                                        style={{
                                                                            background: p.result === 'win' ? 'var(--brand-gold)' : 'var(--bg-primary)',
                                                                            color: p.result === 'win' ? '#1a1a2e' : 'var(--text-primary)',
                                                                            border: '1px solid var(--border-color)'
                                                                        }}
                                                                        onClick={(e) => e.stopPropagation()}
                                                                    >
                                                                        {p.result === 'win' && <i className="fas fa-trophy me-1"></i>}
                                                                        {p.firstname} {p.lastname}
                                                                    </Link>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </React.Fragment>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div className="row g-3">
                    {filteredGames.map(game => {
                        const winner = game.participants?.find(p => p.result === 'win');
                        const isDraw = game.participants?.some(p => p.result === 'draw');
                        // Sort participants by turn order
                        const sortedParticipants = [...(game.participants || [])].sort((a, b) =>
                            (a.turn_order || 999) - (b.turn_order || 999)
                        );

                        return (
                            <div key={game.id} className="col-md-6 col-lg-4">
                                <div className="card h-100">
                                    <div className="card-body">
                                        <div className="d-flex justify-content-between align-items-start mb-2">
                                            <h6 className="card-title mb-0">Pod #{game.id}</h6>
                                            <span className="badge bg-secondary">
                                                {new Date(game.created_at).toLocaleDateString()}
                                            </span>
                                        </div>
                                        <div className="mb-3">
                                            {isDraw ? (
                                                <span className="text-muted">Draw</span>
                                            ) : winner && (
                                                <span className="text-success">
                                                    <i className="fas fa-trophy text-warning me-1"></i>
                                                    Winner: {winner.firstname} {winner.lastname}
                                                </span>
                                            )}
                                        </div>
                                        <ul className="list-unstyled mb-0 small">
                                            {sortedParticipants.map((p, idx) => (
                                                <li key={p.player_id} className="mb-1 d-flex align-items-center">
                                                    <span
                                                        className="badge me-2"
                                                        style={{
                                                            background: 'var(--bg-secondary)',
                                                            color: 'var(--text-secondary)',
                                                            minWidth: '20px'
                                                        }}
                                                    >
                                                        {idx + 1}
                                                    </span>
                                                    <Link to={`/leagues/${game.league_id}/profile/${p.player_id}`}>
                                                        {p.firstname} {p.lastname}
                                                    </Link>
                                                    {p.result === 'win' && (
                                                        <i className="fas fa-trophy text-warning ms-1"></i>
                                                    )}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default PodsHistory;
