import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { usePermissions } from '../context/PermissionsProvider';

const Navbar = ({ handleLogout }) => {
    const navigate = useNavigate();
    const { permissions, user } = usePermissions();

    const getProfilePictureSrc = (picture) => {
        if (!picture) {
            // Return a default profile picture if `picture` is null or undefined
            return `${process.env.REACT_APP_BACKEND_URL}/images/profile-pictures/default.png`;
        }

        // If the picture is a relative path, prepend the backend URL
        if (picture.startsWith('/')) {
            return `${process.env.REACT_APP_BACKEND_URL}${picture}`;
        }

        return picture; // If it's already a full URL, return it as is
    };

    // Check permissions for each section
    const canAccessAdminPage = permissions.some((perm) => perm.name === 'admin_page_access');
    const canAccessLeagueAdmin = permissions.some((perm) => perm.name === 'league_manage_requests');
    const canAccessGames = permissions.some((perm) => perm.name === 'pod_read');

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
                        <li className="nav-item">
                            <Link className="nav-link" to="/rules">Rules</Link>
                        </li>
                        <li className="nav-item">
                            <Link className="nav-link" to="/awards">Awards</Link>
                        </li>

                        {/* Games Section - Only visible to users with pod_read permission */}
                        {user && canAccessGames && (
                            <li className="nav-item">
                                <Link className="nav-link" to="/games">Games</Link>
                            </li>
                        )}

                        {/* Admin Section - Only visible to users with admin_page_access permission */}
                        {user && canAccessAdminPage && (
                            <li className="nav-item">
                                <Link className="nav-link" to="/admin">Admin</Link>
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
                                    src={getProfilePictureSrc(user.picture)}
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