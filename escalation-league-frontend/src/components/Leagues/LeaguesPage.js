import React from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { usePermissions } from '../../context/PermissionsProvider';

const LeaguesPage = () => {
    const location = useLocation();
    const { loading, activeLeague } = usePermissions();

    // Derive inLeague from context
    const inLeague = !!activeLeague;

    if (loading) {
        return <div>Loading...</div>;
    }

    return (
        <div className="container mt-4">
            <h1 className="mb-4">Leagues</h1>
            <nav>
                <ul className="nav nav-tabs mb-4">
                    {inLeague ? (
                        <>
                            <li className="nav-item">
                                <Link
                                    to="/leagues/current"
                                    className={`nav-link ${location.pathname === '/leagues/current' ? 'active' : ''}`}
                                >
                                    Current League
                                </Link>
                            </li>
                            <li className="nav-item">
                                <Link
                                    to="/leagues/leaderboard"
                                    className={`nav-link ${location.pathname === '/leagues/leaderboard' ? 'active' : ''}`}
                                >
                                    Leaderboard
                                </Link>
                            </li>
                            <li className="nav-item">
                                <Link
                                    to="/leagues/budget"
                                    className={`nav-link ${location.pathname === '/leagues/budget' ? 'active' : ''}`}
                                >
                                    Budget
                                </Link>
                            </li>
                            <li className="nav-item">
                                <Link
                                    to="/leagues/price-check"
                                    className={`nav-link ${location.pathname === '/leagues/price-check' ? 'active' : ''}`}
                                >
                                    Price Check
                                </Link>
                            </li>                            <li className="nav-item">
                                <Link
                                    to="/leagues/metagame"
                                    className={`nav-link ${location.pathname === '/leagues/metagame' ? 'active' : ''}`}
                                >
                                    Metagame
                                </Link>
                            </li>                        </>
                    ) : (
                        <li className="nav-item">
                            <Link
                                to="/leagues/signup"
                                className={`nav-link ${location.pathname === '/leagues/signup' ? 'active' : ''}`}
                            >
                                Sign Up
                            </Link>
                        </li>
                    )}
                </ul>
            </nav>
            <Outlet context={{ activeLeague }} /> {/* Pass activeLeague to child routes */}
        </div>
    );
};

export default LeaguesPage;