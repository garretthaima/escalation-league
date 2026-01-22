import React, { useState } from 'react';

const TournamentStandings = ({ standings, currentUserId, tournamentWinPoints, tournamentNonWinPoints }) => {
    const [sortConfig, setSortConfig] = useState({ key: 'tournament_rank', direction: 'asc' });

    const sortedStandings = [...standings].sort((a, b) => {
        let aValue = a[sortConfig.key];
        let bValue = b[sortConfig.key];

        // Handle numeric sorting
        if (typeof aValue === 'number' && typeof bValue === 'number') {
            return sortConfig.direction === 'asc' ? aValue - bValue : bValue - aValue;
        }

        // Handle string sorting
        aValue = String(aValue || '');
        bValue = String(bValue || '');
        return sortConfig.direction === 'asc'
            ? aValue.localeCompare(bValue)
            : bValue.localeCompare(aValue);
    });

    const handleSort = (key) => {
        setSortConfig(prev => ({
            key,
            direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
        }));
    };

    const getSortIcon = (key) => {
        if (sortConfig.key !== key) return <i className="fas fa-sort text-muted ms-1"></i>;
        return sortConfig.direction === 'asc'
            ? <i className="fas fa-sort-up ms-1"></i>
            : <i className="fas fa-sort-down ms-1"></i>;
    };

    if (!standings || standings.length === 0) {
        return (
            <div className="alert alert-info">
                <i className="fas fa-info-circle me-2"></i>
                No tournament standings available yet.
            </div>
        );
    }

    return (
        <div className="card">
            <div className="card-header">
                <h5 className="mb-0">
                    <i className="fas fa-trophy me-2"></i>
                    Tournament Standings
                </h5>
                <small className="text-muted">
                    Win = {tournamentWinPoints} pts | Non-Win = {tournamentNonWinPoints} pt
                </small>
            </div>
            <div className="card-body p-0">
                <div className="table-responsive">
                    <table className="table table-hover mb-0">
                        <thead className="table-light">
                            <tr>
                                <th
                                    onClick={() => handleSort('tournament_rank')}
                                    style={{ cursor: 'pointer', width: '60px' }}
                                >
                                    Rank {getSortIcon('tournament_rank')}
                                </th>
                                <th
                                    onClick={() => handleSort('firstname')}
                                    style={{ cursor: 'pointer' }}
                                >
                                    Player {getSortIcon('firstname')}
                                </th>
                                <th
                                    onClick={() => handleSort('tournament_points')}
                                    style={{ cursor: 'pointer', width: '80px' }}
                                    className="text-center"
                                >
                                    Points {getSortIcon('tournament_points')}
                                </th>
                                <th
                                    onClick={() => handleSort('tournament_wins')}
                                    style={{ cursor: 'pointer', width: '80px' }}
                                    className="text-center d-none d-md-table-cell"
                                >
                                    Wins {getSortIcon('tournament_wins')}
                                </th>
                                <th
                                    onClick={() => handleSort('tournament_non_wins')}
                                    style={{ cursor: 'pointer', width: '100px' }}
                                    className="text-center d-none d-md-table-cell"
                                >
                                    Non-Wins {getSortIcon('tournament_non_wins')}
                                </th>
                                <th
                                    onClick={() => handleSort('tournament_seed')}
                                    style={{ cursor: 'pointer', width: '80px' }}
                                    className="text-center d-none d-lg-table-cell"
                                >
                                    Seed {getSortIcon('tournament_seed')}
                                </th>
                                <th style={{ width: '120px' }} className="text-center">
                                    Status
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {sortedStandings.map((player) => {
                                const isCurrentUser = player.player_id === currentUserId;
                                const isTop4 = player.tournament_rank <= 4;

                                return (
                                    <tr
                                        key={player.player_id}
                                        className={isCurrentUser ? 'table-primary' : ''}
                                    >
                                        <td className="fw-bold">
                                            {player.tournament_rank <= 3 && (
                                                <i className={`fas fa-medal me-1 ${
                                                    player.tournament_rank === 1 ? 'text-warning' :
                                                    player.tournament_rank === 2 ? 'text-secondary' :
                                                    'text-bronze'
                                                }`}></i>
                                            )}
                                            {player.tournament_rank}
                                        </td>
                                        <td>
                                            <span className={isCurrentUser ? 'fw-bold' : ''}>
                                                {player.firstname} {player.lastname}
                                            </span>
                                            {isCurrentUser && (
                                                <span className="badge bg-primary ms-2">You</span>
                                            )}
                                        </td>
                                        <td className="text-center">
                                            <span className="badge bg-primary fs-6">
                                                {player.tournament_points}
                                            </span>
                                        </td>
                                        <td className="text-center d-none d-md-table-cell">
                                            <span className="text-success fw-bold">
                                                {player.tournament_wins}
                                            </span>
                                        </td>
                                        <td className="text-center d-none d-md-table-cell">
                                            <span className="text-muted">
                                                {player.tournament_non_wins}
                                            </span>
                                        </td>
                                        <td className="text-center d-none d-lg-table-cell">
                                            #{player.tournament_seed}
                                        </td>
                                        <td className="text-center">
                                            {player.is_champion ? (
                                                <span className="badge bg-warning text-dark">
                                                    <i className="fas fa-crown me-1"></i>
                                                    Champion
                                                </span>
                                            ) : player.championship_qualified ? (
                                                <span className="badge bg-success">
                                                    <i className="fas fa-star me-1"></i>
                                                    Finals
                                                </span>
                                            ) : isTop4 ? (
                                                <span className="badge bg-info">
                                                    <i className="fas fa-arrow-up me-1"></i>
                                                    Top 4
                                                </span>
                                            ) : (
                                                <span className="badge bg-secondary">-</span>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default TournamentStandings;
