import React, { useEffect, useState } from 'react';

const Profile = () => {
    const [user, setUser] = useState(null);
    const [error, setError] = useState('');

    useEffect(() => {
        // Fetch user data from the backend
        fetch(`${process.env.REACT_APP_BACKEND_URL}/auth/profile`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${localStorage.getItem('token')}`,
            },
        })
            .then((res) => {
                if (!res.ok) {
                    throw new Error('Failed to fetch profile data.');
                }
                return res.json();
            })
            .then((data) => setUser(data))
            .catch((err) => setError(err.message));
    }, []);

    if (error) {
        return <p className="text-danger">{error}</p>;
    }

    if (!user) {
        return <p>Loading...</p>;
    }

    return (
        <div className="container mt-4">
            <h2 className="mb-4">Profile</h2>
            <div className="mb-3">
                <strong>Name:</strong> {user.firstname} {user.lastname}
            </div>
            <div className="mb-3">
                <strong>Email:</strong> {user.email}
            </div>
            {/* Add more fields as needed */}
        </div>
    );
};

export default Profile;