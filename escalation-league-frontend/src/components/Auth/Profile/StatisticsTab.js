import React from 'react';
import PropTypes from 'prop-types';
import CommanderDisplay from './CommanderDisplay';

const StatisticsTab = ({ user, currentLeague }) => {
    // Calculate stats from currentLeague if available
    const stats = currentLeague ? {
        gamesPlayed: (currentLeague.league_wins || 0) + (currentLeague.league_losses || 0) + (currentLeague.league_draws || 0),
        wins: currentLeague.league_wins || 0,
        losses: currentLeague.league_losses || 0,
        draws: currentLeague.league_draws || 0,
        points: currentLeague.total_points || 0,
    } : {
        gamesPlayed: 0,
        wins: 0,
        losses: 0,
        draws: 0,
        points: 0,
    };

    const winRate = stats.gamesPlayed > 0
        ? ((stats.wins / stats.gamesPlayed) * 100).toFixed(1)
        : '0.0';

    return (
        <div className="row g-4">
            {/* Stats Overview */}
            <div className="col-12">
                <div className="profile-card">
                    <div className="profile-card-header">
                        <h5>
                            <i className="fas fa-chart-bar"></i>
                            Performance Overview
                        </h5>
                    </div>
                    <div className="profile-card-body">
                        <div className="stat-cards">
                            <div className="stat-card">
                                <div className="stat-card-icon purple">
                                    <i className="fas fa-gamepad"></i>
                                </div>
                                <div className="stat-card-value">{stats.gamesPlayed}</div>
                                <div className="stat-card-label">Games Played</div>
                            </div>
                            <div className="stat-card">
                                <div className="stat-card-icon green">
                                    <i className="fas fa-trophy"></i>
                                </div>
                                <div className="stat-card-value">{stats.wins}</div>
                                <div className="stat-card-label">Wins</div>
                            </div>
                            <div className="stat-card">
                                <div className="stat-card-icon red">
                                    <i className="fas fa-times-circle"></i>
                                </div>
                                <div className="stat-card-value">{stats.losses}</div>
                                <div className="stat-card-label">Losses</div>
                            </div>
                            <div className="stat-card">
                                <div className="stat-card-icon gold">
                                    <i className="fas fa-percentage"></i>
                                </div>
                                <div className="stat-card-value">{winRate}%</div>
                                <div className="stat-card-label">Win Rate</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Win Rate Visual */}
            <div className="col-12">
                <div className="profile-card">
                    <div className="profile-card-header">
                        <h5>
                            <i className="fas fa-chart-pie"></i>
                            Win/Loss Breakdown
                        </h5>
                    </div>
                    <div className="profile-card-body">
                        {stats.gamesPlayed > 0 ? (
                            <>
                                {/* Visual bar */}
                                <div
                                    className="d-flex rounded overflow-hidden mb-3"
                                    style={{ height: '32px' }}
                                >
                                    {stats.wins > 0 && (
                                        <div
                                            style={{
                                                width: `${(stats.wins / stats.gamesPlayed) * 100}%`,
                                                background: '#28a745',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                color: '#fff',
                                                fontSize: '0.8rem',
                                                fontWeight: 500,
                                                minWidth: stats.wins > 0 ? '30px' : 0
                                            }}
                                        >
                                            {stats.wins}
                                        </div>
                                    )}
                                    {stats.losses > 0 && (
                                        <div
                                            style={{
                                                width: `${(stats.losses / stats.gamesPlayed) * 100}%`,
                                                background: '#dc3545',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                color: '#fff',
                                                fontSize: '0.8rem',
                                                fontWeight: 500,
                                                minWidth: stats.losses > 0 ? '30px' : 0
                                            }}
                                        >
                                            {stats.losses}
                                        </div>
                                    )}
                                    {stats.draws > 0 && (
                                        <div
                                            style={{
                                                width: `${(stats.draws / stats.gamesPlayed) * 100}%`,
                                                background: '#6c757d',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                color: '#fff',
                                                fontSize: '0.8rem',
                                                fontWeight: 500,
                                                minWidth: stats.draws > 0 ? '30px' : 0
                                            }}
                                        >
                                            {stats.draws}
                                        </div>
                                    )}
                                </div>

                                {/* Legend */}
                                <div className="d-flex flex-wrap gap-3">
                                    <div className="d-flex align-items-center gap-2">
                                        <div style={{ width: '12px', height: '12px', borderRadius: '3px', background: '#28a745' }}></div>
                                        <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                            Wins ({stats.wins})
                                        </span>
                                    </div>
                                    <div className="d-flex align-items-center gap-2">
                                        <div style={{ width: '12px', height: '12px', borderRadius: '3px', background: '#dc3545' }}></div>
                                        <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                            Losses ({stats.losses})
                                        </span>
                                    </div>
                                    {stats.draws > 0 && (
                                        <div className="d-flex align-items-center gap-2">
                                            <div style={{ width: '12px', height: '12px', borderRadius: '3px', background: '#6c757d' }}></div>
                                            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                                Draws ({stats.draws})
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </>
                        ) : (
                            <div className="text-center py-4 text-muted">
                                <i className="fas fa-chart-pie fa-3x mb-3 opacity-50"></i>
                                <p className="mb-0">No games played yet</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Current Commander */}
            <div className="col-12">
                <div className="profile-card">
                    <div className="profile-card-header">
                        <h5>
                            <i className="fas fa-hat-wizard"></i>
                            Current Commander
                        </h5>
                    </div>
                    <div className="profile-card-body">
                        {(currentLeague?.commander_name || currentLeague?.current_commander) ? (
                            <div className="d-flex align-items-start gap-4">
                                {currentLeague.commander_scryfall_id && (
                                    <img
                                        src={`https://cards.scryfall.io/normal/front/${currentLeague.commander_scryfall_id.charAt(0)}/${currentLeague.commander_scryfall_id.charAt(1)}/${currentLeague.commander_scryfall_id}.jpg`}
                                        alt={currentLeague.commander_name || 'Commander'}
                                        style={{
                                            width: '140px',
                                            borderRadius: '8px',
                                            boxShadow: '0 4px 12px rgba(0,0,0,0.4)'
                                        }}
                                        onError={(e) => {
                                            e.target.style.display = 'none';
                                        }}
                                    />
                                )}
                                <div className="flex-grow-1">
                                    <h4 style={{ marginBottom: '0.5rem', color: 'var(--text-primary)' }}>
                                        {currentLeague.commander_name || (
                                            <CommanderDisplay
                                                commanderId={currentLeague.current_commander}
                                                showPartner={false}
                                            />
                                        )}
                                    </h4>
                                    {(currentLeague.partner_name || currentLeague.commander_partner) && (
                                        <p style={{ color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
                                            Partner: {currentLeague.partner_name || (
                                                <CommanderDisplay
                                                    commanderId={currentLeague.commander_partner}
                                                    showPartner={false}
                                                />
                                            )}
                                        </p>
                                    )}
                                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                                        Playing in {currentLeague?.name || 'current league'}
                                    </p>
                                    {currentLeague.decklistUrl && (
                                        <a
                                            href={currentLeague.decklistUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="btn"
                                            style={{
                                                background: 'var(--brand-purple)',
                                                color: '#fff',
                                                padding: '0.5rem 1rem',
                                                borderRadius: '6px',
                                                fontWeight: 500,
                                                fontSize: '0.9rem'
                                            }}
                                        >
                                            <i className="fas fa-external-link-alt me-2"></i>
                                            View Decklist
                                        </a>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="text-center py-4 text-muted">
                                <i className="fas fa-hat-wizard fa-3x mb-3 opacity-50"></i>
                                <p className="mb-0">No commander registered for current league</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

StatisticsTab.propTypes = {
    user: PropTypes.shape({
        most_common_win_condition: PropTypes.string,
        current_commander: PropTypes.string,
        past_commanders: PropTypes.arrayOf(PropTypes.string),
        opponent_win_percentage: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    }).isRequired,
    currentLeague: PropTypes.shape({
        league_wins: PropTypes.number,
        league_losses: PropTypes.number,
        league_draws: PropTypes.number,
        total_points: PropTypes.number,
        rank: PropTypes.number,
        current_commander: PropTypes.string,
        commander_partner: PropTypes.string,
    }),
};

export default StatisticsTab;
