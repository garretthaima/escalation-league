import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';

const LeaderboardSection = ({ leaderboard, leagueId, currentUserId, compact = true }) => {
    const [showAll, setShowAll] = useState(false);

    if (!leaderboard || leaderboard.length === 0) {
        return <p className="text-muted">No leaderboard data available.</p>;
    }

    const displayData = compact && !showAll ? leaderboard.slice(0, 10) : leaderboard;

    return (
        <div>
            <div className="table-responsive">
                <table className="table table-hover mb-0">
                    <thead>
                        <tr>
                            <th style={{ width: '60px' }}>Rank</th>
                            <th>Player</th>
                            <th className="text-center" style={{ width: '80px' }}>Points</th>
                            <th className="text-center d-none d-sm-table-cell" style={{ width: '100px' }}>Record</th>
                            <th className="text-center d-none d-md-table-cell" style={{ width: '80px' }}>Win %</th>
                        </tr>
                    </thead>
                    <tbody>
                        {displayData.map((player) => {
                            const isCurrentUser = player.player_id === currentUserId;
                            return (
                                <tr
                                    key={player.player_id}
                                    className={isCurrentUser ? 'table-primary' : ''}
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
                                        <Link
                                            to={`/leagues/${leagueId}/profile/${player.player_id}`}
                                            className="text-decoration-none"
                                        >
                                            {player.firstname} {player.lastname}
                                            {isCurrentUser && <small className="text-muted ms-2">(you)</small>}
                                        </Link>
                                    </td>
                                    <td className="text-center">
                                        <span className="badge bg-primary">{player.total_points || 0}</span>
                                    </td>
                                    <td className="text-center d-none d-sm-table-cell">
                                        <span className="text-success">{player.wins || 0}W</span>
                                        {' - '}
                                        <span className="text-danger">{player.losses || 0}L</span>
                                        {player.draws > 0 && (
                                            <>
                                                {' - '}
                                                <span className="text-muted">{player.draws}D</span>
                                            </>
                                        )}
                                    </td>
                                    <td className="text-center d-none d-md-table-cell">
                                        {player.win_rate ? `${player.win_rate}%` : '-'}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {compact && leaderboard.length > 10 && (
                <div className="text-center mt-3">
                    <button
                        className="btn btn-link btn-sm"
                        onClick={() => setShowAll(!showAll)}
                    >
                        {showAll ? (
                            <>Show less <i className="fas fa-chevron-up ms-1"></i></>
                        ) : (
                            <>Show all {leaderboard.length} players <i className="fas fa-chevron-down ms-1"></i></>
                        )}
                    </button>
                </div>
            )}
        </div>
    );
};

LeaderboardSection.propTypes = {
    leaderboard: PropTypes.arrayOf(PropTypes.shape({
        player_id: PropTypes.number.isRequired,
        firstname: PropTypes.string,
        lastname: PropTypes.string,
        total_points: PropTypes.number,
        wins: PropTypes.number,
        losses: PropTypes.number,
        draws: PropTypes.number,
        win_rate: PropTypes.string,
        rank: PropTypes.number
    })),
    leagueId: PropTypes.number,
    currentUserId: PropTypes.number,
    compact: PropTypes.bool
};

export default LeaderboardSection;
