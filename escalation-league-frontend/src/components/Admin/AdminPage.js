import React, { useState } from 'react';
import { usePermissions } from '../context/PermissionsProvider';
import LeagueAdminPage from './LeagueAdminPage';

const AdminPage = () => {
    const [activeTab, setActiveTab] = useState('roleRequests'); // Default tab
    const { permissions } = usePermissions();

    // Check permissions for tab access
    const canAccessRoleRequests = permissions.some((perm) => perm.name === 'role_request_view');
    const canAccessLeagueRequests = permissions.some((perm) => perm.name === 'league_manage_requests');

    // Check if the user can access the AdminPage
    const canAccessAdminPage = permissions.some((perm) => perm.name === 'admin_page_access');
    if (!canAccessAdminPage) {
        return <div>You do not have permission to access this page.</div>;
    }

    return (
        <div className="container mt-4">
            <h1 className="mb-4">Admin Dashboard</h1>
            <ul className="nav nav-tabs">
                {canAccessRoleRequests && (
                    <li className="nav-item">
                        <button
                            className={`nav-link ${activeTab === 'roleRequests' ? 'active' : ''}`}
                            onClick={() => setActiveTab('roleRequests')}
                        >
                            Role Requests
                        </button>
                    </li>
                )}
                {canAccessLeagueRequests && (
                    <li className="nav-item">
                        <button
                            className={`nav-link ${activeTab === 'leagueRequests' ? 'active' : ''}`}
                            onClick={() => setActiveTab('leagueRequests')}
                        >
                            League Signup Requests
                        </button>
                    </li>
                )}
            </ul>
            <div className="tab-content mt-4">
                {activeTab === 'roleRequests' && canAccessRoleRequests && (
                    <div>
                        {/* Existing Role Requests Logic */}
                        <h2>Role Requests</h2>
                        {/* Role requests table or content */}
                    </div>
                )}
                {activeTab === 'leagueRequests' && canAccessLeagueRequests && <LeagueAdminPage />}
            </div>
        </div>
    );
};

export default AdminPage;