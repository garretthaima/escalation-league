import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Tabs, Tab } from 'react-bootstrap';
import OverviewTab from './OverviewTab';
import SettingsTab from './SettingsTab';
import StatisticsTab from './StatisticsTab';
import LeagueTab from './LeagueTab';
import { getUserProfile, updateUserProfile } from '../../../api/usersApi';

const Profile = () => {
    const [user, setUser] = useState(null);
    const [currentLeague, setCurrentLeague] = useState(null);
    const [error, setError] = useState('');
    const [activeTab, setActiveTab] = useState('overview');
    const navigate = useNavigate();

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const data = await getUserProfile(); // Fetch user profile from the backend
                setUser(data.user);
                setCurrentLeague(data.currentLeague);
            } catch (err) {
                console.error(err);
                setError('Failed to load profile.');
                // Redirect to login if the user is not authenticated
                if (err.response && err.response.status === 401) {
                    navigate('/login'); // Redirect to login page
                }
            }
        };

        fetchProfile();
    }, [navigate]);

    const handlePictureUpdate = async (newPicture) => {
        try {
            console.log('Updating profile picture with:', { picture: newPicture });
            await updateUserProfile({ picture: newPicture });
            setUser((prevUser) => ({ ...prevUser, picture: newPicture }));
        } catch (err) {
            console.error('Failed to update profile picture:', err);
            setError('Failed to update profile picture.');
        }
    };

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

    if (error) {
        return <p className="text-danger">{error}</p>;
    }

    if (!user) {
        return <p>Loading...</p>;
    }

    return (
        <div className="container mt-4">
            <div className="d-flex align-items-center mb-4">
                <h2 className="me-3">Profile</h2>
                <img
                    src={getProfilePictureSrc(user.picture)}
                    alt="Profile"
                    className="img-thumbnail"
                    style={{ width: '50px', height: '50px', borderRadius: '50%' }}
                />
            </div>
            <Tabs activeKey={activeTab} onSelect={(tab) => setActiveTab(tab)} className="mb-3">
                <Tab eventKey="overview" title="Overview">
                    <OverviewTab user={user} />
                </Tab>
                <Tab eventKey="statistics" title="Deck Statistics">
                    <StatisticsTab user={user} />
                </Tab>
                <Tab eventKey="league" title="League">
                    <LeagueTab currentLeague={currentLeague} />
                </Tab>
                <Tab eventKey="settings" title="Settings">
                    <SettingsTab user={user} handlePictureUpdate={handlePictureUpdate} />
                </Tab>
            </Tabs>
        </div>
    );
};

export default Profile;