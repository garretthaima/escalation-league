import React from 'react';
import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import './QuickStatsCard.css';

/**
 * Compact stats card showing user's league standing
 * Used on the main dashboard for quick overview
 */
const QuickStatsCard = ({ userStats, totalPlayers, leagueId }) => {
    if (!userStats) {
        return (
            <div className="card quick-stats-card mb-4">
                <div className="card-body text-center py-4">
                    <i className="fas fa-user-plus fa-2x text-muted mb-3"></i>
                    <p className="text-muted mb-2">You're not in a league yet</p>
                    <Link to="/leagues" className="btn btn-primary btn-sm">
                        Join a League
                    </Link>
                </div>
            </div>
        );
    }

    const winRate = (userStats.league_wins || 0) + (userStats.league_losses || 0) > 0
        ? (((userStats.league_wins || 0) / ((userStats.league_wins || 0) + (userStats.league_losses || 0))) * 100).toFixed(0)
        : 0;

    const rankBadgeClass = userStats.rank <= 3 ? 'rank-badge-gold' : 'rank-badge-default';

    return (
        <div className="card quick-stats-card mb-4">
            <div className="card-body">
                <div className="d-flex align-items-center justify-content-between mb-3">
                    <h6 className="mb-0">
                        <i className="fas fa-chart-bar me-2"></i>
                        Your Stats
                    </h6>
                    {userStats.rank && (
                        <div className={`rank-badge ${rankBadgeClass}`}>
                            #{userStats.rank}
                            {totalPlayers && (
                                <span className="rank-total">/{totalPlayers}</span>
                            )}
                        </div>
                    )}
                </div>

                {/* Stats Grid */}
                <div className="row g-2 mb-3">
                    <div className="col-6">
                        <div className="stat-box stat-box-primary">
                            <div className="stat-value">{userStats.total_points || 0}</div>
                            <div className="stat-label">Points</div>
                        </div>
                    </div>
                    <div className="col-6">
                        <div className="stat-box stat-box-info">
                            <div className="stat-value">{winRate}%</div>
                            <div className="stat-label">Win Rate</div>
                        </div>
                    </div>
                </div>

                {/* W-L-D Row */}
                <div className="d-flex justify-content-center gap-3 mb-3">
                    <div className="wld-stat">
                        <span className="wld-value text-success">{userStats.league_wins || 0}</span>
                        <span className="wld-label">W</span>
                    </div>
                    <div className="wld-divider">-</div>
                    <div className="wld-stat">
                        <span className="wld-value text-danger">{userStats.league_losses || 0}</span>
                        <span className="wld-label">L</span>
                    </div>
                    <div className="wld-divider">-</div>
                    <div className="wld-stat">
                        <span className="wld-value text-secondary">{userStats.league_draws || 0}</span>
                        <span className="wld-label">D</span>
                    </div>
                </div>

                {/* ELO if available */}
                {userStats.elo_rating && (
                    <div className="text-center text-muted small mb-3">
                        <i className="fas fa-star me-1"></i>
                        {userStats.elo_rating} ELO
                    </div>
                )}

                {/* Commander Name */}
                {userStats.current_commander && (
                    <div className="text-center text-muted small">
                        <i className="fas fa-hat-wizard me-1"></i>
                        {userStats.current_commander}
                        {userStats.commander_partner && ` + ${userStats.commander_partner}`}
                    </div>
                )}

                {/* Link to full profile */}
                <div className="text-center mt-3">
                    <Link to="/leagues/dashboard" className="btn btn-sm btn-outline-secondary">
                        <i className="fas fa-user me-1"></i>
                        Full Profile
                    </Link>
                </div>
            </div>
        </div>
    );
};

QuickStatsCard.propTypes = {
    userStats: PropTypes.shape({
        total_points: PropTypes.number,
        league_wins: PropTypes.number,
        league_losses: PropTypes.number,
        league_draws: PropTypes.number,
        elo_rating: PropTypes.number,
        current_commander: PropTypes.string,
        commander_partner: PropTypes.string,
        rank: PropTypes.number
    }),
    totalPlayers: PropTypes.number,
    leagueId: PropTypes.number
};

export default QuickStatsCard;
