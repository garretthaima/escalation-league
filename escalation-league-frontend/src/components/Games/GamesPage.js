import React, { useState, useEffect } from 'react';
import { usePermissions } from '../context/PermissionsProvider';
import { Outlet, useLocation } from 'react-router-dom';
import ActiveGamesPage from './ActiveGamesPage';
import CompletedGamesPage from './CompletedGamesPage';
import ConfirmGamesPage from './ConfirmGamesPage';

const GamesPage = () => {
    const { permissions, loading, darkMode } = usePermissions();
    const location = useLocation(); // Get the current route

    // State for collapsible sections
    const [showActive, setShowActive] = useState(true);
    const [showConfirm, setShowConfirm] = useState(true);
    const [showCompleted, setShowCompleted] = useState(true);

    // Load saved state from localStorage
    useEffect(() => {
        const savedState = JSON.parse(localStorage.getItem('collapsibleState')) || {};
        setShowActive(savedState.showActive ?? true);
        setShowConfirm(savedState.showConfirm ?? true);
        setShowCompleted(savedState.showCompleted ?? true);
    }, []);

    // Save state to localStorage whenever it changes
    useEffect(() => {
        localStorage.setItem(
            'collapsibleState',
            JSON.stringify({ showActive, showConfirm, showCompleted })
        );
    }, [showActive, showConfirm, showCompleted]);

    // Early return for loading state
    if (loading) {
        return <div>Loading...</div>; // Show a loading indicator while permissions are being fetched
    }

    // Early return for insufficient permissions
    const hasPermission = permissions.some((perm) => perm.name === 'pod_read');
    if (!hasPermission) {
        return <div>You do not have permission to view this page.</div>; // Show an error if not authorized
    }

    // Check if the current route is the base "/pods"
    const isBaseRoute = location.pathname === '/pods';

    return (
        <div className="container mt-4">
            <h1 className="text-center mb-4">Pods</h1>

            {/* Render collapsible sections only on the base "/pods" route */}
            {isBaseRoute && (
                <>
                    {/* Active Pods Section */}
                    <section className="mb-5">
                        <h2
                            className={`collapsible-header ${darkMode ? 'dark-mode' : ''}`}
                            onClick={() => setShowActive(!showActive)}
                        >
                            Active Pods <i className={`fas ${showActive ? 'fa-chevron-down' : 'fa-chevron-up'}`}></i>
                        </h2>
                        <div
                            className={`collapsible-content ${showActive ? 'expanded' : ''} ${darkMode ? 'dark-mode' : ''
                                }`}
                        >
                            <ActiveGamesPage />
                        </div>
                    </section>

                    {/* Confirm Pods Section */}
                    <section className="mb-5">
                        <h2
                            className={`collapsible-header ${darkMode ? 'dark-mode' : ''}`}
                            onClick={() => setShowConfirm(!showConfirm)}
                        >
                            Confirm Pods <i className={`fas ${showConfirm ? 'fa-chevron-down' : 'fa-chevron-up'}`}></i>
                        </h2>
                        <div
                            className={`collapsible-content ${showConfirm ? 'expanded' : ''} ${darkMode ? 'dark-mode' : ''
                                }`}
                        >
                            <ConfirmGamesPage />
                        </div>
                    </section>

                    {/* Completed Pods Section */}
                    <section className="mb-5">
                        <h2
                            className={`collapsible-header ${darkMode ? 'dark-mode' : ''}`}
                            onClick={() => setShowCompleted(!showCompleted)}
                        >
                            Completed Pods <i className={`fas ${showCompleted ? 'fa-chevron-down' : 'fa-chevron-up'}`}></i>
                        </h2>
                        <div
                            className={`collapsible-content ${showCompleted ? 'expanded' : ''} ${darkMode ? 'dark-mode' : ''
                                }`}
                        >
                            <CompletedGamesPage />
                        </div>
                    </section>
                </>
            )}

            {/* Render child routes */}
            <Outlet />
        </div>
    );
};

export default GamesPage;