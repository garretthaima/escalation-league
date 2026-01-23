import React from 'react';
import { Link } from 'react-router-dom';
import PropTypes from 'prop-types';
import CommanderDisplay from './CommanderDisplay';

const OverviewTab = ({ user, currentLeague }) => {
    return (
        <div className="row g-4">
            {/* Quick Actions */}
            <div className="col-lg-8">
                <div className="profile-card">
                    <div className="profile-card-header">
                        <h5>
                            <i className="fas fa-bolt"></i>
                            Quick Actions
                        </h5>
                    </div>
                    <div className="profile-card-body">
                        <div className="row g-3">
                            {currentLeague ? (
                                <>
                                    <div className="col-sm-6">
                                        <Link
                                            to="/pods"
                                            className="quick-action-link d-flex align-items-center p-3 rounded text-decoration-none"
                                        >
                                            <div className="quick-action-icon quick-action-icon-purple me-3">
                                                <i className="fas fa-gamepad fa-lg"></i>
                                            </div>
                                            <div>
                                                <div className="quick-action-title">
                                                    View Games
                                                </div>
                                                <div className="quick-action-subtitle">
                                                    Check active & pending pods
                                                </div>
                                            </div>
                                        </Link>
                                    </div>
                                    <div className="col-sm-6">
                                        <Link
                                            to="/leagues"
                                            className="quick-action-link d-flex align-items-center p-3 rounded text-decoration-none"
                                        >
                                            <div className="quick-action-icon quick-action-icon-gold me-3">
                                                <i className="fas fa-trophy fa-lg"></i>
                                            </div>
                                            <div>
                                                <div className="quick-action-title">
                                                    League Dashboard
                                                </div>
                                                <div className="quick-action-subtitle">
                                                    View standings & schedule
                                                </div>
                                            </div>
                                        </Link>
                                    </div>
                                </>
                            ) : (
                                <div className="col-12">
                                    <Link
                                        to="/leagues"
                                        className="quick-action-link d-flex align-items-center p-3 rounded text-decoration-none"
                                    >
                                        <div className="quick-action-icon quick-action-icon-purple me-3">
                                            <i className="fas fa-plus fa-lg"></i>
                                        </div>
                                        <div>
                                            <div className="quick-action-title">
                                                Join a League
                                            </div>
                                            <div className="quick-action-subtitle">
                                                Browse and join an active league
                                            </div>
                                        </div>
                                    </Link>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Current League Info */}
                {currentLeague && (
                    <div className="profile-card">
                        <div className="profile-card-header">
                            <h5>
                                <i className="fas fa-trophy"></i>
                                Current League
                            </h5>
                        </div>
                        <div className="profile-card-body">
                            <div className="league-info-card">
                                <div className="d-flex justify-content-between align-items-start mb-3">
                                    <div>
                                        <h5 className="mb-1">{currentLeague.name}</h5>
                                        <span className={`league-status-badge ${currentLeague.is_active ? 'active' : 'inactive'}`}>
                                            {currentLeague.is_active ? 'Active' : 'Inactive'}
                                        </span>
                                    </div>
                                    {currentLeague.rank && (
                                        <div className="text-end">
                                            <div className="league-rank-value">
                                                #{currentLeague.rank}
                                            </div>
                                            <div className="league-rank-label">
                                                Current Rank
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="row g-3 mb-3">
                                    <div className="col-4 text-center">
                                        <div className="league-stat-value wins">
                                            {currentLeague.league_wins || 0}
                                        </div>
                                        <div className="league-stat-label">Wins</div>
                                    </div>
                                    <div className="col-4 text-center">
                                        <div className="league-stat-value losses">
                                            {currentLeague.league_losses || 0}
                                        </div>
                                        <div className="league-stat-label">Losses</div>
                                    </div>
                                    <div className="col-4 text-center">
                                        <div className="league-stat-value draws">
                                            {currentLeague.league_draws || 0}
                                        </div>
                                        <div className="league-stat-label">Draws</div>
                                    </div>
                                </div>

                                {(currentLeague.commander_name || currentLeague.current_commander) && (
                                    <div className="league-commander">
                                        {currentLeague.commander_scryfall_id && (
                                            <img
                                                src={`https://cards.scryfall.io/normal/front/${currentLeague.commander_scryfall_id.charAt(0)}/${currentLeague.commander_scryfall_id.charAt(1)}/${currentLeague.commander_scryfall_id}.jpg`}
                                                alt={currentLeague.commander_name || 'Commander'}
                                                style={{
                                                    width: '60px',
                                                    borderRadius: '6px',
                                                    boxShadow: '0 2px 6px rgba(0,0,0,0.3)'
                                                }}
                                                onError={(e) => {
                                                    e.target.style.display = 'none';
                                                }}
                                            />
                                        )}
                                        {!currentLeague.commander_scryfall_id && (
                                            <div className="league-commander-icon">
                                                <i className="fas fa-hat-wizard"></i>
                                            </div>
                                        )}
                                        <div>
                                            <div className="commander-label">
                                                Commander
                                            </div>
                                            <div className="commander-name">
                                                {currentLeague.commander_name || (
                                                    <CommanderDisplay
                                                        commanderId={currentLeague.current_commander}
                                                        showPartner={false}
                                                    />
                                                )}
                                                {(currentLeague.partner_name || currentLeague.commander_partner) && (
                                                    <span className="commander-partner">
                                                        {' // '}{currentLeague.partner_name || currentLeague.commander_partner}
                                                    </span>
                                                )}
                                            </div>
                                            {currentLeague.decklistUrl && (
                                                <a
                                                    href={currentLeague.decklistUrl}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="decklist-link"
                                                >
                                                    <i className="fas fa-external-link-alt me-1"></i>
                                                    View Decklist
                                                </a>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Sidebar */}
            <div className="col-lg-4">
                {/* Account Info */}
                <div className="profile-card">
                    <div className="profile-card-header">
                        <h5>
                            <i className="fas fa-id-card"></i>
                            Account Info
                        </h5>
                    </div>
                    <div className="profile-card-body">
                        <div className="mb-3">
                            <div className="account-info-label">
                                Full Name
                            </div>
                            <div className="account-info-value">
                                {user.firstname || 'Not set'} {user.lastname || ''}
                            </div>
                        </div>
                        <div className="mb-3">
                            <div className="account-info-label">
                                Email
                            </div>
                            <div className="account-info-value" style={{ wordBreak: 'break-word' }}>
                                {user.email}
                            </div>
                        </div>
                        <div>
                            <div className="account-info-label">
                                Last Active
                            </div>
                            <div className="account-info-value">
                                {user.last_login
                                    ? new Date(user.last_login).toLocaleDateString('en-US', {
                                        month: 'long',
                                        day: 'numeric',
                                        year: 'numeric'
                                    })
                                    : 'Never'}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Quick Links */}
                <div className="profile-card">
                    <div className="profile-card-header">
                        <h5>
                            <i className="fas fa-link"></i>
                            Quick Links
                        </h5>
                    </div>
                    <div className="profile-card-body p-0">
                        <Link to="/profile?tab=settings" className="quick-link-item">
                            <span>
                                <i className="fas fa-cog me-2 quick-link-icon"></i>
                                Edit Profile
                            </span>
                            <i className="fas fa-chevron-right quick-link-icon"></i>
                        </Link>
                        <Link to="/profile?tab=activity" className="quick-link-item">
                            <span>
                                <i className="fas fa-history me-2 quick-link-icon"></i>
                                Activity Log
                            </span>
                            <i className="fas fa-chevron-right quick-link-icon"></i>
                        </Link>
                        <Link to="/pods/history" className="quick-link-item">
                            <span>
                                <i className="fas fa-gamepad me-2 quick-link-icon"></i>
                                Game History
                            </span>
                            <i className="fas fa-chevron-right quick-link-icon"></i>
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
};

OverviewTab.propTypes = {
    user: PropTypes.shape({
        firstname: PropTypes.string,
        lastname: PropTypes.string,
        email: PropTypes.string,
        last_login: PropTypes.string,
    }).isRequired,
    currentLeague: PropTypes.shape({
        league_id: PropTypes.number,
        name: PropTypes.string,
        is_active: PropTypes.bool,
        league_wins: PropTypes.number,
        league_losses: PropTypes.number,
        league_draws: PropTypes.number,
        rank: PropTypes.number,
        current_commander: PropTypes.string,
        commander_partner: PropTypes.string,
    }),
};

export default OverviewTab;
