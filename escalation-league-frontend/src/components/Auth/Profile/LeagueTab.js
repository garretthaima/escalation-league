import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import PropTypes from 'prop-types';
import CommanderDisplay from './CommanderDisplay';
import UpdateCommanderModal from '../../Leagues/UpdateCommanderModal';

const LeagueTab = ({ currentLeague, onCommanderUpdated }) => {
    const [showCommanderModal, setShowCommanderModal] = useState(false);
    if (!currentLeague) {
        return (
            <div className="profile-card">
                <div className="profile-card-body text-center py-5">
                    <i
                        className="fas fa-trophy fa-4x mb-3"
                        style={{ color: 'var(--text-secondary)', opacity: 0.3 }}
                    ></i>
                    <h5 className="mb-2">No Active League</h5>
                    <p className="text-muted mb-3">
                        You are not currently participating in any league.
                    </p>
                    <Link
                        to="/leagues"
                        className="btn"
                        style={{
                            background: 'var(--brand-purple)',
                            color: '#fff'
                        }}
                    >
                        <i className="fas fa-search me-2"></i>
                        Browse Leagues
                    </Link>
                </div>
            </div>
        );
    }

    // Calculate days remaining
    const today = new Date();
    const endDate = new Date(currentLeague.end_date);
    const daysRemaining = Math.ceil((endDate - today) / (1000 * 60 * 60 * 24));
    const totalGames = (currentLeague.league_wins || 0) +
                       (currentLeague.league_losses || 0) +
                       (currentLeague.league_draws || 0);

    return (
        <div className="row g-4">
            {/* League Header Card */}
            <div className="col-12">
                <div
                    className="profile-card"
                    style={{
                        background: 'linear-gradient(135deg, var(--brand-purple) 0%, rgba(45, 27, 78, 0.9) 100%)',
                        border: 'none'
                    }}
                >
                    <div className="profile-card-body">
                        <div className="d-flex flex-column flex-md-row justify-content-between align-items-start gap-3">
                            <div>
                                <span
                                    className="badge mb-2"
                                    style={{
                                        background: currentLeague.is_active ? 'rgba(40, 167, 69, 0.2)' : 'rgba(108, 117, 125, 0.2)',
                                        color: currentLeague.is_active ? '#4ade80' : '#9ca3af'
                                    }}
                                >
                                    {currentLeague.is_active ? 'Active' : 'Inactive'}
                                </span>
                                <h3 style={{ color: '#fff', marginBottom: '0.5rem' }}>
                                    {currentLeague.name}
                                </h3>
                                <p style={{ color: 'rgba(255, 255, 255, 0.7)', marginBottom: 0 }}>
                                    {new Date(currentLeague.start_date).toLocaleDateString('en-US', {
                                        month: 'short',
                                        day: 'numeric'
                                    })} - {new Date(currentLeague.end_date).toLocaleDateString('en-US', {
                                        month: 'short',
                                        day: 'numeric',
                                        year: 'numeric'
                                    })}
                                </p>
                            </div>
                            <div className="d-flex gap-3">
                                {currentLeague.rank && (
                                    <div className="text-center">
                                        <div
                                            style={{
                                                fontSize: '2rem',
                                                fontWeight: 700,
                                                color: 'var(--brand-gold)',
                                                lineHeight: 1.2
                                            }}
                                        >
                                            #{currentLeague.rank}
                                        </div>
                                        <div style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.6)' }}>
                                            Rank
                                        </div>
                                    </div>
                                )}
                                {daysRemaining > 0 && (
                                    <div className="text-center">
                                        <div
                                            style={{
                                                fontSize: '2rem',
                                                fontWeight: 700,
                                                color: '#fff',
                                                lineHeight: 1.2
                                            }}
                                        >
                                            {daysRemaining}
                                        </div>
                                        <div style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.6)' }}>
                                            Days Left
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="col-md-6 col-lg-3">
                <div className="profile-card h-100">
                    <div className="profile-card-body text-center">
                        <div
                            className="d-inline-flex align-items-center justify-content-center mb-2"
                            style={{
                                width: '48px',
                                height: '48px',
                                borderRadius: '12px',
                                background: 'rgba(212, 175, 55, 0.15)',
                                color: 'var(--brand-gold)'
                            }}
                        >
                            <i className="fas fa-star fa-lg"></i>
                        </div>
                        <div
                            style={{
                                fontSize: '1.75rem',
                                fontWeight: 700,
                                color: 'var(--brand-gold)'
                            }}
                        >
                            {currentLeague.total_points || 0}
                        </div>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                            Total Points
                        </div>
                    </div>
                </div>
            </div>

            <div className="col-md-6 col-lg-3">
                <div className="profile-card h-100">
                    <div className="profile-card-body text-center">
                        <div
                            className="d-inline-flex align-items-center justify-content-center mb-2"
                            style={{
                                width: '48px',
                                height: '48px',
                                borderRadius: '12px',
                                background: 'rgba(40, 167, 69, 0.15)',
                                color: '#28a745'
                            }}
                        >
                            <i className="fas fa-trophy fa-lg"></i>
                        </div>
                        <div
                            style={{
                                fontSize: '1.75rem',
                                fontWeight: 700,
                                color: '#28a745'
                            }}
                        >
                            {currentLeague.league_wins || 0}
                        </div>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                            Wins
                        </div>
                    </div>
                </div>
            </div>

            <div className="col-md-6 col-lg-3">
                <div className="profile-card h-100">
                    <div className="profile-card-body text-center">
                        <div
                            className="d-inline-flex align-items-center justify-content-center mb-2"
                            style={{
                                width: '48px',
                                height: '48px',
                                borderRadius: '12px',
                                background: 'rgba(220, 53, 69, 0.15)',
                                color: '#dc3545'
                            }}
                        >
                            <i className="fas fa-times-circle fa-lg"></i>
                        </div>
                        <div
                            style={{
                                fontSize: '1.75rem',
                                fontWeight: 700,
                                color: '#dc3545'
                            }}
                        >
                            {currentLeague.league_losses || 0}
                        </div>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                            Losses
                        </div>
                    </div>
                </div>
            </div>

            <div className="col-md-6 col-lg-3">
                <div className="profile-card h-100">
                    <div className="profile-card-body text-center">
                        <div
                            className="d-inline-flex align-items-center justify-content-center mb-2"
                            style={{
                                width: '48px',
                                height: '48px',
                                borderRadius: '12px',
                                background: 'rgba(45, 27, 78, 0.15)',
                                color: 'var(--brand-purple)'
                            }}
                        >
                            <i className="fas fa-chart-line fa-lg"></i>
                        </div>
                        <div
                            style={{
                                fontSize: '1.75rem',
                                fontWeight: 700,
                                color: 'var(--text-primary)'
                            }}
                        >
                            {currentLeague.elo_rating || 1500}
                        </div>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                            League ELO
                        </div>
                    </div>
                </div>
            </div>

            {/* Commander & Decklist */}
            <div className="col-lg-6">
                <div className="profile-card h-100">
                    <div className="profile-card-header">
                        <h5>
                            <i className="fas fa-hat-wizard"></i>
                            Your Commander
                        </h5>
                    </div>
                    <div className="profile-card-body">
                        {currentLeague.commander_name || currentLeague.current_commander ? (
                            <div className="d-flex gap-3">
                                {/* Commander Card Image */}
                                {currentLeague.commander_scryfall_id && (
                                    <img
                                        src={`https://cards.scryfall.io/normal/front/${currentLeague.commander_scryfall_id.charAt(0)}/${currentLeague.commander_scryfall_id.charAt(1)}/${currentLeague.commander_scryfall_id}.jpg`}
                                        alt={currentLeague.commander_name || 'Commander'}
                                        style={{
                                            width: '120px',
                                            borderRadius: '8px',
                                            boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
                                        }}
                                        onError={(e) => {
                                            e.target.style.display = 'none';
                                        }}
                                    />
                                )}
                                <div className="flex-grow-1">
                                    <div style={{ fontWeight: 600, fontSize: '1.1rem', marginBottom: '0.5rem' }}>
                                        {currentLeague.commander_name || (
                                            <CommanderDisplay
                                                commanderId={currentLeague.current_commander}
                                                showPartner={false}
                                            />
                                        )}
                                    </div>
                                    {(currentLeague.partner_name || currentLeague.commander_partner) && (
                                        <div style={{ color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
                                            Partner: {currentLeague.partner_name || (
                                                <CommanderDisplay
                                                    commanderId={currentLeague.commander_partner}
                                                    showPartner={false}
                                                />
                                            )}
                                        </div>
                                    )}
                                    {currentLeague.decklistUrl && (
                                        <a
                                            href={currentLeague.decklistUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="btn btn-sm"
                                            style={{
                                                background: 'var(--brand-purple)',
                                                color: '#fff',
                                                borderRadius: '6px'
                                            }}
                                        >
                                            <i className="fas fa-external-link-alt me-1"></i>
                                            View Decklist
                                        </a>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="text-center py-3 text-muted">
                                <i className="fas fa-question-circle fa-2x mb-2"></i>
                                <p className="mb-0">No commander registered</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Quick Actions */}
            <div className="col-lg-6">
                <div className="profile-card h-100">
                    <div className="profile-card-header">
                        <h5>
                            <i className="fas fa-bolt"></i>
                            Quick Actions
                        </h5>
                    </div>
                    <div className="profile-card-body p-0">
                        <Link
                            to={`/leagues/${currentLeague.league_id}`}
                            className="d-flex align-items-center justify-content-between p-3 text-decoration-none"
                            style={{
                                borderBottom: '1px solid var(--border-color)',
                                color: 'var(--text-primary)'
                            }}
                        >
                            <span>
                                <i className="fas fa-chart-line me-2" style={{ color: 'var(--brand-purple)' }}></i>
                                View Leaderboard
                            </span>
                            <i className="fas fa-chevron-right" style={{ color: 'var(--text-secondary)' }}></i>
                        </Link>
                        <Link
                            to="/pods"
                            className="d-flex align-items-center justify-content-between p-3 text-decoration-none"
                            style={{
                                borderBottom: '1px solid var(--border-color)',
                                color: 'var(--text-primary)'
                            }}
                        >
                            <span>
                                <i className="fas fa-gamepad me-2" style={{ color: 'var(--brand-purple)' }}></i>
                                View Your Games
                            </span>
                            <i className="fas fa-chevron-right" style={{ color: 'var(--text-secondary)' }}></i>
                        </Link>
                        <button
                            onClick={() => setShowCommanderModal(true)}
                            className="d-flex align-items-center justify-content-between p-3 text-decoration-none w-100 text-start"
                            style={{
                                background: 'transparent',
                                border: 'none',
                                color: 'var(--text-primary)',
                                cursor: 'pointer'
                            }}
                        >
                            <span>
                                <i className="fas fa-hat-wizard me-2" style={{ color: 'var(--brand-purple)' }}></i>
                                Update Commander
                            </span>
                            <i className="fas fa-chevron-right" style={{ color: 'var(--text-secondary)' }}></i>
                        </button>
                    </div>
                </div>
            </div>

            {/* Update Commander Modal */}
            <UpdateCommanderModal
                show={showCommanderModal}
                onHide={(updated) => {
                    setShowCommanderModal(false);
                    if (updated && onCommanderUpdated) {
                        onCommanderUpdated();
                    }
                }}
                leagueId={currentLeague.league_id}
                currentCommander={currentLeague.commander_name || currentLeague.current_commander}
                currentPartner={currentLeague.partner_name || currentLeague.commander_partner}
                currentDeckUrl={currentLeague.decklistUrl}
            />
        </div>
    );
};

LeagueTab.propTypes = {
    currentLeague: PropTypes.shape({
        league_id: PropTypes.number,
        name: PropTypes.string,
        start_date: PropTypes.string,
        end_date: PropTypes.string,
        is_active: PropTypes.bool,
        league_wins: PropTypes.number,
        league_losses: PropTypes.number,
        league_draws: PropTypes.number,
        total_points: PropTypes.number,
        rank: PropTypes.number,
        current_commander: PropTypes.string,
        commander_partner: PropTypes.string,
        decklistUrl: PropTypes.string,
    }),
    onCommanderUpdated: PropTypes.func,
};

export default LeagueTab;
