import React, { useEffect, useState } from 'react';
import { getSignupRequests, approveSignupRequest, rejectSignupRequest } from '../../api/leaguesApi';

const LeagueAdminPage = () => {
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchRequests = async () => {
            try {
                const data = await getSignupRequests();
                setRequests(data);
            } catch (err) {
                console.error('Error fetching signup requests:', err);
                setError('Failed to fetch signup requests.');
            } finally {
                setLoading(false);
            }
        };

        fetchRequests();
    }, []);

    const handleApprove = async (requestId) => {
        try {
            await approveSignupRequest(requestId);
            setRequests((prev) => prev.filter((req) => req.id !== requestId));
        } catch (err) {
            console.error('Error approving signup request:', err);
            setError('Failed to approve signup request.');
        }
    };

    const handleReject = async (requestId) => {
        try {
            await rejectSignupRequest(requestId);
            setRequests((prev) => prev.filter((req) => req.id !== requestId));
        } catch (err) {
            console.error('Error rejecting signup request:', err);
            setError('Failed to reject signup request.');
        }
    };

    if (loading) {
        return <div>Loading...</div>;
    }

    if (error) {
        return <div className="alert alert-danger">{error}</div>;
    }

    return (
        <div>
            <h2>League Signup Requests</h2>
            {requests.length === 0 ? (
                <p>No pending signup requests.</p>
            ) : (
                <table className="table table-striped">
                    <thead>
                        <tr>
                            <th>User</th>
                            <th>League</th>
                            <th>Request Date</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {requests.map((req) => (
                            <tr key={req.id}>
                                <td>{`${req.firstname} ${req.lastname}`}</td>
                                <td>{req.league_name}</td>
                                <td>{new Date(req.created_at).toLocaleString()}</td>
                                <td>
                                    <button
                                        className="btn btn-success btn-sm me-2"
                                        onClick={() => handleApprove(req.id)}
                                    >
                                        Approve
                                    </button>
                                    <button
                                        className="btn btn-danger btn-sm"
                                        onClick={() => handleReject(req.id)}
                                    >
                                        Reject
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </div>
    );
};

export default LeagueAdminPage;