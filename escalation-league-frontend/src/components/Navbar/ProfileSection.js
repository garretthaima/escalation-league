import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { createPortal } from 'react-dom';
import './ProfileSection.css';

const ProfileSection = ({ user, handleLogout, darkMode, toggleDarkMode }) => {
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
                    className="btn p-0 border-0 bg-transparent profile-section-btn"
                    type="button"
                    onClick={toggleDropdown}
                >
                    <img
                        src={getProfilePictureSrc(user.picture)}
                        alt="Profile"
                        className="rounded-circle profile-section-avatar"
                    />
                </button>
            </div>
            {isOpen && createPortal(
                <ul
                    ref={dropdownMenuRef}
                    className={`profile-custom-dropdown ${isMobile ? 'profile-custom-dropdown--mobile' : 'profile-custom-dropdown--desktop'}`}
                >
                    <li>
                        <Link
                            className="dropdown-item profile-section-dropdown-link"
                            to="/profile"
                            onClick={() => handleItemClick()}
                        >
                            <i className="fas fa-user profile-section-icon"></i> Profile
                        </Link>
                    </li>
                    <li>
                        <button
                            className="dropdown-item profile-section-dropdown-btn"
                            onClick={() => handleItemClick(toggleDarkMode)}
                        >
                            <i className={`fas ${darkMode ? 'fa-sun' : 'fa-moon'} profile-section-icon`}></i> {darkMode ? 'Light Mode' : 'Dark Mode'}
                        </button>
                    </li>
                    <li><hr className="dropdown-divider profile-section-divider" /></li>
                    <li>
                        <button
                            className="dropdown-item profile-section-dropdown-btn"
                            onClick={() => handleItemClick(handleLogout)}
                        >
                            <i className="fas fa-sign-out-alt profile-section-icon"></i> Logout
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