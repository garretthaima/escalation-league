import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../../../context/ToastContext';
import { useWebSocket } from '../../../context/WebSocketProvider';
import {
    getLeagues,
    setActiveLeague,
    getSignupRequests,
    approveSignupRequest,
    rejectSignupRequest,
} from '../../../api/leaguesApi';
import { getLeagueParticipants, updateParticipantStatus } from '../../../api/userLeaguesApi';
import { syncLeagueDecks } from '../../../api/metagameApi';
import { formatDate } from '../../../utils/dateFormatter';
import CollapsibleSection from '../../Shared/CollapsibleSection';
import EditLeagueModal from '../EditLeagueModal';
import './SettingsAdminTab.css';

// Stat Card Component
const StatCard = ({ icon, label, value, variant = 'default', onClick }) => (
    <div
        className={`stat-card stat-card-${variant} ${onClick ? 'stat-card-clickable' : ''}`}
        onClick={onClick}
        role={onClick ? 'button' : undefined}
        tabIndex={onClick ? 0 : undefined}
    >
        <i className={`fas ${icon} stat-card-icon`}></i>
        <div className="stat-card-value">{value}</div>
        <div className="stat-card-label">{label}</div>
    </div>
);

// Alert Banner Component
const AlertBanner = ({ icon, message, actionLabel, onAction, variant = 'warning' }) => (
    <div className={`alert-banner alert-banner-${variant}`}>
        <div className="alert-banner-content">
            <i className={`fas ${icon} me-2`}></i>
            <span>{message}</span>
        </div>
        {actionLabel && onAction && (
            <button className="btn btn-sm btn-outline-dark" onClick={onAction}>
                {actionLabel}
            </button>
        )}
    </div>
);

// League Card Component
const LeagueCard = ({
    league,
    onEdit,
    onManagePlayers,
    onSyncDecks,
    onSetActive,
    syncingLeagueId
}) => {
    const calculateCurrentWeek = () => {
        if (!league.start_date) return null;
        const start = new Date(league.start_date);
        const now = new Date();
        const diffTime = now - start;
        const diffWeeks = Math.floor(diffTime / (1000 * 60 * 60 * 24 * 7)) + 1;
        return Math.max(1, Math.min(diffWeeks, league.number_of_weeks || diffWeeks));
    };

    const currentWeek = calculateCurrentWeek();
    const isSyncing = syncingLeagueId === league.id;

    return (
        <div className={`league-card ${league.is_active ? 'league-card-active' : ''}`}>
            <div className="league-card-header">
                <div className="league-card-title">
                    <h5>{league.name}</h5>
                    {league.is_active && (
                        <span className="badge bg-success ms-2">
                            <i className="fas fa-star me-1"></i>Active
                        </span>
                    )}
                </div>
                {league.league_phase && league.league_phase !== 'regular_season' && (
                    <span className="badge bg-warning text-dark">
                        <i className="fas fa-trophy me-1"></i>
                        {league.league_phase === 'tournament' ? 'Tournament' : league.league_phase}
                    </span>
                )}
            </div>
            <div className="league-card-body">
                <div className="league-card-stats">
                    {league.is_active && currentWeek && league.number_of_weeks && (
                        <div className="league-stat">
                            <i className="fas fa-calendar-week me-1"></i>
                            Week {currentWeek} of {league.number_of_weeks}
                        </div>
                    )}
                    <div className="league-stat">
                        <i className="fas fa-calendar me-1"></i>
                        {formatDate(league.start_date)} - {formatDate(league.end_date)}
                    </div>
                    <div className="league-stat">
                        <i className="fas fa-coins me-1"></i>
                        ${league.weekly_budget || 0}/week budget
                    </div>
                </div>
            </div>
            <div className="league-card-footer">
                <button
                    className="btn btn-outline-secondary btn-sm"
                    onClick={() => onEdit(league)}
                    title="Edit league settings"
                >
                    <i className="fas fa-edit me-1"></i>
                    Edit
                </button>
                <button
                    className="btn btn-outline-primary btn-sm"
                    onClick={() => onManagePlayers(league)}
                    title="Manage league players"
                >
                    <i className="fas fa-users me-1"></i>
                    Players
                </button>
                <button
                    className="btn btn-outline-info btn-sm"
                    onClick={() => onSyncDecks(league.id)}
                    disabled={syncingLeagueId !== null}
                    title="Refresh deck data from Moxfield/Archidekt"
                >
                    <i className={`fas fa-sync-alt ${isSyncing ? 'fa-spin' : ''} me-1`}></i>
                    {isSyncing ? 'Syncing...' : 'Sync'}
                </button>
                {!league.is_active && (
                    <button
                        className="btn btn-primary btn-sm"
                        onClick={() => onSetActive(league.id)}
                        title="Set as active league"
                    >
                        <i className="fas fa-check me-1"></i>
                        Activate
                    </button>
                )}
            </div>
        </div>
    );
};

