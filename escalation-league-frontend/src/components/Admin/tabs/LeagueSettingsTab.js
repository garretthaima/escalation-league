import React, { useState } from 'react';
import { useToast } from '../../../context/ToastContext';
import { syncLeagueDecks } from '../../../api/metagameApi';
import { formatDate } from '../../../utils/dateFormatter';
import EditLeagueModal from '../EditLeagueModal';
import './LeagueSettingsTab.css';

const LeagueSettingsTab = ({ leagueId, league, onUpdate }) => {
    const { showToast } = useToast();
    const [showEditModal, setShowEditModal] = useState(false);
    const [syncingDecks, setSyncingDecks] = useState(false);

    const handleSyncDecks = async () => {
        if (syncingDecks) return;

        try {
            setSyncingDecks(true);
            const result = await syncLeagueDecks(leagueId);
            showToast(
                `Deck sync complete: ${result.updated} updated, ${result.skipped} up-to-date, ${result.errors} errors`,
                result.errors > 0 ? 'warning' : 'success'
            );
        } catch (err) {
            showToast('Failed to sync decks. Please try again.', 'error');
        } finally {
            setSyncingDecks(false);
        }
    };

    const handleEditClose = () => {
        setShowEditModal(false);
    };

    const handleLeagueUpdate = () => {
        onUpdate();
    };

    if (!league) {
        return (
            <div className="text-center py-5">
                <div className="spinner-border" role="status">
                    <span className="visually-hidden">Loading...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="league-settings-tab">
            {/* League Details Card */}
            <div className="settings-card">
                <div className="settings-card-header">
                    <h5>
                        <i className="fas fa-info-circle me-2"></i>
                        League Details
                    </h5>
                    <button
                        className="btn btn-outline-primary btn-sm"
                        onClick={() => setShowEditModal(true)}
                    >
                        <i className="fas fa-edit me-1"></i>
                        Edit
                    </button>
                </div>
                <div className="settings-card-body">
                    <div className="settings-grid">
                        <div className="settings-item">
                            <label>Name</label>
                            <span>{league.name}</span>
                        </div>
                        <div className="settings-item">
                            <label>Status</label>
                            <span>
                                {league.is_active ? (
                                    <span className="badge bg-success">
                                        <i className="fas fa-star me-1"></i>
                                        Active
                                    </span>
                                ) : (
                                    <span className="badge bg-secondary">Inactive</span>
                                )}
                            </span>
                        </div>
                        <div className="settings-item">
                            <label>Phase</label>
                            <span>
                                {league.league_phase === 'regular_season' && (
                                    <span className="badge bg-info">Regular Season</span>
                                )}
                                {league.league_phase === 'tournament' && (
                                    <span className="badge bg-warning text-dark">Tournament</span>
                                )}
                                {league.league_phase === 'completed' && (
                                    <span className="badge bg-success">Completed</span>
                                )}
                            </span>
                        </div>
                        <div className="settings-item">
                            <label>Start Date</label>
                            <span>{formatDate(league.start_date)}</span>
                        </div>
                        <div className="settings-item">
                            <label>End Date</label>
                            <span>{formatDate(league.end_date)}</span>
                        </div>
                        <div className="settings-item">
                            <label>Duration</label>
                            <span>{league.number_of_weeks || 'N/A'} weeks</span>
                        </div>
                        <div className="settings-item">
                            <label>Weekly Budget</label>
                            <span>${league.weekly_budget || 0}</span>
                        </div>
                        <div className="settings-item">
                            <label>Participants</label>
                            <span>{league.participant_count || 0} players</span>
                        </div>
                        {league.description && (
                            <div className="settings-item settings-item-full">
                                <label>Description</label>
                                <span>{league.description}</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Quick Actions Card */}
            <div className="settings-card">
                <div className="settings-card-header">
                    <h5>
                        <i className="fas fa-bolt me-2"></i>
                        Quick Actions
                    </h5>
                </div>
                <div className="settings-card-body">
                    <div className="quick-actions">
                        <div className="quick-action-item">
                            <div className="quick-action-info">
                                <h6>
                                    <i className="fas fa-sync-alt me-2 text-info"></i>
                                    Sync All Decks
                                </h6>
                                <p className="text-muted small mb-0">
                                    Refresh deck data from Moxfield/Archidekt for all participants
                                </p>
                            </div>
                            <button
                                className="btn btn-outline-info"
                                onClick={handleSyncDecks}
                                disabled={syncingDecks}
                            >
                                {syncingDecks ? (
                                    <>
                                        <span className="spinner-border spinner-border-sm me-2"></span>
                                        Syncing...
                                    </>
                                ) : (
                                    <>
                                        <i className="fas fa-sync-alt me-1"></i>
                                        Sync Decks
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Edit League Modal */}
            <EditLeagueModal
                show={showEditModal}
                onHide={handleEditClose}
                league={league}
                onUpdate={handleLeagueUpdate}
            />
        </div>
    );
};

export default LeagueSettingsTab;
