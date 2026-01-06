import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    getLeagues,
    setActiveLeague,
    getSignupRequests,
    approveSignupRequest,
    rejectSignupRequest,
} from '../../api/leaguesApi';
import { useToast } from '../context/ToastContext';
import EditLeagueModal from './EditLeagueModal';

const LeagueAdminPage = () => {
    const navigate = useNavigate();
    const [leagues, setLeagues] = useState([]);
    const [signupRequests, setSignupRequests] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [showEditModal, setShowEditModal] = useState(false);
    const [selectedLeague, setSelectedLeague] = useState(null);
    const { showToast } = useToast();

    // Fetch leagues and signup requests on component mount
    useEffect(() => {
        fetchData();
    }, []);

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
                                    <th>User</th>
                                    <th>League</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {signupRequests.map((request) => (
                                    <tr key={request.id}>
                                        <td>{request.id}</td>
                                        <td>{request.user_name}</td>
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