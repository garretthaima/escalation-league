import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    getLeagues,
    setActiveLeague,
    getSignupRequests,
    approveSignupRequest,
    rejectSignupRequest,
} from '../../api/leaguesApi';

const LeagueAdminPage = () => {
    const navigate = useNavigate();
    const [leagues, setLeagues] = useState([]);
    const [signupRequests, setSignupRequests] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Fetch leagues and signup requests on component mount
    useEffect(() => {
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

        fetchData();
    }, []);

    // Handle setting a league as active
    const handleSetActiveLeague = async (leagueId) => {
        try {
            await setActiveLeague(leagueId);
            alert('League set as active successfully!');
            setLeagues((prev) =>
                prev.map((league) =>
                    league.id === leagueId ? { ...league, is_active: true } : { ...league, is_active: false }
                )
            );
        } catch (err) {
            alert('Failed to set league as active. Please try again.');
        }
    };

    // Handle approving a signup request
    const handleApproveRequest = async (requestId) => {
        try {
            await approveSignupRequest(requestId);
            alert('Signup request approved!');
            setSignupRequests((prev) => prev.filter((req) => req.id !== requestId));
        } catch (err) {
            alert('Failed to approve signup request. Please try again.');
        }
    };

    // Handle rejecting a signup request
    const handleRejectRequest = async (requestId) => {
        try {
            await rejectSignupRequest(requestId);
            alert('Signup request rejected!');
            setSignupRequests((prev) => prev.filter((req) => req.id !== requestId));
        } catch (err) {
            alert('Failed to reject signup request. Please try again.');
        }
    };

    if (loading) return <div>Loading...</div>;
    if (error) return <div>{error}</div>;

    return (
        <div>
            <h2>League Management</h2>
            <button
                className="btn btn-primary mb-4"
                onClick={() => navigate('/admin/leagues/create')}
            >
                Create League
            </button>

            <h3>Leagues</h3>
            <table className="table">
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Name</th>
                        <th>Status</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {leagues.map((league) => (
                        <tr key={league.id}>
                            <td>{league.id}</td>
                            <td>{league.name}</td>
                            <td>{league.is_active ? 'Active' : 'Inactive'}</td>
                            <td>
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

            <h3>Signup Requests</h3>
            <table className="table">
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
                                    className="btn btn-success btn-sm"
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
    );
};

export default LeagueAdminPage;