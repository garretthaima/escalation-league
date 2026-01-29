import React from 'react';
import PropTypes from 'prop-types';
import './LiveStatsBar.css';

/**
 * Displays live stats for the public homepage
 * Shows active games, total players, and completed games count
 */
const LiveStatsBar = ({ activeGames, totalPlayers, completedGames, loading }) => {
    if (loading) {
        return (
            <div className="live-stats-bar">
                <div className="live-stats-container">
                    <span className="live-stats-item">
                        <i className="fas fa-spinner fa-spin me-2"></i>
                        Loading stats...
                    </span>
                </div>
            </div>
        );
    }

    return (
        <div className="live-stats-bar">
            <div className="live-stats-container">
                <span className="live-stats-item">
                    <i className="fas fa-gamepad me-2 text-success"></i>
                    <strong>{activeGames || 0}</strong> active game{activeGames !== 1 ? 's' : ''}
                </span>
                <span className="live-stats-divider">|</span>
                <span className="live-stats-item">
                    <i className="fas fa-users me-2 text-info"></i>
                    <strong>{totalPlayers || 0}</strong> player{totalPlayers !== 1 ? 's' : ''}
                </span>
                <span className="live-stats-divider">|</span>
                <span className="live-stats-item">
                    <i className="fas fa-trophy me-2 text-brand-gold"></i>
                    <strong>{completedGames || 0}</strong> game{completedGames !== 1 ? 's' : ''} played
                </span>
            </div>
        </div>
    );
};

LiveStatsBar.propTypes = {
    activeGames: PropTypes.number,
    totalPlayers: PropTypes.number,
    completedGames: PropTypes.number,
    loading: PropTypes.bool
};

LiveStatsBar.defaultProps = {
    activeGames: 0,
    totalPlayers: 0,
    completedGames: 0,
    loading: false
};

export default LiveStatsBar;
