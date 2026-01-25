import React, { useRef, useCallback, useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { usePermissions } from '../../context/PermissionsProvider';
import ProfileSection from './ProfileSection';
import NotificationCenter from './NotificationCenter';
import navbarLinks from './navbarLinks';
import './Navbar.css';
import './Navbar-mobile.css'; // Mobile-specific overrides

const MOBILE_BREAKPOINT = 992;

const Navbar = ({ handleLogout }) => {
    const { permissions, user, darkMode, toggleDarkMode, activeLeague, loading } = usePermissions();
    const location = useLocation();
    const navbarCollapseRef = useRef(null);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isMobile, setIsMobile] = useState(window.innerWidth < MOBILE_BREAKPOINT);

    // Track menu open/close state via Bootstrap events
    useEffect(() => {
        const navbarCollapse = navbarCollapseRef.current;
        if (!navbarCollapse) return;

        const handleShow = () => setIsMenuOpen(true);
        const handleHide = () => setIsMenuOpen(false);

        navbarCollapse.addEventListener('show.bs.collapse', handleShow);
        navbarCollapse.addEventListener('hide.bs.collapse', handleHide);
        navbarCollapse.addEventListener('hidden.bs.collapse', handleHide);

        return () => {
            navbarCollapse.removeEventListener('show.bs.collapse', handleShow);
            navbarCollapse.removeEventListener('hide.bs.collapse', handleHide);
            navbarCollapse.removeEventListener('hidden.bs.collapse', handleHide);
        };
    }, []);

    // Track window resize for mobile detection
    useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Derive inLeague from context (activeLeague is the league object or null)
    const inLeague = !!activeLeague;

    // Collapse navbar on mobile when link is clicked (using ref instead of DOM query)
    const collapseNavbar = useCallback(() => {
        const navbarCollapse = navbarCollapseRef.current;
        if (!navbarCollapse) return;

        // Try to get existing instance, or create a new one
        let bsCollapse = window.bootstrap?.Collapse?.getInstance(navbarCollapse);
        if (!bsCollapse && window.bootstrap?.Collapse) {
            bsCollapse = new window.bootstrap.Collapse(navbarCollapse, { toggle: false });
        }

        if (bsCollapse) {
            bsCollapse.hide();
        } else if (navbarCollapse.classList.contains('show')) {
            // Fallback: manually remove show class and update state
            navbarCollapse.classList.remove('show');
            setIsMenuOpen(false);
        }
    }, []);

    // Check if a path is active (handles both exact and prefix matching)
    const isPathActive = useCallback((path) => {
        if (path === '/') return location.pathname === '/';
        return location.pathname === path || location.pathname.startsWith(path + '/');
    }, [location.pathname]);

    const handleLinkClick = () => {
        collapseNavbar();
    };

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
        <>
            {/* Backdrop overlay - tap to close menu on mobile */}
            {isMobile && isMenuOpen && (
                <div
                    className="navbar-backdrop"
                    onClick={collapseNavbar}
                    aria-hidden="true"
                />
            )}
            <nav className="navbar navbar-expand-lg navbar-dark">
            <div className="container-fluid">
                <div className="d-flex align-items-center">
                    <a className="navbar-brand d-flex align-items-center" href="/">
                        <img src="/logo.png" alt="Escalation League Logo" className="navbar-logo" />
                        <span className="navbar-brand-text">Escalation League</span>
                        {process.env.REACT_APP_ENV === 'development' && (
                            <span className="badge bg-warning text-dark ms-2 navbar-dev-badge">
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
                <div className="collapse navbar-collapse" id="navbarNav" ref={navbarCollapseRef}>
                    <ul className="navbar-nav me-auto mb-2 mb-lg-0">
                        {loading && user ? (
                            <li className="nav-item">
                                <span className="nav-link text-muted">
                                    <i className="fas fa-spinner fa-spin me-1"></i>
                                    Loading...
                                </span>
                            </li>
                        ) : (
                            sortedLinks.map((link) => {
                                if (link.type === 'link') {
                                    const isActive = isPathActive(link.path);
                                    return (
                                        <li className="nav-item" key={link.path}>
                                            <Link
                                                className={`nav-link ${isActive ? 'active' : ''}`}
                                                to={link.path}
                                                onClick={handleLinkClick}
                                            >
                                                {link.icon && <i className={`fas ${link.icon} me-1`}></i>}
                                                {link.label}
                                            </Link>
                                        </li>
                                    );
                                } else if (link.type === 'dropdown') {
                                    // Check if any child path is active
                                    const isDropdownActive = link.children?.some(child => isPathActive(child.path));
                                    return (
                                        <li className="nav-item dropdown" key={link.label}>
                                            <button
                                                type="button"
                                                className={`nav-link dropdown-toggle btn btn-link ${isDropdownActive ? 'active' : ''}`}
                                                id={`${link.label.toLowerCase()}Dropdown`}
                                                data-bs-toggle="dropdown"
                                                aria-expanded="false"
                                            >
                                                {link.icon && <i className={`fas ${link.icon} me-1`}></i>}
                                                {link.label}
                                            </button>
                                            <ul className="dropdown-menu" aria-labelledby={`${link.label.toLowerCase()}Dropdown`}>
                                                {link.children
                                                    .sort((a, b) => a.order - b.order)
                                                    .map((child) => (
                                                        <li key={child.path}>
                                                            <Link
                                                                className={`dropdown-item ${isPathActive(child.path) ? 'active' : ''}`}
                                                                to={child.path}
                                                                onClick={handleLinkClick}
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
                            })
                        )}
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
                    {user && <NotificationCenter />}
                    <ProfileSection user={user} handleLogout={handleLogout} darkMode={darkMode} toggleDarkMode={toggleDarkMode} />
                </div>
            </div>
        </nav>
        </>
    );
};

export default Navbar;