// Signup Request Card Component
const SignupRequestCard = ({ request, onApprove, onReject, isProcessing }) => (
    <div className="signup-request-card">
        <div className="signup-request-info">
            <div className="signup-request-user">
                <i className="fas fa-user-circle signup-request-avatar"></i>
                <div className="signup-request-details">
                    <strong>{request.firstname} {request.lastname}</strong>
                    <span className="text-muted">{request.email}</span>
                </div>
            </div>
            <span className="badge bg-secondary">
                <i className="fas fa-trophy me-1"></i>
                {request.league_name}
            </span>
        </div>
        <div className="signup-request-actions">
            <button
                className="btn btn-success btn-sm"
                onClick={() => onApprove(request.id)}
                disabled={isProcessing}
                title="Approve request"
            >
                <i className="fas fa-check me-1"></i>
                Approve
            </button>
            <button
                className="btn btn-danger btn-sm"
                onClick={() => onReject(request.id)}
                disabled={isProcessing}
                title="Reject request"
            >
                <i className="fas fa-times me-1"></i>
                Reject
            </button>
        </div>
    </div>
);

// Player Card Component (for participants modal)
const PlayerCard = ({ participant, leagueId, onToggleStatus, onToggleDQ }) => (
    <div className={`player-card ${participant.disqualified ? 'player-card-dq' : ''} ${!participant.is_active ? 'player-card-inactive' : ''}`}>
        <div className="player-card-info">
            <div className="player-card-name">
                <strong>{participant.firstname} {participant.lastname}</strong>
                <div className="player-card-badges">
                    {participant.is_active ? (
                        <span className="badge bg-success badge-sm">Active</span>
                    ) : (
                        <span className="badge bg-secondary badge-sm">Inactive</span>
                    )}
                    {participant.disqualified && (
                        <span className="badge bg-danger badge-sm">DQ</span>
                    )}
                </div>
            </div>
            <div className="player-card-stats">
                <span className="player-stat">
                    <i className="fas fa-trophy text-success me-1"></i>
                    {participant.league_wins || 0}W
                </span>
                <span className="player-stat">
                    <i className="fas fa-skull text-danger me-1"></i>
                    {participant.league_losses || 0}L
                </span>
                {participant.league_draws > 0 && (
                    <span className="player-stat">
                        <i className="fas fa-handshake text-warning me-1"></i>
                        {participant.league_draws}D
                    </span>
                )}
            </div>
        </div>
        <div className="player-card-actions">
            <button
                className={`btn btn-sm ${participant.is_active ? 'btn-outline-warning' : 'btn-outline-success'}`}
                onClick={() => onToggleStatus(leagueId, participant.user_id, participant.is_active)}
                title={participant.is_active ? 'Deactivate player' : 'Activate player'}
            >
                <i className={`fas ${participant.is_active ? 'fa-pause' : 'fa-play'}`}></i>
            </button>
            <button
                className={`btn btn-sm ${participant.disqualified ? 'btn-outline-info' : 'btn-outline-danger'}`}
                onClick={() => onToggleDQ(leagueId, participant.user_id, participant.disqualified)}
                title={participant.disqualified ? 'Reinstate player' : 'Disqualify player'}
            >
                <i className={`fas ${participant.disqualified ? 'fa-undo' : 'fa-ban'}`}></i>
            </button>
        </div>
    </div>
);

