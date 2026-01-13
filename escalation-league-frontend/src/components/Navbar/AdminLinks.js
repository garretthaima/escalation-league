import React from 'react';
import { Link } from 'react-router-dom';

const AdminLinks = ({ activeSection, setActiveSection, permissions }) => {
    const canAccessLeagueAdmin = permissions.some((perm) => perm.name === 'league_manage_requests');
    const canAccessGames = permissions.some((perm) => perm.name === 'pod_read');
    const canAccessAttendanceAdmin = permissions.some((perm) =>
        perm.name === 'admin_attendance_manage' || perm.name === 'admin_discord_poll'
    );

    return (
        <li className="nav-item dropdown">
            <a
                className="nav-link dropdown-toggle"
                href="#"
                id="adminDropdown"
                role="button"
                data-bs-toggle="dropdown"
                aria-expanded="false"
            >
                Admin
            </a>
            <ul className="dropdown-menu" aria-labelledby="adminDropdown">
                {canAccessLeagueAdmin && (
                    <li>
                        <Link
                            className="dropdown-item"
                            to="/admin/leagues"
                            onClick={() => setActiveSection('adminLeagues')}
                        >
                            League Management
                        </Link>
                    </li>
                )}
                {canAccessGames && (
                    <li>
                        <Link
                            className="dropdown-item"
                            to="/admin/pods"
                            onClick={() => setActiveSection('adminPods')}
                        >
                            Pods
                        </Link>
                    </li>
                )}
                {canAccessAttendanceAdmin && (
                    <li>
                        <Link
                            className="dropdown-item"
                            to="/admin/attendance"
                            onClick={() => setActiveSection('adminAttendance')}
                        >
                            Attendance
                        </Link>
                    </li>
                )}
            </ul>
        </li>
    );
};

export default AdminLinks;