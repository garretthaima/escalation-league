import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { usePermissions } from '../context/PermissionsProvider';
import ProfileSection from './ProfileSection';
import { isUserInLeague } from '../../api/userLeaguesApi';
import navbarLinks from './navbarLinks';
import './Navbar.css';
import './Navbar-mobile.css'; // Mobile-specific overrides

const Navbar = ({ handleLogout }) => {
    const { permissions, user, darkMode, toggleDarkMode } = usePermissions(); // Use darkMode and toggleDarkMode from PermissionsProvider
    const [activeSection, setActiveSection] = useState('');
    const [inLeague, setInLeague] = useState(false); // Track if the user is in a league

    // Collapse navbar on mobile when link is clicked
    const collapseNavbar = () => {
        const navbarCollapse = document.getElementById('navbarNav');
        const bsCollapse = window.bootstrap?.Collapse?.getInstance(navbarCollapse);
        if (bsCollapse) {
            bsCollapse.hide();
        } else if (navbarCollapse?.classList.contains('show')) {
            // Fallback if Bootstrap instance not found
            navbarCollapse.classList.remove('show');
        }
    };

    const handleLinkClick = (section) => {
        setActiveSection(section.toLowerCase());
        collapseNavbar();
    };

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
        if (link.section === 'admin') {
            const hasAdminAccess = user && permissions.some((perm) => perm.name === 'admin_page_access');
            return hasAdminAccess;
        }
        return false;
    });

    // Sort links by their order property
    const sortedLinks = filteredLinks.sort((a, b) => a.order - b.order);

    return (
        <nav className={`navbar navbar-expand-lg navbar-dark`} style={{ backgroundColor: '#2d1b4e' }}>
            <div className="container-fluid">
                <div className="d-flex align-items-center">
                    <a className="navbar-brand d-flex align-items-center" href="/">
                        <img src="/logo.png" alt="Escalation League Logo" style={{ height: '32px', marginRight: '10px' }} />
                        <span className="navbar-brand-text">Escalation League</span>
                        {process.env.REACT_APP_ENV === 'development' && (
                            <span className="badge bg-warning text-dark ms-2" style={{ fontSize: '0.7rem', verticalAlign: 'middle' }}>
                                DEV
                            </span>
                        )}
                    </a>
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
                </div>
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
                                            onClick={() => handleLinkClick(link.label)}
                                        >
                                            {link.icon && <i className={`fas ${link.icon} me-1`}></i>}
                                            {link.label}
                                        </Link>
                                    </li>
                                );
                            } else if (link.type === 'dropdown') {
                                // Render dropdowns with a clickable parent link
                                return (
                                    <li className="nav-item dropdown" key={link.label}>
                                        <a
                                            className={`nav-link dropdown-toggle ${activeSection === link.label.toLowerCase() ? 'active' : ''}`}
                                            href="#"
                                            id={`${link.label.toLowerCase()}Dropdown`}
                                            role="button"
                                            data-bs-toggle="dropdown"
                                            aria-expanded="false"
                                            onClick={(e) => {
                                                e.preventDefault();
                                                // Let Bootstrap handle the dropdown toggle
                                            }}
                                        >
                                            {link.icon && <i className={`fas ${link.icon} me-1`}></i>}
                                            {link.label}
                                        </a>
                                        <ul className="dropdown-menu" aria-labelledby={`${link.label.toLowerCase()}Dropdown`}>
                                            {link.children
                                                .sort((a, b) => a.order - b.order)
                                                .map((child) => (
                                                    <li key={child.path}>
                                                        <Link
                                                            className="dropdown-item"
                                                            to={child.path}
                                                            onClick={() => handleLinkClick(child.label)}
                                                        >
                                                            <i className={`fas ${child.icon}`}></i> {child.label}
                                                        </Link>
                                                    </li>
                                                ))}
                                        </ul>
                                    </li>
                                );
                            }
                            return null;
                        })}
                    </ul>
                    {/* Mobile-only profile links */}
                    <ul className="navbar-nav d-lg-none">
                        {user && (
                            <>
                                <li className="nav-item">
                                    <Link className="nav-link" to="/profile" onClick={() => collapseNavbar()}>
                                        <i className="fas fa-user"></i> Profile
                                    </Link>
                                </li>
                                <li className="nav-item">
                                    <button className="nav-link btn btn-link w-100 text-start" onClick={() => { toggleDarkMode(); collapseNavbar(); }}>
                                        <i className={`fas ${darkMode ? 'fa-sun' : 'fa-moon'}`}></i> {darkMode ? 'Light Mode' : 'Dark Mode'}
                                    </button>
                                </li>
                                <li className="nav-item">
                                    <button className="nav-link btn btn-link w-100 text-start" onClick={handleLogout}>
                                        <i className="fas fa-sign-out-alt"></i> Logout
                                    </button>
                                </li>
                            </>
                        )}
                    </ul>
                </div>
                <div className="navbar-right-buttons">
                    <ProfileSection user={user} handleLogout={handleLogout} darkMode={darkMode} toggleDarkMode={toggleDarkMode} />
                </div>
            </div>
        </nav>
    );
};

export default Navbar;