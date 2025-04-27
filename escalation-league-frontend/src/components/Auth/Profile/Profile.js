import React, { useEffect, useState } from 'react';
import { Tabs, Tab } from 'react-bootstrap';
import OverviewTab from './OverviewTab';
import SettingsTab from './SettingsTab';
import StatisticsTab from './StatisticsTab';
import LeagueTab from './LeagueTab';

const Profile = () => {
    const [user, setUser] = useState(null);
    const [currentLeague, setCurrentLeague] = useState(null);
    const [error, setError] = useState('');
    const [activeTab, setActiveTab] = useState('overview');
    const [newPicture, setNewPicture] = useState(null);

    useEffect(() => {
        fetch(`${process.env.REACT_APP_BACKEND_URL}/auth/profile`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${localStorage.getItem('token')}`,
            },
        })
            .then((res) => {
                if (!res.ok) {
                    throw new Error('Failed to fetch profile data.');
                }
                return res.json();
            })
            .then((data) => {
                setUser(data.user);
                setCurrentLeague(data.currentLeague);
            })
            .catch((err) => {
                setError(err.message);
            });
    }, []);

    const handlePictureChange = (e) => {
        const file = e.target.files[0];
        setNewPicture(file);
    };

    const handlePictureUpload = () => {
        if (!newPicture) return;

        const formData = new FormData();
        formData.append('picture', newPicture);

        fetch(`${process.env.REACT_APP_BACKEND_URL}/auth/profile/picture`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${localStorage.getItem('token')}`,
            },
            body: formData,
        })
            .then((res) => res.json())
            .then((data) => {
                setUser((prevUser) => ({ ...prevUser, picture: data.picture }));
            })
            .catch((err) => {
                setError(err.message);
            });
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
                    src={user.picture}
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
                    <SettingsTab
                        user={user}
                        handlePictureChange={handlePictureChange}
                        handlePictureUpload={handlePictureUpload}
                    />
                </Tab>
            </Tabs>
        </div>
    );
};

export default Profile;