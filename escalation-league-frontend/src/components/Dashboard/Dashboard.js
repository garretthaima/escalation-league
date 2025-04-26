import React, { useEffect, useState } from 'react';

const Dashboard = () => {
    const [user, setUser] = useState(null);

    useEffect(() => {
        const token = localStorage.getItem('token');

        // Fetch user details from the backend using the token
        fetch('http://localhost:3000/user-info', {
            method: 'GET',
            headers: {
                Authorization: `Bearer ${token}`,
            },
        })
            .then((res) => res.json())
            .then((data) => setUser(data.user))
            .catch((err) => console.error('Error fetching user info:', err));
    }, []);

    if (!user) {
        return <p>Loading...</p>;
    }

    return (
        <div className="container mt-4">
            <h2>Welcome, {user.name}!</h2>
            <p>You are logged in.</p>
        </div>
    );
};

export default Dashboard;