import React from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';

/**
 * Simplified league layout for tool pages (budget, price-check, metagame).
 * The main dashboard at /leagues doesn't use this layout.
 */
const LeagueLayout = () => {
    const location = useLocation();

    // Determine which tool is active based on path
    const isToolPage = ['/leagues/budget', '/leagues/price-check', '/leagues/metagame'].some(
        path => location.pathname.startsWith(path)
    );

    return (
        <div className="container mt-4">
            {/* Back to Dashboard link for tool pages */}
            {isToolPage && (
                <div className="mb-3">
                    <Link to="/leagues" className="btn btn-link p-0 text-decoration-none">
                        <i className="fas fa-arrow-left me-2"></i>
                        Back to Dashboard
                    </Link>
                </div>
            )}

            {/* Mini navigation for tools */}
            {isToolPage && (
                <nav className="mb-4">
                    <ul className="nav nav-pills nav-fill">
                        <li className="nav-item">
                            <Link
                                to="/leagues/budget"
                                className={`nav-link ${location.pathname === '/leagues/budget' ? 'active' : ''}`}
                            >
                                <i className="fas fa-coins me-1"></i>
                                Budget
                            </Link>
                        </li>
                        <li className="nav-item">
                            <Link
                                to="/leagues/price-check"
                                className={`nav-link ${location.pathname === '/leagues/price-check' ? 'active' : ''}`}
                            >
                                <i className="fas fa-dollar-sign me-1"></i>
                                Price Check
                            </Link>
                        </li>
                        <li className="nav-item">
                            <Link
                                to="/leagues/metagame"
                                className={`nav-link ${location.pathname === '/leagues/metagame' ? 'active' : ''}`}
                            >
                                <i className="fas fa-chart-pie me-1"></i>
                                Metagame
                            </Link>
                        </li>
                    </ul>
                </nav>
            )}

            <Outlet />
        </div>
    );
};

export default LeagueLayout;
