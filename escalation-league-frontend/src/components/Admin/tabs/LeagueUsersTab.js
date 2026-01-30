import React, { useEffect, useState, useCallback } from 'react';
import { useToast } from '../../../context/ToastContext';
import { useWebSocket } from '../../../context/WebSocketProvider';
import {
    getSignupRequests,
    approveSignupRequest,
    rejectSignupRequest,
} from '../../../api/leaguesApi';
import { getLeagueParticipants, updateParticipantStatus } from '../../../api/userLeaguesApi';
import CollapsibleSection from '../../Shared/CollapsibleSection';
import './LeagueUsersTab.css';

// Player Table Row Component
const PlayerRow = ({ participant, leagueId, onToggleStatus, onToggleDQ }) => {
    const rowClass = participant.disqualified
        ? 'table-danger'
        : !participant.is_active
            ? 'table-secondary'
            : '';

    return (
        <tr className={rowClass}>
            <td>
                <strong>{participant.firstname} {participant.lastname}</strong>
            </td>
            <td className="text-center">
                {participant.is_active ? (
                    <span className="badge bg-success">Active</span>
                ) : (
                    <span className="badge bg-secondary">Inactive</span>
                )}
                {!!participant.disqualified && (
                    <span className="badge bg-danger ms-1">DQ</span>
                )}
            </td>
            <td className="text-center text-success fw-bold">{participant.league_wins || 0}</td>
            <td className="text-center text-danger fw-bold">{participant.league_losses || 0}</td>
            <td className="text-center fw-bold">{participant.total_points || 0}</td>
            <td className="text-end">
                <div className="d-flex gap-2 justify-content-end">
                    <button
                        className={`btn btn-sm ${participant.is_active ? 'btn-outline-warning' : 'btn-outline-success'}`}
                        onClick={() => onToggleStatus(leagueId, participant.user_id, participant.is_active)}
                    >
                        {participant.is_active ? 'Deactivate' : 'Activate'}
                    </button>
                    <button
                        className={`btn btn-sm ${participant.disqualified ? 'btn-outline-success' : 'btn-outline-danger'}`}
                        onClick={() => onToggleDQ(leagueId, participant.user_id, participant.disqualified)}
                    >
                        {participant.disqualified ? 'Reinstate' : 'Disqualify'}
                    </button>
                </div>
            </td>
        </tr>
    );
};

