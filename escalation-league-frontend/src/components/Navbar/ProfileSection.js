import React from 'react';
import { useNavigate, Link } from 'react-router-dom';

const ProfileSection = ({ user, handleLogout, darkMode }) => {
    const navigate = useNavigate();

    const getProfilePictureSrc = (picture) => {
        if (!picture) {
            return `${process.env.REACT_APP_BACKEND_URL}/images/profile-pictures/default.png`;
        }
        if (picture.startsWith('http://') || picture.startsWith('https://')) {
            return picture;
        }
        if (picture.startsWith('/')) {
            return `${process.env.REACT_APP_BACKEND_URL}${picture}`;
        }
        return picture;
    };

    return user ? (
        <div className="d-flex align-items-center ms-auto">
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
                className={`btn btn-sm ${darkMode ? 'btn-outline-light' : 'btn-outline-dark'} ms-3`}
                onClick={handleLogout}
            >
                Logout
            </button>
        </div>
    ) : (
        <Link
            className={`btn ${darkMode ? 'btn-outline-light' : 'btn-outline-dark'} ms-auto`}
            to="/signin"
        >
            Sign In
        </Link>
    );
};

export default ProfileSection;