// Participants Modal Component
const ParticipantsModal = ({
    show,
    league,
    participants,
    onClose,
    onToggleStatus,
    onToggleDQ,
    loading
}) => {
    const [searchTerm, setSearchTerm] = useState('');
    const modalRef = useRef(null);

    useEffect(() => {
        if (show) {
            setSearchTerm('');
        }
    }, [show]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (modalRef.current && !modalRef.current.contains(event.target)) {
                onClose();
            }
        };

        const handleEscKey = (event) => {
            if (event.key === 'Escape') {
                onClose();
            }
        };

        if (show) {
            document.addEventListener('mousedown', handleClickOutside);
            document.addEventListener('keydown', handleEscKey);
            document.body.style.overflow = 'hidden';
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleEscKey);
            document.body.style.overflow = 'unset';
        };
    }, [show, onClose]);

    if (!show) return null;

    const filteredParticipants = participants.filter(p =>
        `${p.firstname} ${p.lastname}`.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="participants-modal-overlay">
            <div className="participants-modal" ref={modalRef}>
                <div className="participants-modal-header">
                    <h5>
                        <i className="fas fa-users me-2"></i>
                        Manage Players - {league?.name}
                    </h5>
                    <button className="btn btn-close" onClick={onClose}></button>
                </div>
                <div className="participants-modal-body">
                    <div className="participants-search">
                        <i className="fas fa-search"></i>
                        <input
                            type="text"
                            className="form-control"
                            placeholder="Search players..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    {loading ? (
                        <div className="text-center py-4">
                            <div className="spinner-border" role="status">
                                <span className="visually-hidden">Loading...</span>
                            </div>
                        </div>
                    ) : filteredParticipants.length === 0 ? (
                        <div className="text-center text-muted py-4">
                            {searchTerm ? 'No players match your search' : 'No participants in this league'}
                        </div>
                    ) : (
                        <div className="participants-list">
                            {filteredParticipants.map((participant) => (
                                <PlayerCard
                                    key={participant.user_id}
                                    participant={participant}
                                    leagueId={league.id}
                                    onToggleStatus={onToggleStatus}
                                    onToggleDQ={onToggleDQ}
                                />
                            ))}
                        </div>
                    )}
                </div>
                <div className="participants-modal-footer">
                    <span className="text-muted">
                        {filteredParticipants.length} player{filteredParticipants.length !== 1 ? 's' : ''}
                    </span>
                    <button className="btn btn-secondary" onClick={onClose}>
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};