// Signup Request Card Component
const SignupRequestCard = ({ request, onApprove, onReject, isProcessing }) => (
    <div className="user-signup-request-card">
        <div className="user-signup-request-info">
            <div className="user-signup-request-user">
                <i className="fas fa-user-circle user-signup-request-avatar"></i>
                <div className="user-signup-request-details">
                    <strong>{request.firstname} {request.lastname}</strong>
                    <span className="text-muted small">{request.email}</span>
                </div>
            </div>
        </div>
        <div className="user-signup-request-actions">
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

const LeagueUsersTab = ({ leagueId }) => {
    const { showToast } = useToast();
    const { socket, connected, joinLeague, leaveLeague } = useWebSocket();

    // State
    const [participants, setParticipants] = useState([]);
    const [signupRequests, setSignupRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [processingRequestId, setProcessingRequestId] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('all'); // all, active, inactive, dq

    // Fetch data
    const fetchData = useCallback(async () => {
        if (!leagueId) return;

        try {
            setLoading(true);
            const [participantsData, allSignupRequests] = await Promise.all([
                getLeagueParticipants(leagueId),
                getSignupRequests()
            ]);
            setParticipants(participantsData);
            // Filter signup requests for this league only
            const leagueRequests = allSignupRequests.filter(req => req.league_id === leagueId);
            setSignupRequests(leagueRequests);
        } catch (err) {
            console.error('Error fetching users:', err);
            setError('Failed to load users.');
        } finally {
            setLoading(false);
        }
    }, [leagueId]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // WebSocket listeners
    useEffect(() => {
        if (!socket || !connected || !leagueId) return;

        joinLeague(leagueId);

        const handleSignupRequest = (requestData) => {
            if (requestData.league_id === leagueId) {
                setSignupRequests(prev => [...prev, requestData]);
                showToast('New signup request received!', 'info');
            }
        };

        socket.on('league:signup_request', handleSignupRequest);

        return () => {
            socket.off('league:signup_request', handleSignupRequest);
            leaveLeague(leagueId);
        };
    }, [socket, connected, leagueId, joinLeague, leaveLeague, showToast]);

    // Handlers
    const handleApproveRequest = async (requestId) => {
        try {
            setProcessingRequestId(requestId);
            await approveSignupRequest(requestId);
            showToast('Signup request approved!', 'success');
            setSignupRequests((prev) => prev.filter((req) => req.id !== requestId));
            // Refresh participants list
            const participantsData = await getLeagueParticipants(leagueId);
            setParticipants(participantsData);
        } catch (err) {
            showToast('Failed to approve signup request.', 'error');
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
            showToast('Failed to reject signup request.', 'error');
        } finally {
            setProcessingRequestId(null);
        }
    };

    const handleToggleParticipantStatus = async (leagueId, userId, currentStatus) => {
        try {
            await updateParticipantStatus(leagueId, userId, { is_active: currentStatus ? 0 : 1 });
            showToast(`Player ${currentStatus ? 'deactivated' : 'activated'} successfully!`, 'success');
            const participantsData = await getLeagueParticipants(leagueId);
            setParticipants(participantsData);
        } catch (err) {
            showToast('Failed to update player status.', 'error');
        }
    };

    const handleToggleDisqualified = async (leagueId, userId, currentStatus) => {
        try {
            await updateParticipantStatus(leagueId, userId, { disqualified: currentStatus ? 0 : 1 });
            showToast(`Player ${currentStatus ? 'reinstated' : 'disqualified'} successfully!`, 'success');
            const participantsData = await getLeagueParticipants(leagueId);
            setParticipants(participantsData);
        } catch (err) {
            showToast('Failed to update player status.', 'error');
        }
    };

    // Filter participants
    const filteredParticipants = participants.filter(p => {
        const matchesSearch = `${p.firstname} ${p.lastname} ${p.email}`.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesFilter =
            filterStatus === 'all' ||
            (filterStatus === 'active' && p.is_active && !p.disqualified) ||
            (filterStatus === 'inactive' && !p.is_active) ||
            (filterStatus === 'dq' && p.disqualified);
        return matchesSearch && matchesFilter;
    });

    // Stats
    const activeCount = participants.filter(p => p.is_active && !p.disqualified).length;
    const inactiveCount = participants.filter(p => !p.is_active).length;
    const dqCount = participants.filter(p => p.disqualified).length;

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
        <div className="league-users-tab">
            {/* Signup Requests Section - always visible */}
            <CollapsibleSection
                title="Pending Signup Requests"
                icon="fas fa-user-plus"
                badge={signupRequests.length}
                defaultOpen={signupRequests.length > 0}
            >
                {signupRequests.length === 0 ? (
                    <div className="text-center text-muted py-3">
                        <i className="fas fa-check-circle me-2"></i>
                        No pending signup requests
                    </div>
                ) : (
                    <div className="user-signup-requests-list">
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

            {/* Participants Section */}
            <CollapsibleSection
                title="Participants"
                icon="fas fa-users"
                badge={participants.length}
                defaultOpen={true}
            >
                {/* Stats Summary */}
                <div className="user-stats-summary mb-3">
                    <span className="user-stat-badge bg-success text-white">
                        <i className="fas fa-user-check me-1"></i>
                        {activeCount} Active
                    </span>
                    <span className="user-stat-badge bg-secondary text-white">
                        <i className="fas fa-user-clock me-1"></i>
                        {inactiveCount} Inactive
                    </span>
                    <span className="user-stat-badge bg-danger text-white">
                        <i className="fas fa-user-slash me-1"></i>
                        {dqCount} Disqualified
                    </span>
                </div>

                {/* Search and Filter */}
                <div className="user-filters mb-3">
                    <div className="user-search">
                        <i className="fas fa-search"></i>
                        <input
                            type="text"
                            className="form-control"
                            placeholder="Search players..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <select
                        className="form-select user-filter-select"
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                    >
                        <option value="all">All Players</option>
                        <option value="active">Active Only</option>
                        <option value="inactive">Inactive Only</option>
                        <option value="dq">Disqualified Only</option>
                    </select>
                </div>

                {/* Participants Table */}
                {filteredParticipants.length === 0 ? (
                    <div className="text-center text-muted py-4">
                        {searchTerm || filterStatus !== 'all'
                            ? 'No players match your search/filter'
                            : 'No participants in this league yet'}
                    </div>
                ) : (
                    <div className="table-responsive">
                        <table className="table table-hover users-table">
                            <thead>
                                <tr>
                                    <th>Name</th>
                                    <th className="text-center">Status</th>
                                    <th className="text-center">Wins</th>
                                    <th className="text-center">Losses</th>
                                    <th className="text-center">Points</th>
                                    <th className="text-end">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredParticipants.map((participant) => (
                                    <PlayerRow
                                        key={participant.user_id}
                                        participant={participant}
                                        leagueId={leagueId}
                                        onToggleStatus={handleToggleParticipantStatus}
                                        onToggleDQ={handleToggleDisqualified}
                                    />
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </CollapsibleSection>
        </div>
    );
};

export default LeagueUsersTab;
