import React, { useEffect, useState } from 'react';
import { getMatchupMatrix } from '../../api/attendanceApi';
import { usePermissions } from '../context/PermissionsProvider';
import LoadingSpinner from '../Shared/LoadingSpinner';
import './MatchupMatrixPage.css';

const MatchupMatrixPage = () => {
    const { activeLeague } = usePermissions();

    const [players, setPlayers] = useState([]);
    const [matrix, setMatrix] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [sortBy, setSortBy] = useState('name');

    const leagueId = activeLeague?.league_id || activeLeague?.id;

    const fetchMatrix = async () => {
        if (!leagueId) {
            setLoading(false);
            return;
        }

        setLoading(true);
        setError('');
        try {
            const data = await getMatchupMatrix(leagueId);
            setPlayers(data.players || []);
            setMatrix(data.matrix || {});
        } catch (err) {
            console.error('Error fetching matchup matrix:', err);
            setError('Failed to load matchup matrix. The database tables may not exist yet.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMatrix();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [leagueId]);

    const sortedPlayers = [...players].sort((a, b) => {
        if (sortBy === 'name') {
            return `${a.firstname} ${a.lastname}`.localeCompare(`${b.firstname} ${b.lastname}`);
        }
        // Sort by total games played
        const aGames = Object.values(matrix[a.id] || {}).reduce((sum, n) => sum + n, 0);
        const bGames = Object.values(matrix[b.id] || {}).reduce((sum, n) => sum + n, 0);
        return bGames - aGames;
    });

    const getGameCount = (p1Id, p2Id) => {
        return (matrix[p1Id] && matrix[p1Id][p2Id]) || 0;
    };

    const getCellClass = (count) => {
        if (count === 0) return 'cell-zero';
        if (count === 1) return 'cell-one';
        if (count === 2) return 'cell-two';
        return 'cell-many';
    };

    const getMaxGames = () => {
        let max = 0;
        players.forEach(p1 => {
            players.forEach(p2 => {
                if (p1.id !== p2.id) {
                    const count = getGameCount(p1.id, p2.id);
                    if (count > max) max = count;
                }
            });
        });
        return max;
    };

    if (!activeLeague) {
        return (
            <div className="container mt-4">
                <div className="alert alert-warning">
                    <i className="fas fa-exclamation-triangle me-2"></i>
                    Please join a league to view the matchup matrix.
                </div>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="container mt-4 text-center py-5">
                <LoadingSpinner size="lg" />
            </div>
        );
    }

    const maxGames = getMaxGames();

    return (
        <div className="container-fluid mt-4">
            <h2 className="mb-4">
                <i className="fas fa-th me-2"></i>
                Matchup Matrix - {activeLeague?.league_name || activeLeague?.name}
            </h2>

            {error && <div className="alert alert-danger">{error}</div>}

            {/* Legend */}
            <div className="card mb-4">
                <div className="card-body">
                    <div className="row align-items-center">
                        <div className="col-md-6">
                            <strong>Legend:</strong>
                            <span className="legend-item ms-3">
                                <span className="legend-box cell-zero"></span> Never played
                            </span>
                            <span className="legend-item ms-2">
                                <span className="legend-box cell-one"></span> 1 game
                            </span>
                            <span className="legend-item ms-2">
                                <span className="legend-box cell-two"></span> 2 games
                            </span>
                            <span className="legend-item ms-2">
                                <span className="legend-box cell-many"></span> 3+ games
                            </span>
                        </div>
                        <div className="col-md-6 text-end">
                            <label className="me-2">Sort by:</label>
                            <select
                                className="form-select d-inline-block w-auto"
                                value={sortBy}
                                onChange={(e) => setSortBy(e.target.value)}
                            >
                                <option value="name">Name</option>
                                <option value="games">Games Played</option>
                            </select>
                        </div>
                    </div>
                </div>
            </div>

            {players.length === 0 ? (
                <div className="alert alert-info">
                    <i className="fas fa-info-circle me-2"></i>
                    No completed games yet in this league.
                </div>
            ) : (
                <div className="matrix-container">
                    <table className="table table-bordered matrix-table">
                        <thead>
                            <tr>
                                <th className="sticky-col"></th>
                                {sortedPlayers.map(player => (
                                    <th key={player.id} className="player-header">
                                        <span className="player-name-vertical">
                                            {player.firstname} {player.lastname?.charAt(0)}.
                                        </span>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {sortedPlayers.map(rowPlayer => (
                                <tr key={rowPlayer.id}>
                                    <th className="sticky-col player-row-header">
                                        {rowPlayer.firstname} {rowPlayer.lastname?.charAt(0)}.
                                    </th>
                                    {sortedPlayers.map(colPlayer => {
                                        const count = getGameCount(rowPlayer.id, colPlayer.id);
                                        const isSelf = rowPlayer.id === colPlayer.id;
                                        return (
                                            <td
                                                key={colPlayer.id}
                                                className={`matrix-cell ${isSelf ? 'cell-self' : getCellClass(count)}`}
                                                title={isSelf ? '' : `${rowPlayer.firstname} vs ${colPlayer.firstname}: ${count} games`}
                                            >
                                                {isSelf ? '-' : count}
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Stats Summary */}
            {players.length > 0 && (
                <div className="card mt-4">
                    <div className="card-header">
                        <i className="fas fa-chart-bar me-2"></i>
                        Statistics
                    </div>
                    <div className="card-body">
                        <div className="row">
                            <div className="col-md-3">
                                <strong>Players:</strong> {players.length}
                            </div>
                            <div className="col-md-3">
                                <strong>Possible Pairings:</strong> {(players.length * (players.length - 1)) / 2}
                            </div>
                            <div className="col-md-3">
                                <strong>Max Games Between Pair:</strong> {maxGames}
                            </div>
                            <div className="col-md-3">
                                <strong>Unplayed Pairings:</strong>{' '}
                                {sortedPlayers.reduce((count, p1, i) => {
                                    return count + sortedPlayers.slice(i + 1).filter(p2 => getGameCount(p1.id, p2.id) === 0).length;
                                }, 0)}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MatchupMatrixPage;
