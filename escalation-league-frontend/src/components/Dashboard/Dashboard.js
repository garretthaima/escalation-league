import React, { useEffect, useState } from 'react';
import { getUserProfile } from '../../api/usersApi';

const Dashboard = () => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const data = await getUserProfile();
                setUser(data.user);
            } catch (err) {
                console.error('Error fetching user info:', err);
                setError('Failed to load user information.');
            } finally {
                setLoading(false);
            }
        };

        fetchProfile();
    }, []);

    if (loading) {
        return <div className="text-center mt-4">Loading...</div>;
    }

    if (error) {
        return <div className="alert alert-danger text-center mt-4">{error}</div>;
    }

    if (!user) {
        return <div className="alert alert-warning text-center mt-4">No user data available.</div>;
    }

    return (
        <div className="container mt-4">
            <h2 className="mb-4">Welcome, {user.firstname} {user.lastname}!</h2>
            <div className="alert alert-success">
                <i className="fas fa-check-circle me-2"></i>
                You are successfully logged in.
            </div>
        </div>
    );
};

export default Dashboard;