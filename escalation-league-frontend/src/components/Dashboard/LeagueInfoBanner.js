import React from 'react';
import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import './LeagueInfoBanner.css';

/**
 * Banner showing current league context for the dashboard
 * Displays league name, week, days remaining, and link to full dashboard
 */
const LeagueInfoBanner = ({ league, playerCount }) => {
    if (!league) {
        return (
            <div className="league-info-banner alert alert-secondary mb-4">
                <i className="fas fa-info-circle me-2"></i>
                No active league. <Link to="/leagues">Join a league</Link> to get started.
            </div>
        );
    }

    // Calculate days remaining
    const endDate = new Date(league.end_date);
    const today = new Date();
    const daysRemaining = Math.ceil((endDate - today) / (1000 * 60 * 60 * 24));

    return (
        <div className="league-info-banner mb-4">
            <div className="d-flex flex-wrap align-items-center justify-content-between gap-2">
                <div className="d-flex flex-wrap align-items-center gap-3">
                    <h5 className="mb-0">
                        <i className="fas fa-trophy me-2 text-brand-gold"></i>
                        {league.name}
                    </h5>
                    <span className="badge bg-primary">
                        Week {league.current_week}
                    </span>
                    {daysRemaining > 0 ? (
                        <span className="text-muted small">
                            <i className="fas fa-clock me-1"></i>
                            {daysRemaining} day{daysRemaining !== 1 ? 's' : ''} remaining
                        </span>
                    ) : (
                        <span className="badge bg-warning text-dark">
                            <i className="fas fa-flag-checkered me-1"></i>
                            League ended
                        </span>
                    )}
                    {playerCount !== undefined && (
                        <span className="text-muted small d-none d-md-inline">
                            <i className="fas fa-users me-1"></i>
                            {playerCount} player{playerCount !== 1 ? 's' : ''}
                        </span>
                    )}
                </div>
                <Link to="/leagues/dashboard" className="btn btn-sm btn-outline-primary">
                    <i className="fas fa-chart-line me-1"></i>
                    <span className="d-none d-sm-inline">Full Dashboard</span>
                    <span className="d-sm-none">More</span>
                </Link>
            </div>
        </div>
    );
};

LeagueInfoBanner.propTypes = {
    league: PropTypes.shape({
        id: PropTypes.number,
        name: PropTypes.string,
        current_week: PropTypes.number,
        end_date: PropTypes.string
    }),
    playerCount: PropTypes.number
};

export default LeagueInfoBanner;
