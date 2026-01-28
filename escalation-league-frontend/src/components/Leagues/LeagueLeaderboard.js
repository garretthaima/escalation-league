import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getLeagueStats } from '../../api/leaguesApi';
import { usePermissions } from '../../context/PermissionsProvider';
import { SkeletonLeaderboard, SkeletonText } from '../Shared/Skeleton';
import './LeagueLeaderboard.css';

const LeagueLeaderboard = () => {
    const { loading: loadingPermissions, activeLeague } = usePermissions();
    const [leaderboard, setLeaderboard] = useState([]);
    const [stats, setStats] = useState(null);
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(true);
    const [sortConfig, setSortConfig] = useState({ key: 'total_points', direction: 'desc' });
    const [expandedRows, setExpandedRows] = useState(new Set());

    // Derive leagueId from context (API returns 'id' from leagues.*, fallback to league_id for compatibility)
    const leagueId = activeLeague?.id || activeLeague?.league_id;

    const toggleRow = (playerId) => {
        const newExpanded = new Set(expandedRows);
        if (newExpanded.has(playerId)) {
            newExpanded.delete(playerId);
        } else {
            newExpanded.add(playerId);
        }
        setExpandedRows(newExpanded);
    };

    useEffect(() => {
        if (loadingPermissions) return;

        if (!activeLeague) {
            setError('You are not part of any league.');
            setLoading(false);
            return;
        }

        setLoading(false);
    }, [loadingPermissions, activeLeague]);

    useEffect(() => {
        if (leagueId) {
            const fetchLeagueStats = async () => {
                try {
                    const { leaderboard, stats } = await getLeagueStats(leagueId);
                    setLeaderboard(leaderboard);
                    setStats(stats);
                } catch (err) {
                    console.error('Error fetching league stats:', err);
                    setError('Failed to fetch league stats.');
                }
            };

            fetchLeagueStats();
        }
    }, [leagueId]);

    const sortLeaderboard = (key) => {
        let direction = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });

        const sortedLeaderboard = [...leaderboard].sort((a, b) => {
            const aValue = key === 'win_rate' ? parseFloat(a[key]) || 0 : a[key] || 0; // Convert win_rate to number, default to 0
            const bValue = key === 'win_rate' ? parseFloat(b[key]) || 0 : b[key] || 0; // Convert win_rate to number, default to 0

            if (direction === 'asc') {
                return aValue - bValue;
            } else {
                return bValue - aValue;
            }
        });

        setLeaderboard(sortedLeaderboard);
    };

    if (loadingPermissions || loading) {
        return (
            <div className="container mt-5">
                <h1 className="text-center mb-4">League Leaderboard</h1>
                <div className="text-center mb-3">
                    <SkeletonText width="50" className="mx-auto" />
                </div>
                <SkeletonLeaderboard rows={10} />
            </div>
        );
    }

    if (error) {
        return <div className="alert alert-danger text-center">{error}</div>; // Bootstrap alert for errors
    }

    if (!leaderboard.length) {
        return <div className="alert alert-warning text-center">No leaderboard data available.</div>; // Bootstrap alert for no data
    }

    return (
        <div className="container mt-5">
            <h1 className="text-center mb-4">League Leaderboard</h1>
            {stats && (
                <div className="text-center mb-3">
                    <p className="lead">
                        Total Players: {stats.total_players}
                        {stats.playoff_spots && (
                            <span className="ms-3">
                                <i className="fas fa-trophy text-warning"></i>
                                {' '}Playoff Spots: {stats.playoff_spots}
                            </span>
                        )}
                    </p>
                </div>
            )}
            <div className="table-responsive">
                <table className="table table-striped table-hover">
                    <thead className="thead-dark">
                        <tr>
                            <th className="league-leaderboard-rank-col">Rank</th>
                            <th onClick={() => sortLeaderboard('name')} className="cursor-pointer">Player</th>
                            <th onClick={() => sortLeaderboard('total_points')} className="cursor-pointer">Points</th>
                            <th className="d-none d-md-table-cell cursor-pointer" onClick={() => sortLeaderboard('wins')}>Wins</th>
                            <th className="d-none d-lg-table-cell cursor-pointer" onClick={() => sortLeaderboard('losses')}>Losses</th>
                            <th className="d-none d-lg-table-cell cursor-pointer" onClick={() => sortLeaderboard('draws')}>Draws</th>
                            <th className="d-none d-md-table-cell cursor-pointer" onClick={() => sortLeaderboard('total_games')}>Games</th>
                            <th className="d-none d-lg-table-cell cursor-pointer" onClick={() => sortLeaderboard('win_rate')}>Win Rate</th>
                            <th className="d-none d-md-table-cell league-leaderboard-status-col">Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {leaderboard.map((player) => {
                            const isExpanded = expandedRows.has(player.player_id);
                            return (
                                <React.Fragment key={player.player_id}>
                                    <tr
                                        onClick={() => toggleRow(player.player_id)}
                                        className="d-md-none cursor-pointer"
                                    >
                                        <td className="fw-bold">
                                            {player.rank}
                                            <i className={`fas fa-chevron-${isExpanded ? 'down' : 'right'} ms-2 text-muted league-leaderboard-chevron`}></i>
                                        </td>
                                        <td>
                                            <Link
                                                to={`/leagues/${leagueId}/profile/${player.player_id}`}
                                                className="text-decoration-none"
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                {player.firstname} {player.lastname}
                                            </Link>
                                        </td>
                                        <td><span className="badge bg-primary">{player.total_points || 0}</span></td>
                                    </tr>
                                    {/* Expanded row details for mobile */}
                                    {isExpanded && (
                                        <tr className="d-md-none">
                                            <td colSpan="3" className="league-leaderboard-expanded-row">
                                                <div className="p-2">
                                                    <div className="row g-2 small">
                                                        <div className="col-6">
                                                            <strong>Record:</strong> {player.wins}W - {player.losses}L - {player.draws}D
                                                        </div>
                                                        <div className="col-6">
                                                            <strong>Total Games:</strong> {player.total_games}
                                                        </div>
                                                        <div className="col-6">
                                                            <strong>Win Rate:</strong> {player.win_rate ? `${player.win_rate}%` : '0%'}
                                                        </div>
                                                        <div className="col-6">
                                                            <strong>Status:</strong>{' '}
                                                            {player.qualified ? (
                                                                <span className="badge bg-success">
                                                                    <i className="fas fa-check-circle"></i> Qualified
                                                                </span>
                                                            ) : (
                                                                <span className="text-muted">-</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                    {/* Desktop row - hidden on mobile */}
                                    <tr key={player.player_id} className="d-none d-md-table-row">
                                        <td className="fw-bold">{player.rank}</td>
                                        <td>
                                            <Link to={`/leagues/${leagueId}/profile/${player.player_id}`} className="text-decoration-none">
                                                {player.firstname} {player.lastname}
                                            </Link>
                                        </td>
                                        <td><span className="badge bg-primary">{player.total_points || 0}</span></td>
                                        <td>{player.wins}</td>
                                        <td className="d-none d-lg-table-cell">{player.losses}</td>
                                        <td className="d-none d-lg-table-cell">{player.draws}</td>
                                        <td>{player.total_games}</td>
                                        <td className="d-none d-lg-table-cell">{player.win_rate ? `${player.win_rate}%` : '0%'}</td>
                                        <td>
                                            {player.qualified ? (
                                                <span className="badge bg-success">
                                                    <i className="fas fa-check-circle"></i> Qualified
                                                </span>
                                            ) : (
                                                <span className="badge bg-secondary">-</span>
                                            )}
                                        </td>
                                    </tr>
                                </React.Fragment>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default LeagueLeaderboard;