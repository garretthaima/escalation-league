import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';

const LeaderboardSection = ({ leaderboard, leagueId, currentUserId, compact = true }) => {
    const [showAll, setShowAll] = useState(false);
    const [expandedRow, setExpandedRow] = useState(null);

    if (!leaderboard || leaderboard.length === 0) {
        return <p className="text-muted">No leaderboard data available.</p>;
    }

    const displayData = compact && !showAll ? leaderboard.slice(0, 10) : leaderboard;

    // Format record with proper spacing
    const formatRecord = (player) => {
        const parts = [`${player.wins || 0}W`, `${player.losses || 0}L`];
        if (player.draws > 0) {
            parts.push(`${player.draws}D`);
        }
        return parts;
    };

    const toggleRow = (playerId, e) => {
        // Only toggle on mobile (check if we're showing the chevron)
        if (window.innerWidth < 576) {
            setExpandedRow(expandedRow === playerId ? null : playerId);
        }
    };

    return (
        <div>
            <table className="table table-hover mb-0">
                <thead>
                    <tr>
                        <th style={{ width: '60px' }}>Rank</th>
                        <th>Player</th>
                        <th className="text-center" style={{ width: '80px' }}>Points</th>
                        <th className="text-center d-none d-sm-table-cell" style={{ width: '120px' }}>Record</th>
                        <th className="text-center d-none d-md-table-cell" style={{ width: '80px' }}>Games</th>
                        <th className="text-center d-none d-md-table-cell" style={{ width: '80px' }}>Win %</th>
                        <th className="text-center d-none d-lg-table-cell" style={{ width: '100px' }}>Playoffs</th>
                    </tr>
                </thead>
                <tbody>
                    {displayData.map((player) => {
                        const isCurrentUser = player.player_id === currentUserId;
                        const isExpanded = expandedRow === player.player_id;
                        const recordParts = formatRecord(player);

                        return (
                            <React.Fragment key={player.player_id}>
                                <tr
                                    className={isCurrentUser ? 'table-primary' : ''}
                                    onClick={(e) => toggleRow(player.player_id, e)}
                                    style={{ cursor: window.innerWidth < 576 ? 'pointer' : 'default' }}
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
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            {player.firstname} {player.lastname}
                                        </Link>
                                        {isCurrentUser && <small className="text-muted ms-2">(you)</small>}
                                    </td>
                                    <td className="text-center">
                                        <span
                                            style={{
                                                background: 'var(--bg-secondary)',
                                                padding: '4px 10px',
                                                borderRadius: '12px',
                                                fontWeight: 600,
                                                fontSize: '0.85rem'
                                            }}
                                        >
                                            {player.total_points || 0}
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
                                    <td className="text-center d-none d-md-table-cell">
                                        {player.win_rate ? `${player.win_rate}%` : '-'}
                                    </td>
                                    <td className="text-center d-none d-lg-table-cell">
                                        {player.qualified ? (
                                            <span className="badge" style={{ background: 'var(--brand-gold)', color: '#1a1a2e' }}>
                                                <i className="fas fa-check me-1"></i>Qualified
                                            </span>
                                        ) : (
                                            <span className="text-muted">-</span>
                                        )}
                                    </td>
                                </tr>
                                {/* Mobile expanded details */}
                                {isExpanded && (
                                    <tr className="d-sm-none" style={{ background: 'var(--bg-secondary)' }}>
                                        <td colSpan="3" style={{ padding: '0.75rem 1rem' }}>
                                            <div className="d-flex flex-wrap gap-3" style={{ fontSize: '0.85rem' }}>
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
                                                <div>
                                                    {player.qualified ? (
                                                        <span className="badge" style={{ background: 'var(--brand-gold)', color: '#1a1a2e' }}>
                                                            <i className="fas fa-check me-1"></i>Qualified
                                                        </span>
                                                    ) : (
                                                        <span className="text-muted">Not qualified</span>
                                                    )}
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
        total_games: PropTypes.number,
        win_rate: PropTypes.string,
        rank: PropTypes.number,
        qualified: PropTypes.bool
    })),
    leagueId: PropTypes.number,
    currentUserId: PropTypes.number,
    compact: PropTypes.bool
};

export default LeaderboardSection;
