import React from 'react';
import { Outlet, Link } from 'react-router-dom';

const LeagueManagement = () => {
    return (
        <div className="container mt-4">
            <h1 className="mb-4">League Management</h1>
            <nav>
                <ul className="nav nav-pills mb-4">
                    <li className="nav-item">
                        <Link to="/leagues/active" className="nav-link">
                            Active Leagues
                        </Link>
                    </li>
                    <li className="nav-item">
                        <Link to="/leagues/past" className="nav-link">
                            Past Leagues
                        </Link>
                    </li>
                    <li className="nav-item">
                        <Link to="/leagues/create" className="nav-link">
                            Create League
                        </Link>
                    </li>
                </ul>
            </nav>
            <hr />
            <Outlet /> {/* This renders the nested routes */}
        </div>
    );
};

export default LeagueManagement;