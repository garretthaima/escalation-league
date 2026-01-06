import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { usePermissions } from '../context/PermissionsProvider';
import ProfileSection from './ProfileSection';
import { isUserInLeague } from '../../api/userLeaguesApi';
import navbarLinks from './navbarLinks';
import './Navbar.css';

const Navbar = ({ handleLogout }) => {
    const { permissions, user, darkMode, toggleDarkMode } = usePermissions(); // Use darkMode and toggleDarkMode from PermissionsProvider
    const [activeSection, setActiveSection] = useState('');
    const [inLeague, setInLeague] = useState(false); // Track if the user is in a league

    useEffect(() => {
        const fetchLeagueStatus = async () => {
            try {
                const { inLeague } = await isUserInLeague(); // Fetch league status from API
                setInLeague(inLeague);
            } catch (err) {
                console.error('Error fetching league status:', err);
                setInLeague(false); // Default to false if there's an error
            }
        };

        if (user) {
            fetchLeagueStatus(); // Fetch league status only if the user is logged in
        }
    }, [user]);

    // Generate navbar links dynamically based on inLeague state
    const filteredLinks = navbarLinks(inLeague).filter((link) => {
        if (link.section === 'public') return true; // Always show public links
        if (link.section === 'pods') return user && permissions.some((perm) => perm.name === 'pod_read');
        if (link.section === 'admin') return user && permissions.some((perm) => perm.name === 'admin_page_access');
        return false;
    });

    // Sort links by their order property
    const sortedLinks = filteredLinks.sort((a, b) => a.order - b.order);

    return (
        <nav className={`navbar navbar-expand-lg ${darkMode ? 'navbar-dark bg-dark' : 'navbar-light bg-light'}`}>
            <div className="container-fluid">
                <a className="navbar-brand" href="/">Escalation League</a>
                <button
                    className="navbar-toggler"
                    type="button"
                    data-bs-toggle="collapse"
                    data-bs-target="#navbarNav"
                    aria-controls="navbarNav"
                    aria-expanded="false"
                    aria-label="Toggle navigation"
                >
                    <span className="navbar-toggler-icon"></span>
                </button>
                <div className="collapse navbar-collapse" id="navbarNav">
                    <ul className="navbar-nav me-auto mb-2 mb-lg-0">
                        {sortedLinks.map((link) => {
                            if (link.type === 'link') {
                                // Render regular links
                                return (
                                    <li className="nav-item" key={link.path}>
                                        <Link
                                            className={`nav-link ${activeSection === link.label.toLowerCase() ? 'active' : ''}`}
                                            to={link.path}
                                            onClick={() => setActiveSection(link.label.toLowerCase())}
                                        >
                                            {link.label}
                                        </Link>
                                    </li>
                                );
                            } else if (link.type === 'dropdown') {
                                // Render dropdowns with a clickable parent link
                                return (
                                    <li className="nav-item dropdown" key={link.label}>
                                        <Link
                                            className={`nav-link dropdown-toggle ${activeSection === link.label.toLowerCase() ? 'active' : ''}`}
                                            to={link.path} // Make the parent link clickable
                                            id={`${link.label.toLowerCase()}Dropdown`}
                                            role="button"
                                            data-bs-toggle="dropdown"
                                            aria-expanded="false"
                                            onClick={() => setActiveSection(link.label.toLowerCase())}
                                        >
                                            {link.label}
                                        </Link>
                                        <ul className="dropdown-menu" aria-labelledby={`${link.label.toLowerCase()}Dropdown`}>
                                            {link.children
                                                .sort((a, b) => a.order - b.order)
                                                .map((child, index) => (
                                                    <React.Fragment key={child.path}>
                                                        <li>
                                                            <Link
                                                                className="dropdown-item"
                                                                to={child.path}
                                                                onClick={() => setActiveSection(child.label.toLowerCase())}
                                                            >
                                                                <i className={`fas ${child.icon}`}></i> {child.label}
                                                            </Link>
                                                        </li>
                                                        {index === 1 && index < link.children.length - 1 && <hr className="dropdown-divider" />}
                                                    </React.Fragment>
                                                ))}
                                        </ul>
                                    </li>
                                );
                            }
                            return null;
                        })}
                    </ul>
                    <button
                        className={`btn ${darkMode ? 'btn-outline-light' : 'btn-outline-dark'} ms-auto`}
                        onClick={toggleDarkMode} // Use toggleDarkMode from PermissionsProvider
                        title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                    >
                        <i className={`fas ${darkMode ? 'fa-sun' : 'fa-moon'}`}></i>
                    </button>
                    <ProfileSection user={user} handleLogout={handleLogout} darkMode={darkMode} />
                </div>
            </div>
        </nav>
    );
};

export default Navbar;