// Main Settings Admin Tab component
const SettingsAdminTab = () => {
    const navigate = useNavigate();
    const { showToast } = useToast();
    const { socket, connected, joinLeague, leaveLeague } = useWebSocket();

    // State
    const [leagues, setLeagues] = useState([]);
    const [signupRequests, setSignupRequests] = useState([]);
    const [participants, setParticipants] = useState([]);
    const [selectedLeague, setSelectedLeague] = useState(null);
    const [loading, setLoading] = useState(false);
    const [participantsLoading, setParticipantsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [showEditModal, setShowEditModal] = useState(false);
    const [editingLeague, setEditingLeague] = useState(null);
    const [syncingLeagueId, setSyncingLeagueId] = useState(null);
    const [processingRequestId, setProcessingRequestId] = useState(null);
    const [showParticipantsModal, setShowParticipantsModal] = useState(false);
    const signupsSectionRef = useRef(null);

    // Calculate stats
    const activeLeague = leagues.find(l => l.is_active);
    const totalPlayers = leagues.reduce((sum, l) => sum + (l.participant_count || 0), 0);

    // Fetch data on mount
    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            const [leaguesData, signupRequestsData] = await Promise.all([
                getLeagues(),
                getSignupRequests()
            ]);
            setLeagues(leaguesData);
            setSignupRequests(signupRequestsData);
        } catch (err) {
            setError('Failed to fetch data. Please try again.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // WebSocket listeners for real-time signup request updates
    useEffect(() => {
        if (!socket || !connected || leagues.length === 0) return;

        // Join all league rooms to receive signup requests
        leagues.forEach(league => {
            joinLeague(league.id);
        });

        // Listen for new signup requests
        const handleSignupRequest = (requestData) => {
            setSignupRequests(prev => [...prev, requestData]);
            showToast('New league signup request received!', 'info');
        };

        socket.on('league:signup_request', handleSignupRequest);

        // Cleanup
        return () => {
            socket.off('league:signup_request', handleSignupRequest);
            leagues.forEach(league => {
                leaveLeague(league.id);
            });
        };
    }, [socket, connected, leagues, joinLeague, leaveLeague, showToast]);

    // Handlers
    const handleSetActiveLeague = async (leagueId) => {
        try {
            await setActiveLeague(leagueId);
            showToast('League set as active successfully!', 'success');
            setLeagues((prev) =>
                prev.map((league) =>
                    league.id === leagueId
                        ? { ...league, is_active: true }
                        : { ...league, is_active: false }
                )
            );
        } catch (err) {
            showToast('Failed to set league as active. Please try again.', 'error');
        }
    };

    const handleApproveRequest = async (requestId) => {
        try {
            setProcessingRequestId(requestId);
            await approveSignupRequest(requestId);
            showToast('Signup request approved!', 'success');
            setSignupRequests((prev) => prev.filter((req) => req.id !== requestId));
        } catch (err) {
            showToast('Failed to approve signup request. Please try again.', 'error');
        } finally {
            setProcessingRequestId(null);
        }
    };

    const handleRejectRequest = async (requestId) => {
        try {
            setProcessingRequestId(requestId);
            await rejectSignupRequest(requestId);
            showToast('Signup request rejected!', 'success');
            setSignupRequests((prev) => prev.filter((req) => req.id !== requestId));
        } catch (err) {
            showToast('Failed to reject signup request. Please try again.', 'error');
        } finally {
            setProcessingRequestId(null);
        }
    };

    const handleEditLeague = (league) => {
        setEditingLeague(league);
        setShowEditModal(true);
    };

    const handleCloseEditModal = () => {
        setShowEditModal(false);
        setEditingLeague(null);
    };

    const handleLeagueUpdate = () => {
        fetchData();
    };

    const handleViewParticipants = async (league) => {
        try {
            setSelectedLeague(league);
            setShowParticipantsModal(true);
            setParticipantsLoading(true);
            const participantsData = await getLeagueParticipants(league.id);
            setParticipants(participantsData);
        } catch (err) {
            showToast('Failed to fetch participants. Please try again.', 'error');
        } finally {
            setParticipantsLoading(false);
        }
    };

    const handleCloseParticipantsModal = () => {
        setShowParticipantsModal(false);
        setSelectedLeague(null);
        setParticipants([]);
    };

    const handleToggleParticipantStatus = async (leagueId, userId, currentStatus) => {
        try {
            await updateParticipantStatus(leagueId, userId, { is_active: currentStatus ? 0 : 1 });
            showToast(`Participant ${currentStatus ? 'deactivated' : 'activated'} successfully!`, 'success');
            // Refresh participants list
            const participantsData = await getLeagueParticipants(leagueId);
            setParticipants(participantsData);
        } catch (err) {
            showToast('Failed to update participant status. Please try again.', 'error');
        }
    };

    const handleToggleDisqualified = async (leagueId, userId, currentStatus) => {
        try {
            await updateParticipantStatus(leagueId, userId, { disqualified: currentStatus ? 0 : 1 });
            showToast(`Participant ${currentStatus ? 'reinstated' : 'disqualified'} successfully!`, 'success');
            // Refresh participants list
            const participantsData = await getLeagueParticipants(leagueId);
            setParticipants(participantsData);
        } catch (err) {
            showToast('Failed to update participant status. Please try again.', 'error');
        }
    };

    const handleSyncLeagueDecks = async (leagueId) => {
        if (syncingLeagueId) return;

        try {
            setSyncingLeagueId(leagueId);
            const result = await syncLeagueDecks(leagueId);
            showToast(
                `Deck sync complete: ${result.updated} updated, ${result.skipped} up-to-date, ${result.errors} errors`,
                result.errors > 0 ? 'warning' : 'success'
            );
        } catch (err) {
            showToast('Failed to sync decks. Please try again.', 'error');
        } finally {
            setSyncingLeagueId(null);
        }
    };

    const scrollToSignups = () => {
        signupsSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    // Render
    if (loading) {
        return (
            <div className="text-center py-5">
                <div className="spinner-border" role="status">
                    <span className="visually-hidden">Loading...</span>
                </div>
            </div>
        );
    }

    if (error) {
        return <div className="alert alert-danger">{error}</div>;
    }

    return (
        <div className="settings-dashboard">
            {/* Header */}
            <div className="settings-dashboard-header">
                <div>
                    <h4 className="mb-1">
                        <i className="fas fa-cog me-2"></i>
                        League Administration
                    </h4>
                    <p className="text-muted mb-0">Manage leagues, players, and signup requests</p>
                </div>
                <button
                    className="btn btn-primary"
                    onClick={() => navigate('/admin/leagues/create')}
                >
                    <i className="fas fa-plus me-2"></i>
                    Create League
                </button>
            </div>

            {/* Alert Banner for Pending Signups */}
            {signupRequests.length > 0 && (
                <AlertBanner
                    icon="fa-user-plus"
                    message={`${signupRequests.length} pending signup request${signupRequests.length !== 1 ? 's' : ''} require${signupRequests.length === 1 ? 's' : ''} attention`}
                    actionLabel="View Requests"
                    onAction={scrollToSignups}
                    variant="warning"
                />
            )}

            {/* Stats Row */}
            <div className="stats-row">
                <StatCard
                    icon="fa-trophy"
                    label="Total Leagues"
                    value={leagues.length}
                    variant="primary"
                />
                <StatCard
                    icon="fa-star"
                    label="Active League"
                    value={activeLeague?.name || 'None'}
                    variant="success"
                />
                <StatCard
                    icon="fa-users"
                    label="Total Players"
                    value={totalPlayers}
                    variant="info"
                />
                <StatCard
                    icon="fa-user-plus"
                    label="Pending Requests"
                    value={signupRequests.length}
                    variant={signupRequests.length > 0 ? 'warning' : 'default'}
                    onClick={signupRequests.length > 0 ? scrollToSignups : undefined}
                />
            </div>

            {/* Leagues Section */}
            <CollapsibleSection
                title="Leagues"
                icon="fas fa-trophy"
                badge={leagues.length}
                defaultOpen={true}
            >
                {leagues.length === 0 ? (
                    <div className="text-center text-muted py-4">
                        <i className="fas fa-trophy fa-3x mb-3 opacity-50"></i>
                        <p>No leagues created yet.</p>
                        <button
                            className="btn btn-primary"
                            onClick={() => navigate('/admin/leagues/create')}
                        >
                            <i className="fas fa-plus me-2"></i>
                            Create Your First League
                        </button>
                    </div>
                ) : (
                    <div className="league-cards-grid">
                        {leagues.map((league) => (
                            <LeagueCard
                                key={league.id}
                                league={league}
                                onEdit={handleEditLeague}
                                onManagePlayers={handleViewParticipants}
                                onSyncDecks={handleSyncLeagueDecks}
                                onSetActive={handleSetActiveLeague}
                                syncingLeagueId={syncingLeagueId}
                            />
                        ))}
                    </div>
                )}
            </CollapsibleSection>

            {/* Signup Requests Section */}
            <div ref={signupsSectionRef}>
                <CollapsibleSection
                    title="Pending Signup Requests"
                    icon="fas fa-user-plus"
                    badge={signupRequests.length}
                    defaultOpen={signupRequests.length > 0}
                >
                    {signupRequests.length === 0 ? (
                        <div className="text-center text-muted py-4">
                            <i className="fas fa-check-circle fa-3x mb-3 opacity-50"></i>
                            <p>No pending signup requests. All caught up!</p>
                        </div>
                    ) : (
                        <div className="signup-requests-list">
                            {signupRequests.map((request) => (
                                <SignupRequestCard
                                    key={request.id}
                                    request={request}
                                    onApprove={handleApproveRequest}
                                    onReject={handleRejectRequest}
                                    isProcessing={processingRequestId === request.id}
                                />
                            ))}
                        </div>
                    )}
                </CollapsibleSection>
            </div>

            {/* Participants Modal */}
            <ParticipantsModal
                show={showParticipantsModal}
                league={selectedLeague}
                participants={participants}
                onClose={handleCloseParticipantsModal}
                onToggleStatus={handleToggleParticipantStatus}
                onToggleDQ={handleToggleDisqualified}
                loading={participantsLoading}
            />

            {/* Edit League Modal */}
            <EditLeagueModal
                show={showEditModal}
                onHide={handleCloseEditModal}
                league={editingLeague}
                onUpdate={handleLeagueUpdate}
            />
        </div>
    );
};

export default SettingsAdminTab;
