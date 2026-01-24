import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    getLeagues,
    setActiveLeague,
    getSignupRequests,
    approveSignupRequest,
    rejectSignupRequest,
} from '../../api/leaguesApi';
import { getLeagueParticipants, updateParticipantStatus } from '../../api/userLeaguesApi';
import { useToast } from '../../context/ToastContext';
import { useWebSocket } from '../../context/WebSocketProvider';
import EditLeagueModal from './EditLeagueModal';

const LeagueAdminPage = () => {
    const navigate = useNavigate();
    const [leagues, setLeagues] = useState([]);
    const [signupRequests, setSignupRequests] = useState([]);
    const [participants, setParticipants] = useState([]);
    const [selectedLeagueId, setSelectedLeagueId] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [showEditModal, setShowEditModal] = useState(false);
    const [selectedLeague, setSelectedLeague] = useState(null);
    const { showToast } = useToast();
    const { socket, connected, joinLeague, leaveLeague } = useWebSocket();

    // Fetch leagues and signup requests on component mount
    useEffect(() => {
        fetchData();
    }, []);

    // WebSocket listeners for real-time signup request updates
    useEffect(() => {
        if (!socket || !connected || leagues.length === 0) return;

        // Join all league rooms to receive signup requests
        leagues.forEach(league => {
            joinLeague(league.id);
        });

        // Listen for new signup requests
        socket.on('league:signup_request', (requestData) => {
            console.log('New signup request received:', requestData);
            setSignupRequests(prev => [...prev, requestData]);
            showToast('New league signup request received!', 'info');
        });

        // Cleanup
        return () => {
            if (socket) {
                socket.off('league:signup_request');
            }
            leagues.forEach(league => {
                leaveLeague(league.id);
            });
        };
    }, [socket, connected, leagues, joinLeague, leaveLeague, showToast]);

    const fetchData = async () => {
        try {
            setLoading(true);
            const leaguesData = await getLeagues();
            const signupRequestsData = await getSignupRequests();
            setLeagues(leaguesData);
            setSignupRequests(signupRequestsData);
        } catch (err) {
            setError('Failed to fetch data. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    // Handle setting a league as active
    const handleSetActiveLeague = async (leagueId) => {
        try {
            await setActiveLeague(leagueId);
            showToast('League set as active successfully!', 'success');
            setLeagues((prev) =>
                prev.map((league) =>
                    league.id === leagueId ? { ...league, is_active: true } : { ...league, is_active: false }
                )
            );
        } catch (err) {
            showToast('Failed to set league as active. Please try again.', 'error');
        }
    };

    // Handle approving a signup request
    const handleApproveRequest = async (requestId) => {
        try {
            await approveSignupRequest(requestId);
            showToast('Signup request approved!', 'success');
            // Remove from local state immediately (no refetch needed)
            setSignupRequests((prev) => prev.filter((req) => req.id !== requestId));
        } catch (err) {
            showToast('Failed to approve signup request. Please try again.', 'error');
        }
    };

    // Handle rejecting a signup request
    const handleRejectRequest = async (requestId) => {
        try {
            await rejectSignupRequest(requestId);
            showToast('Signup request rejected!', 'success');
            // Remove from local state immediately (no refetch needed)
            setSignupRequests((prev) => prev.filter((req) => req.id !== requestId));
        } catch (err) {
            showToast('Failed to reject signup request. Please try again.', 'error');
        }
    };

    // Handle opening edit modal
    const handleEditLeague = (league) => {
        setSelectedLeague(league);
        setShowEditModal(true);
    };

    // Handle closing edit modal
    const handleCloseEditModal = () => {
        setShowEditModal(false);
        setSelectedLeague(null);
    };

    // Handle league update
    const handleLeagueUpdate = () => {
        fetchData(); // Refresh league list
    };

    // Fetch participants for selected league
    const handleViewParticipants = async (leagueId) => {
        try {
            setSelectedLeagueId(leagueId);
            const participantsData = await getLeagueParticipants(leagueId);
            setParticipants(participantsData);
        } catch (err) {
            showToast('Failed to fetch participants. Please try again.', 'error');
        }
    };

    // Handle toggling participant active status
    const handleToggleParticipantStatus = async (leagueId, userId, currentStatus) => {
        try {
            await updateParticipantStatus(leagueId, userId, { is_active: currentStatus ? 0 : 1 });
            showToast(`Participant ${currentStatus ? 'deactivated' : 'activated'} successfully!`, 'success');
            // Refresh participants list
            handleViewParticipants(leagueId);
        } catch (err) {
            showToast('Failed to update participant status. Please try again.', 'error');
        }
    };

    // Handle toggling participant disqualified status
    const handleToggleDisqualified = async (leagueId, userId, currentStatus) => {
        try {
            await updateParticipantStatus(leagueId, userId, { disqualified: currentStatus ? 0 : 1 });
            showToast(`Participant ${currentStatus ? 'reinstated' : 'disqualified'} successfully!`, 'success');
            // Refresh participants list
            handleViewParticipants(leagueId);
        } catch (err) {
            showToast('Failed to update participant status. Please try again.', 'error');
        }
    };

    if (loading) return <div className="text-center mt-4">Loading...</div>;
    if (error) return <div className="alert alert-danger mt-4">{error}</div>;

    return (
        <div className="container mt-4">
            <h2 className="mb-4">League Management</h2>
            <button
                className="btn btn-primary mb-4"
                onClick={() => navigate('/admin/leagues/create')}
            >
                Create League
            </button>

            <div className="mb-5">
                <h3 className="mb-3">Leagues</h3>
                <div className="table-responsive">
                    <table className="table table-striped table-hover">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Name</th>
                                <th>Start Date</th>
                                <th>End Date</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {leagues.map((league) => (
                                <tr key={league.id}>
                                    <td>{league.id}</td>
                                    <td>{league.name}</td>
                                    <td>{league.start_date ? new Date(league.start_date).toLocaleDateString() : 'N/A'}</td>
                                    <td>{league.end_date ? new Date(league.end_date).toLocaleDateString() : 'N/A'}</td>
                                    <td>
                                        {league.is_active ? (
                                            <span className="badge" style={{ backgroundColor: '#495057', color: 'white' }}>
                                                <i className="fas fa-circle me-1"></i>Active
                                            </span>
                                        ) : (
                                            <span className="badge" style={{ backgroundColor: '#adb5bd', color: 'white' }}>
                                                <i className="fas fa-pause-circle me-1"></i>Inactive
                                            </span>
                                        )}
                                    </td>
                                    <td>
                                        <button
                                            className="btn btn-secondary btn-sm me-2"
                                            onClick={() => handleEditLeague(league)}
                                        >
                                            <i className="fas fa-edit me-1"></i>
                                            Edit
                                        </button>
                                        <button
                                            className="btn btn-info btn-sm me-2"
                                            onClick={() => handleViewParticipants(league.id)}
                                        >
                                            <i className="fas fa-users me-1"></i>
                                            Manage Players
                                        </button>
                                        {!league.is_active && (
                                            <button
                                                className="btn btn-primary btn-sm"
                                                onClick={() => handleSetActiveLeague(league.id)}
                                            >
                                                Set Active
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="mb-5">
                <h3 className="mb-3">Signup Requests</h3>
                {signupRequests.length > 0 ? (
                    <div className="table-responsive">
                        <table className="table table-striped table-hover">
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>Name</th>
                                    <th>Email</th>
                                    <th>League</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {signupRequests.map((request) => (
                                    <tr key={request.id}>
                                        <td>{request.id}</td>
                                        <td>{request.firstname} {request.lastname}</td>
                                        <td>{request.email}</td>
                                        <td>{request.league_name}</td>
                                        <td>
                                            <button
                                                className="btn btn-success btn-sm me-2"
                                                onClick={() => handleApproveRequest(request.id)}
                                            >
                                                Approve
                                            </button>
                                            <button
                                                className="btn btn-danger btn-sm"
                                                onClick={() => handleRejectRequest(request.id)}
                                            >
                                                Reject
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <p className="text-muted">No pending signup requests.</p>
                )}
            </div>

            {selectedLeagueId && participants.length > 0 && (
                <div className="mb-5">
                    <h3 className="mb-3">
                        League Participants
                        <button
                            className="btn btn-sm btn-secondary ms-3"
                            onClick={() => {
                                setSelectedLeagueId(null);
                                setParticipants([]);
                            }}
                        >
                            <i className="fas fa-times me-1"></i>
                            Close
                        </button>
                    </h3>
                    <div className="table-responsive">
                        <table className="table table-striped table-hover">
                            <thead>
                                <tr>
                                    <th>User ID</th>
                                    <th>Name</th>
                                    <th>Wins</th>
                                    <th>Losses</th>
                                    <th>Status</th>
                                    <th>Disqualified</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {participants.map((participant) => (
                                    <tr key={participant.user_id}>
                                        <td>{participant.user_id}</td>
                                        <td>{participant.firstname} {participant.lastname}</td>
                                        <td>{participant.league_wins || 0}</td>
                                        <td>{participant.league_losses || 0}</td>
                                        <td>
                                            {participant.is_active ? (
                                                <span className="badge bg-success">Active</span>
                                            ) : (
                                                <span className="badge bg-secondary">Inactive</span>
                                            )}
                                        </td>
                                        <td>
                                            {participant.disqualified ? (
                                                <span className="badge bg-danger">Yes</span>
                                            ) : (
                                                <span className="badge bg-light text-dark">No</span>
                                            )}
                                        </td>
                                        <td>
                                            <button
                                                className={`btn btn-sm me-2 ${participant.is_active ? 'btn-warning' : 'btn-success'}`}
                                                onClick={() => handleToggleParticipantStatus(selectedLeagueId, participant.user_id, participant.is_active)}
                                            >
                                                <i className={`fas ${participant.is_active ? 'fa-pause' : 'fa-play'} me-1`}></i>
                                                {participant.is_active ? 'Deactivate' : 'Activate'}
                                            </button>
                                            <button
                                                className={`btn btn-sm ${participant.disqualified ? 'btn-info' : 'btn-danger'}`}
                                                onClick={() => handleToggleDisqualified(selectedLeagueId, participant.user_id, participant.disqualified)}
                                            >
                                                <i className={`fas ${participant.disqualified ? 'fa-undo' : 'fa-ban'} me-1`}></i>
                                                {participant.disqualified ? 'Reinstate' : 'Disqualify'}
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            <EditLeagueModal
                show={showEditModal}
                onHide={handleCloseEditModal}
                league={selectedLeague}
                onUpdate={handleLeagueUpdate}
            />
        </div>
    );
};

export default LeagueAdminPage;