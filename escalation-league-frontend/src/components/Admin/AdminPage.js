import React from 'react';
import { Link } from 'react-router-dom';

const AdminPage = () => {
    return (
        <div className="container mt-4">
            <h1>Admin Dashboard</h1>
            <p>Welcome to the admin dashboard. Use the links below to manage the application:</p>
            <ul>
                <li>
                    <Link to="/admin/leagues">League Management</Link>
                </li>
                <li>
                    <Link to="/admin/pods">Pods</Link>
                </li>
                <li>
                    <Link to="/admin/users">User Role Management</Link>
                </li>
                <li>
                    <Link to="/admin/activity-logs">Activity Logs</Link>
                </li>
            </ul>
        </div>
    );
};

export default AdminPage;