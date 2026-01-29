import React, { useEffect, useState } from 'react';
import { getGlobalLeaderboard } from '../../api/usersApi';
import { usePermissions } from '../../context/PermissionsProvider';
import { SkeletonLeaderboard } from '../Shared/Skeleton';
import './GlobalLeaderboard.css';

const GlobalLeaderboard = () => {
    const { user } = usePermissions();
    const [leaderboard, setLeaderboard] = useState([]);
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(true);
    const [sortConfig, setSortConfig] = useState({ key: 'elo_rating', direction: 'desc' });
    const [expandedRow, setExpandedRow] = useState(null);

    const toggleRow = (playerId) => {
        setExpandedRow(expandedRow === playerId ? null : playerId);
    };

    useEffect(() => {
        const fetchLeaderboard = async () => {
            try {
                const { leaderboard: data } = await getGlobalLeaderboard();
                setLeaderboard(data);
            } catch (err) {
                console.error('Error fetching global leaderboard:', err);
                setError('Failed to fetch leaderboard.');
            } finally {
                setLoading(false);
            }
        };

        fetchLeaderboard();
    }, []);

    const sortLeaderboard = (key) => {
        let direction = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });

        const sortedLeaderboard = [...leaderboard].sort((a, b) => {
            const aValue = key === 'win_rate' ? parseFloat(a[key]) || 0 : a[key] || 0;
            const bValue = key === 'win_rate' ? parseFloat(b[key]) || 0 : b[key] || 0;

            if (direction === 'asc') {
                return aValue - bValue;
            } else {
                return bValue - aValue;
            }
        });

        // Recalculate ranks after sorting
        sortedLeaderboard.forEach((player, index) => {
            player.rank = index + 1;
        });

        setLeaderboard(sortedLeaderboard);
    };

    const formatRecord = (player) => {
        const parts = [`${player.wins || 0}W`, `${player.losses || 0}L`];
        if (player.draws > 0) {
            parts.push(`${player.draws}D`);
        }
        return parts;
    };

    const renderSortIcon = (key) => {
        if (sortConfig.key !== key) {
            return <i className="fas fa-sort ms-1 sort-icon-inactive"></i>;
        }
        return <i className={`fas fa-sort-${sortConfig.direction === 'asc' ? 'up' : 'down'} ms-1`}></i>;
    };

    if (loading) {
        return (
            <div className="container mt-4">
                <div className="card">
                    <div className="card-header d-flex align-items-center">
                        <i className="fas fa-globe me-2"></i>
                        <h5 className="mb-0">Global Leaderboard</h5>
                    </div>
                    <div className="card-body">
                        <SkeletonLeaderboard rows={10} />
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="container mt-4">
                <div className="alert alert-danger text-center">{error}</div>
            </div>
        );
    }

    if (!leaderboard.length) {
        return (
            <div className="container mt-4">
                <div className="card">
                    <div className="card-header d-flex align-items-center">
                        <i className="fas fa-globe me-2"></i>
                        <h5 className="mb-0">Global Leaderboard</h5>
                    </div>
                    <div className="card-body">
                        <div className="alert alert-warning mb-0">
                            No players have completed games yet.
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="container mt-4">
            <div className="card">
                <div className="card-header d-flex justify-content-between align-items-center">
                    <div className="d-flex align-items-center">
                        <i className="fas fa-globe me-2"></i>
                        <h5 className="mb-0">Global Leaderboard</h5>
                        <span className="badge bg-secondary ms-2">{leaderboard.length}</span>
                    </div>
                    <small className="text-muted d-none d-sm-block">
                        Ranked by lifetime ELO
                    </small>
                </div>
                <div className="card-body p-0">
                    <table className="table table-hover mb-0">
                        <thead>
                            <tr>
                                <th className="leaderboard-col-rank">Rank</th>
                                <th>Player</th>
                                <th
                                    className="text-center cursor-pointer leaderboard-col-elo"
                                    onClick={() => sortLeaderboard('elo_rating')}
                                >
                                    ELO {renderSortIcon('elo_rating')}
                                </th>
                                <th
                                    className="text-center d-none d-sm-table-cell cursor-pointer leaderboard-col-record"
                                    onClick={() => sortLeaderboard('wins')}
                                >
                                    Record {renderSortIcon('wins')}
                                </th>
                                <th
                                    className="text-center d-none d-md-table-cell cursor-pointer leaderboard-col-games"
                                    onClick={() => sortLeaderboard('total_games')}
                                >
                                    Games {renderSortIcon('total_games')}
                                </th>
                                <th
                                    className="text-center d-none d-lg-table-cell cursor-pointer leaderboard-col-winrate"
                                    onClick={() => sortLeaderboard('win_rate')}
                                >
                                    Win % {renderSortIcon('win_rate')}
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {leaderboard.map((player) => {
                                const isCurrentUser = user?.id === player.player_id;
                                const isExpanded = expandedRow === player.player_id;
                                const recordParts = formatRecord(player);

                                return (
                                    <React.Fragment key={player.player_id}>
                                        <tr
                                            className={`${isCurrentUser ? 'table-primary' : ''} ${window.innerWidth < 576 ? 'cursor-pointer' : ''}`}
                                            onClick={() => window.innerWidth < 576 && toggleRow(player.player_id)}
                                        >
                                            <td>
                                                {player.rank <= 3 ? (
                                                    <span className={`badge ${
                                                        player.rank === 1 ? 'bg-warning text-dark' :
                                                        player.rank === 2 ? 'bg-secondary' :
                                                        'bg-danger'
                                                    }`}>
                                                        {player.rank === 1 && <i className="fas fa-crown me-1"></i>}
                                                        #{player.rank}
                                                    </span>
                                                ) : (
                                                    <span className="text-muted">#{player.rank}</span>
                                                )}
                                            </td>
                                            <td>
                                                {player.firstname} {player.lastname}
                                                {isCurrentUser && <small className="text-muted ms-2">(you)</small>}
                                            </td>
                                            <td className="text-center">
                                                <span className="elo-badge text-sm">
                                                    {player.elo_rating || 1500}
                                                </span>
                                            </td>
                                            <td className="text-center d-none d-sm-table-cell">
                                                <span className="text-success">{recordParts[0]}</span>
                                                <span className="text-muted mx-1">-</span>
                                                <span className="text-danger">{recordParts[1]}</span>
                                                {recordParts[2] && (
                                                    <>
                                                        <span className="text-muted mx-1">-</span>
                                                        <span className="text-muted">{recordParts[2]}</span>
                                                    </>
                                                )}
                                            </td>
                                            <td className="text-center d-none d-md-table-cell">
                                                {player.total_games || 0}
                                            </td>
                                            <td className="text-center d-none d-lg-table-cell">
                                                {player.win_rate ? `${player.win_rate}%` : '-'}
                                            </td>
                                        </tr>
                                        {/* Mobile expanded details */}
                                        {isExpanded && (
                                            <tr className="d-sm-none leaderboard-expanded-row">
                                                <td colSpan="3" className="leaderboard-expanded-cell">
                                                    <div className="d-flex flex-wrap gap-3 text-sm">
                                                        <div>
                                                            <span className="text-muted">Record: </span>
                                                            <span className="text-success">{recordParts[0]}</span>
                                                            <span className="text-muted"> - </span>
                                                            <span className="text-danger">{recordParts[1]}</span>
                                                            {recordParts[2] && (
                                                                <>
                                                                    <span className="text-muted"> - </span>
                                                                    <span className="text-muted">{recordParts[2]}</span>
                                                                </>
                                                            )}
                                                        </div>
                                                        <div>
                                                            <span className="text-muted">Games: </span>
                                                            <span>{player.total_games || 0}</span>
                                                        </div>
                                                        <div>
                                                            <span className="text-muted">Win %: </span>
                                                            <span>{player.win_rate ? `${player.win_rate}%` : '-'}</span>
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
            </div>
        </div>
    );
};

export default GlobalLeaderboard;
