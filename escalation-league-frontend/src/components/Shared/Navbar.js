import React from 'react';
import { Link, useNavigate } from 'react-router-dom';

const Navbar = ({ user, handleLogout }) => {
    const navigate = useNavigate();

    return (
        <nav className="navbar navbar-expand-lg navbar-dark bg-dark">
            <div className="container-fluid">
                <a className="navbar-brand" href="/">Escalation League</a>
                <div className="collapse navbar-collapse">
                    <ul className="navbar-nav me-auto mb-2 mb-lg-0">
                        {/* Public Links */}
                        <li className="nav-item">
                            <Link className="nav-link" to="/leagues">Leagues</Link>
                        </li>
                        {/* Games Section - Only visible to logged-in users */}
                        {user && (
                            <li className="nav-item">
                                <Link className="nav-link" to="/games">Games</Link>
                            </li>
                        )}
                        <li className="nav-item">
                            <Link className="nav-link" to="/rules">Rules</Link>
                        </li>
                        <li className="nav-item">
                            <Link className="nav-link" to="/awards">Awards</Link>
                        </li>

                        {/* Admin Section */}
                        {user && user.role === 'admin' && (
                            <li className="nav-item">
                                <Link className="nav-link" to="/admin">Admin</Link>
                            </li>
                        )}

                        {/* League Admin Section */}
                        {user && (user.role === 'league_admin' || user.role === 'admin') && (
                            <li className="nav-item">
                                <Link className="nav-link" to="/league-admin">League Admin</Link>
                            </li>
                        )}
                    </ul>

                    {/* Profile Section on the Right */}
                    {user ? (
                        <div className="d-flex align-items-center ms-auto">
                            {/* Profile Image as Button */}
                            <button
                                className="btn p-0 border-0 bg-transparent"
                                onClick={() => navigate('/profile')}
                                style={{ cursor: 'pointer' }}
                            >
                                <img
                                    src={user.picture}
                                    alt="Profile"
                                    className="rounded-circle"
                                    style={{ width: '40px', height: '40px' }}
                                />
                            </button>
                            <button
                                className="btn btn-sm btn-outline-light ms-3"
                                onClick={handleLogout}
                            >
                                Logout
                            </button>
                        </div>
                    ) : (
                        <Link className="btn btn-outline-light ms-auto" to="/signin">Sign In</Link>
                    )}
                </div>
            </div>
        </nav>
    );
};

export default Navbar;