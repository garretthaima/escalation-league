import React from 'react';
import PropTypes from 'prop-types';
import './RecentWinners.css';

/**
 * Displays recent game winners for the public homepage
 */
const RecentWinners = ({ games, loading }) => {
    if (loading) {
        return (
            <div className="card recent-winners-card h-100">
                <div className="card-body text-center py-4">
                    <i className="fas fa-spinner fa-spin fa-2x text-muted mb-3"></i>
                    <p className="text-muted mb-0">Loading...</p>
                </div>
            </div>
        );
    }

    if (!games || games.length === 0) {
        return (
            <div className="card recent-winners-card h-100">
                <div className="card-body text-center py-4">
                    <i className="fas fa-history fa-2x text-muted mb-3"></i>
                    <p className="text-muted mb-0">No recent games</p>
                </div>
            </div>
        );
    }

    return (
        <div className="card recent-winners-card h-100">
            <div className="card-body">
                <h5 className="card-title mb-3">
                    <i className="fas fa-history me-2 text-info"></i>
                    Recent Winners
                </h5>

                <div className="list-group list-group-flush">
                    {games.map(game => {
                        const winner = game.participants?.find(p => p.result === 'win');
                        const isDraw = game.participants?.some(p => p.result === 'draw');
                        const gameDate = new Date(game.created_at).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric'
                        });

                        return (
                            <div key={game.id} className="list-group-item recent-winner-item">
                                <div className="d-flex justify-content-between align-items-center">
                                    <div>
                                        <span className="recent-winner-game-id">
                                            Game #{game.id}
                                        </span>
                                        <span className="recent-winner-date">
                                            {gameDate}
                                        </span>
                                    </div>
                                    <div>
                                        {isDraw ? (
                                            <span className="badge bg-secondary">
                                                Draw
                                            </span>
                                        ) : winner ? (
                                            <span className="badge recent-winner-badge">
                                                <i className="fas fa-crown me-1"></i>
                                                {winner.firstname}
                                            </span>
                                        ) : (
                                            <span className="badge bg-secondary">-</span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

RecentWinners.propTypes = {
    games: PropTypes.arrayOf(
        PropTypes.shape({
            id: PropTypes.number.isRequired,
            created_at: PropTypes.string,
            participants: PropTypes.arrayOf(
                PropTypes.shape({
                    firstname: PropTypes.string,
                    result: PropTypes.string
                })
            )
        })
    ),
    loading: PropTypes.bool
};

RecentWinners.defaultProps = {
    games: [],
    loading: false
};

export default RecentWinners;
