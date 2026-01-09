import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { createPortal } from 'react-dom';
import './ProfileSection.css';

const ProfileSection = ({ user, handleLogout, darkMode, toggleDarkMode }) => {
    const navigate = useNavigate();
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);
    const dropdownMenuRef = useRef(null);
    const [isMobile, setIsMobile] = useState(window.innerWidth < 992);

    useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth < 992);
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const getProfilePictureSrc = (picture) => {
        if (!picture) {
            return '/images/profile-pictures/avatar1.png';
        }
        // If it's a Google OAuth picture (full URL)
        if (picture.startsWith('http://') || picture.startsWith('https://')) {
            return picture;
        }
        // Otherwise it's a local avatar path
        return picture;
    };

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target) &&
                dropdownMenuRef.current && !dropdownMenuRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const toggleDropdown = () => {
        setIsOpen(!isOpen);
    };

    const handleItemClick = (callback) => {
        setIsOpen(false);
        if (callback) callback();
    };

    return user ? (
        <>
            <div className="dropdown profile-dropdown" ref={dropdownRef}>
                <button
                    className="btn p-0 border-0 bg-transparent"
                    type="button"
                    onClick={toggleDropdown}
                    style={{ cursor: 'pointer', outline: 'none', boxShadow: 'none' }}
                >
                    <img
                        src={getProfilePictureSrc(user.picture)}
                        alt="Profile"
                        className="rounded-circle"
                        style={{ width: '40px', height: '40px', objectFit: 'cover' }}
                    />
                </button>
            </div>
            {isOpen && createPortal(
                <ul
                    ref={dropdownMenuRef}
                    className="profile-custom-dropdown"
                    style={{
                        backgroundColor: '#2d1b4e',
                        border: '1px solid rgba(255, 255, 255, 0.15)',
                        borderRadius: '0.375rem',
                        minWidth: '200px',
                        padding: '0.5rem 0',
                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.5)',
                        position: 'fixed',
                        top: isMobile ? '56px' : '70px',
                        right: '1rem',
                        zIndex: 99999,
                        listStyle: 'none',
                        margin: 0,
                        display: 'block'
                    }}
                >
                    <li>
                        <Link
                            className="dropdown-item"
                            to="/profile"
                            onClick={() => handleItemClick()}
                            style={{
                                color: 'rgba(255, 255, 255, 0.85)',
                                padding: '0.75rem 1rem',
                                fontSize: '0.95rem',
                                display: 'block',
                                textDecoration: 'none'
                            }}
                        >
                            <i className="fas fa-user" style={{ marginRight: '0.75rem', width: '20px', textAlign: 'center' }}></i> Profile
                        </Link>
                    </li>
                    <li>
                        <button
                            className="dropdown-item"
                            onClick={() => handleItemClick(toggleDarkMode)}
                            style={{
                                color: 'rgba(255, 255, 255, 0.85)',
                                padding: '0.75rem 1rem',
                                fontSize: '0.95rem',
                                background: 'transparent',
                                border: 'none',
                                width: '100%',
                                textAlign: 'left',
                                cursor: 'pointer',
                                display: 'block'
                            }}
                        >
                            <i className={`fas ${darkMode ? 'fa-sun' : 'fa-moon'}`} style={{ marginRight: '0.75rem', width: '20px', textAlign: 'center' }}></i> {darkMode ? 'Light Mode' : 'Dark Mode'}
                        </button>
                    </li>
                    <li><hr className="dropdown-divider" style={{ borderColor: 'rgba(255, 255, 255, 0.15)', margin: '0.5rem 0' }} /></li>
                    <li>
                        <button
                            className="dropdown-item"
                            onClick={() => handleItemClick(handleLogout)}
                            style={{
                                color: 'rgba(255, 255, 255, 0.85)',
                                padding: '0.75rem 1rem',
                                fontSize: '0.95rem',
                                background: 'transparent',
                                border: 'none',
                                width: '100%',
                                textAlign: 'left',
                                cursor: 'pointer',
                                display: 'block'
                            }}
                        >
                            <i className="fas fa-sign-out-alt" style={{ marginRight: '0.75rem', width: '20px', textAlign: 'center' }}></i> Logout
                        </button>
                    </li>
                </ul>,
                document.body
            )}
        </>
    ) : (
        <Link
            className={`btn ${darkMode ? 'btn-outline-light' : 'btn-outline-dark'}`}
            to="/signin"
        >
            Sign In
        </Link>
    );
};

export default ProfileSection;