import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import PropTypes from 'prop-types';
import CommanderDisplay from './CommanderDisplay';
import UpdateCommanderModal from '../../Leagues/UpdateCommanderModal';
import { syncDeck } from '../../../api/decksApi';
import { formatDate, parseDate } from '../../../utils/dateFormatter';

const SYNC_COOLDOWN_SECONDS = 60;

const LeagueTab = ({ currentLeague, onCommanderUpdated }) => {
    const [showCommanderModal, setShowCommanderModal] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);
    const [syncMessage, setSyncMessage] = useState(null);
    const [cooldownRemaining, setCooldownRemaining] = useState(0);
    const syncingRef = useRef(false);
    const cooldownTimerRef = useRef(null);

    // Cleanup cooldown timer on unmount
    useEffect(() => {
        return () => {
            if (cooldownTimerRef.current) {
                clearInterval(cooldownTimerRef.current);
            }
        };
    }, []);

    const startCooldown = useCallback(() => {
        setCooldownRemaining(SYNC_COOLDOWN_SECONDS);
        cooldownTimerRef.current = setInterval(() => {
            setCooldownRemaining(prev => {
                if (prev <= 1) {
                    clearInterval(cooldownTimerRef.current);
                    cooldownTimerRef.current = null;
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
    }, []);

    const handleSyncDeck = async () => {
        // Use ref for immediate check to prevent race conditions
        if (!currentLeague?.deck_id || syncingRef.current || cooldownRemaining > 0) return;

        syncingRef.current = true;
        setIsSyncing(true);
        setSyncMessage(null);

        try {
            const result = await syncDeck(currentLeague.deck_id);
            setSyncMessage({
                type: 'success',
                text: result.wasStale
                    ? `Deck updated: ${result.deck.name}`
                    : 'Deck is already up to date'
            });
            // Refresh profile data to show updated commander info
            if (result.wasStale && onCommanderUpdated) {
                onCommanderUpdated();
            }
            // Start cooldown after successful sync
            startCooldown();
        } catch (error) {
            setSyncMessage({
                type: 'error',
                text: error.response?.data?.error || 'Failed to sync deck'
            });
            // Also start cooldown on error to prevent spamming retries
            startCooldown();
        } finally {
            syncingRef.current = false;
            setIsSyncing(false);
            // Clear message after 5 seconds
            setTimeout(() => setSyncMessage(null), 5000);
        }
    };
    if (!currentLeague) {
        return (
            <div className="profile-card">
                <div className="profile-card-body text-center py-5">
                    <i
                        className="fas fa-trophy fa-4x mb-3 empty-icon-muted"
                    ></i>
                    <h5 className="mb-2">No Active League</h5>
                    <p className="text-muted mb-3">
                        You are not currently participating in any league.
                    </p>
                    <Link
                        to="/leagues"
                        className="btn btn-purple"
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
    const endDate = parseDate(currentLeague.end_date);
    const daysRemaining = Math.ceil((endDate - today) / (1000 * 60 * 60 * 24));

    return (
        <div className="row g-4">
            {/* League Header Card */}
            <div className="col-12">
                <div
                    className="profile-card league-header-gradient"
                >
                    <div className="profile-card-body">
                        <div className="d-flex flex-column flex-md-row justify-content-between align-items-start gap-3">
                            <div>
                                <span
                                    className={`badge mb-2 ${currentLeague.is_active ? 'league-badge-active' : 'league-badge-inactive'}`}
                                >
                                    {currentLeague.is_active ? 'Active' : 'Inactive'}
                                </span>
                                <h3 className="league-header-title">
                                    {currentLeague.name}
                                </h3>
                                <p className="league-header-date">
                                    {formatDate(currentLeague.start_date, { year: undefined })} - {formatDate(currentLeague.end_date)}
                                </p>
                            </div>
                            <div className="d-flex gap-3">
                                {currentLeague.rank && (
                                    <div className="text-center">
                                        <div className="league-stat-display league-stat-display-gold">
                                            #{currentLeague.rank}
                                        </div>
                                        <div className="league-stat-sublabel">
                                            Rank
                                        </div>
                                    </div>
                                )}
                                {daysRemaining > 0 && (
                                    <div className="text-center">
                                        <div className="league-stat-display league-stat-display-white">
                                            {daysRemaining}
                                        </div>
                                        <div className="league-stat-sublabel">
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
                        <div className="d-inline-flex align-items-center justify-content-center mb-2 stat-icon-box stat-icon-box-gold">
                            <i className="fas fa-star fa-lg"></i>
                        </div>
                        <div className="stat-value-lg stat-value-gold">
                            {currentLeague.total_points || 0}
                        </div>
                        <div className="text-sm text-secondary">
                            Total Points
                        </div>
                    </div>
                </div>
            </div>

            <div className="col-md-6 col-lg-3">
                <div className="profile-card h-100">
                    <div className="profile-card-body text-center">
                        <div className="d-inline-flex align-items-center justify-content-center mb-2 stat-icon-box stat-icon-box-green">
                            <i className="fas fa-trophy fa-lg"></i>
                        </div>
                        <div className="stat-value-lg stat-value-green">
                            {currentLeague.league_wins || 0}
                        </div>
                        <div className="text-sm text-secondary">
                            Wins
                        </div>
                    </div>
                </div>
            </div>

            <div className="col-md-6 col-lg-3">
                <div className="profile-card h-100">
                    <div className="profile-card-body text-center">
                        <div className="d-inline-flex align-items-center justify-content-center mb-2 stat-icon-box stat-icon-box-red">
                            <i className="fas fa-times-circle fa-lg"></i>
                        </div>
                        <div className="stat-value-lg stat-value-red">
                            {currentLeague.league_losses || 0}
                        </div>
                        <div className="text-sm text-secondary">
                            Losses
                        </div>
                    </div>
                </div>
            </div>

            <div className="col-md-6 col-lg-3">
                <div className="profile-card h-100">
                    <div className="profile-card-body text-center">
                        <div className="d-inline-flex align-items-center justify-content-center mb-2 stat-icon-box stat-icon-box-purple">
                            <i className="fas fa-chart-line fa-lg"></i>
                        </div>
                        <div className="stat-value-lg stat-value-primary">
                            {currentLeague.elo_rating || 1500}
                        </div>
                        <div className="text-sm text-secondary">
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
                                        className="commander-card-img"
                                        onError={(e) => {
                                            e.target.style.display = 'none';
                                        }}
                                    />
                                )}
                                <div className="flex-grow-1">
                                    <div className="commander-name-text">
                                        {currentLeague.commander_name || (
                                            <CommanderDisplay
                                                commanderId={currentLeague.current_commander}
                                                showPartner={false}
                                            />
                                        )}
                                    </div>
                                    {(currentLeague.partner_name || currentLeague.commander_partner) && (
                                        <div className="commander-partner-text">
                                            Partner: {currentLeague.partner_name || (
                                                <CommanderDisplay
                                                    commanderId={currentLeague.commander_partner}
                                                    showPartner={false}
                                                />
                                            )}
                                        </div>
                                    )}
                                    <div className="d-flex flex-wrap gap-2 mt-2">
                                        {currentLeague.decklistUrl && (
                                            <a
                                                href={currentLeague.decklistUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="btn btn-sm btn-purple"
                                            >
                                                <i className="fas fa-external-link-alt me-1"></i>
                                                View Decklist
                                            </a>
                                        )}
                                        {currentLeague.deck_id && (
                                            <button
                                                onClick={handleSyncDeck}
                                                disabled={isSyncing || cooldownRemaining > 0}
                                                className="btn btn-sm btn-outline-purple"
                                                title={cooldownRemaining > 0 ? `Wait ${cooldownRemaining}s before syncing again` : 'Refresh deck data from Moxfield/Archidekt'}
                                            >
                                                <i className={`fas fa-sync-alt me-1 ${isSyncing ? 'fa-spin' : ''}`}></i>
                                                {isSyncing ? 'Syncing...' : cooldownRemaining > 0 ? `Wait ${cooldownRemaining}s` : 'Sync Deck'}
                                            </button>
                                        )}
                                    </div>
                                    {syncMessage && (
                                        <div className={`mt-2 small ${syncMessage.type === 'success' ? 'text-success' : 'text-danger'}`}>
                                            <i className={`fas ${syncMessage.type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'} me-1`}></i>
                                            {syncMessage.text}
                                        </div>
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
                            className="d-flex align-items-center justify-content-between p-3 text-decoration-none quick-action-item"
                        >
                            <span>
                                <i className="fas fa-chart-line me-2 icon-brand-purple"></i>
                                View Leaderboard
                            </span>
                            <i className="fas fa-chevron-right icon-secondary"></i>
                        </Link>
                        <Link
                            to="/pods"
                            className="d-flex align-items-center justify-content-between p-3 text-decoration-none quick-action-item"
                        >
                            <span>
                                <i className="fas fa-gamepad me-2 icon-brand-purple"></i>
                                View Your Games
                            </span>
                            <i className="fas fa-chevron-right icon-secondary"></i>
                        </Link>
                        <button
                            onClick={() => setShowCommanderModal(true)}
                            className="d-flex align-items-center justify-content-between p-3 text-decoration-none w-100 text-start quick-action-btn cursor-pointer"
                        >
                            <span>
                                <i className="fas fa-hat-wizard me-2 icon-brand-purple"></i>
                                Update Commander
                            </span>
                            <i className="fas fa-chevron-right icon-secondary"></i>
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
        deck_id: PropTypes.string,
    }),
    onCommanderUpdated: PropTypes.func,
};

export default LeagueTab;
