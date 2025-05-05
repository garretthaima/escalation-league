import React, { useState } from 'react';
import { usePermissions } from '../context/PermissionsProvider';
import ActiveGamesTab from './ActiveGamesTab';
import CompletedGamesTab from './CompletedGamesTab';
import ConfirmGamesTab from './ConfirmGamesTab';

const GamesPage = () => {
    const [activeTab, setActiveTab] = useState('active'); // Default to "Active Games"
    const { permissions, loading } = usePermissions();

    if (loading) {
        return <div>Loading...</div>; // Show a loading indicator while permissions are being fetched
    }

    // Check if the user has the required permission by name
    const hasPermission = permissions.some((perm) => perm.name === 'pod_read');
    if (!hasPermission) {
        return <div>You do not have permission to view this page.</div>; // Show an error if not authorized
    }

    return (
        <div className="container mt-4">
            <h1 className="text-center mb-4">Games</h1>
            <ul className="nav nav-tabs justify-content-center mb-4">
                <li className="nav-item">
                    <button
                        className={`nav-link ${activeTab === 'active' ? 'active' : ''}`}
                        onClick={() => setActiveTab('active')}
                    >
                        Active Games
                    </button>
                </li>
                <li className="nav-item">
                    <button
                        className={`nav-link ${activeTab === 'waiting' ? 'active' : ''}`}
                        onClick={() => setActiveTab('waiting')}
                    >
                        Confirm Games
                    </button>
                </li>
                <li className="nav-item">
                    <button
                        className={`nav-link ${activeTab === 'completed' ? 'active' : ''}`}
                        onClick={() => setActiveTab('completed')}
                    >
                        Completed Games
                    </button>
                </li>
            </ul>

            <div className="tab-content">
                {activeTab === 'active' && <ActiveGamesTab />}
                {activeTab === 'waiting' && <ConfirmGamesTab />}
                {activeTab === 'completed' && <CompletedGamesTab />}
            </div>
        </div>
    );
};

export default GamesPage;