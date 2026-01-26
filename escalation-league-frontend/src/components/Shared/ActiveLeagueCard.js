import React from 'react';
import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import './ActiveLeagueCard.css';

/**
 * Card showing the current active league for the public homepage
 * Displays league name, week, dates, and player count
 */
const ActiveLeagueCard = ({ league, playerCount }) => {
    if (!league) {
        return (
            <div className="card active-league-card h-100">
                <div className="card-body text-center py-4">
                    <i className="fas fa-trophy fa-2x text-muted mb-3"></i>
                    <p className="text-muted mb-0">No active league</p>
                </div>
            </div>
        );
    }

    // Calculate days remaining
    const endDate = new Date(league.end_date);
    const startDate = new Date(league.start_date);
    const today = new Date();
    const daysRemaining = Math.ceil((endDate - today) / (1000 * 60 * 60 * 24));
    const totalDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
    const daysElapsed = Math.max(0, totalDays - daysRemaining);
    const progressPercent = totalDays > 0 ? Math.min(100, (daysElapsed / totalDays) * 100) : 0;

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            timeZone: 'UTC'
        });
    };

    return (
        <div className="card active-league-card h-100">
            <div className="card-body">
                <div className="d-flex justify-content-between align-items-start mb-3">
                    <div>
                        <h5 className="card-title mb-1">
                            <i className="fas fa-trophy me-2 text-brand-gold"></i>
                            {league.name}
                        </h5>
                        <p className="text-muted small mb-0">
                            {league.description}
                        </p>
                    </div>
                    <span className="badge bg-primary fs-6">
                        Week {league.current_week}
                    </span>
                </div>

                {/* Progress Bar */}
                <div className="mb-3">
                    <div className="d-flex justify-content-between text-sm mb-1">
                        <span className="text-muted">{formatDate(league.start_date)}</span>
                        <span className="text-muted">{formatDate(league.end_date)}</span>
                    </div>
                    <div className="progress active-league-progress">
                        <div
                            className="progress-bar"
                            role="progressbar"
                            style={{ width: `${progressPercent}%` }}
                            aria-valuenow={progressPercent}
                            aria-valuemin="0"
                            aria-valuemax="100"
                        ></div>
                    </div>
                </div>

                {/* Stats Row */}
                <div className="d-flex justify-content-between align-items-center mb-3">
                    <div className="text-center">
                        <div className="fs-5 fw-bold text-primary">{playerCount || '?'}</div>
                        <small className="text-muted">Players</small>
                    </div>
                    <div className="text-center">
                        <div className={`fs-5 fw-bold ${daysRemaining <= 7 ? 'text-warning' : 'text-success'}`}>
                            {daysRemaining > 0 ? daysRemaining : 0}
                        </div>
                        <small className="text-muted">Days Left</small>
                    </div>
                    <div className="text-center">
                        <div className="fs-5 fw-bold text-info">${league.weekly_budget || 0}</div>
                        <small className="text-muted">Weekly Budget</small>
                    </div>
                </div>

                {/* CTA */}
                <Link to="/leagues" className="btn btn-outline-primary w-100">
                    <i className="fas fa-sign-in-alt me-2"></i>
                    View League
                </Link>
            </div>
        </div>
    );
};

ActiveLeagueCard.propTypes = {
    league: PropTypes.shape({
        id: PropTypes.number,
        name: PropTypes.string,
        description: PropTypes.string,
        current_week: PropTypes.number,
        start_date: PropTypes.string,
        end_date: PropTypes.string,
        weekly_budget: PropTypes.number
    }),
    playerCount: PropTypes.number
};

export default ActiveLeagueCard;
