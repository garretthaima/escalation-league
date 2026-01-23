import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getUserProfile, updateUserProfile } from '../../../api/usersApi';
import { usePermissions } from '../../context/PermissionsProvider';
import LoadingSpinner from '../../Shared/LoadingSpinner';
import OverviewTab from './OverviewTab';
import SettingsTab from './SettingsTab';
import StatisticsTab from './StatisticsTab';
import LeagueTab from './LeagueTab';
import ActivityTab from './ActivityTab';
import './Profile.css';

const VALID_TABS = ['overview', 'statistics', 'league', 'activity', 'settings'];

const TAB_CONFIG = [
    { key: 'overview', label: 'Overview', icon: 'fa-user' },
    { key: 'statistics', label: 'Stats', icon: 'fa-chart-bar' },
    { key: 'league', label: 'League', icon: 'fa-trophy' },
    { key: 'activity', label: 'Activity', icon: 'fa-history' },
    { key: 'settings', label: 'Settings', icon: 'fa-cog' },
];

const Profile = () => {
    const [user, setUser] = useState(null);
    const [currentLeague, setCurrentLeague] = useState(null);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(true);
    const [searchParams, setSearchParams] = useSearchParams();
    const { activeLeague } = usePermissions();

    // Get tab from URL or default to 'overview'
    const tabFromUrl = searchParams.get('tab');
    const activeTab = VALID_TABS.includes(tabFromUrl) ? tabFromUrl : 'overview';

    const handleTabSelect = (tab) => {
        setSearchParams({ tab });
    };

    const fetchProfile = async () => {
        try {
            const data = await getUserProfile();
            setUser(data.user);
            setCurrentLeague(data.currentLeague);
        } catch (err) {
            console.error(err);
            // 401 errors are handled by axios interceptor
            if (!err.response || err.response.status !== 401) {
                setError('Failed to load profile.');
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProfile();
    }, []);

    const handlePictureUpdate = async (newPicture) => {
        try {
            await updateUserProfile({ picture: newPicture });
            setUser((prevUser) => ({ ...prevUser, picture: newPicture }));
        } catch (err) {
            console.error('Failed to update profile picture:', err);
            setError('Failed to update profile picture.');
        }
    };

    const getProfilePictureSrc = (picture) => {
        if (!picture) {
            return '/images/profile-pictures/avatar1.png';
        }
        if (picture.startsWith('http')) {
            return picture;
        }
        return picture;
    };

    // Calculate global stats (all-time, not league-specific)
    const getGlobalStats = () => {
        const totalWins = user?.wins || 0;
        const totalLosses = user?.losses || 0;
        const totalDraws = user?.draws || 0;
        const totalGames = totalWins + totalLosses + totalDraws;
        const winRate = totalGames > 0
            ? ((totalWins / totalGames) * 100).toFixed(0)
            : '0';

        return {
            gamesPlayed: totalGames,
            wins: totalWins,
            winRate,
            elo: user?.elo_rating || null // Placeholder for future ELO system
        };
    };

    if (loading) {
        return (
            <div className="container mt-4">
                <div className="text-center py-5">
                    <LoadingSpinner size="lg" />
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="container mt-4">
                <div className="alert alert-danger">
                    <i className="fas fa-exclamation-circle me-2"></i>
                    {error}
                </div>
            </div>
        );
    }

    if (!user) {
        return (
            <div className="container mt-4">
                <div className="alert alert-warning">
                    <i className="fas fa-info-circle me-2"></i>
                    Unable to load profile data.
                </div>
            </div>
        );
    }

    const globalStats = getGlobalStats();

    return (
        <div className="container mt-4">
            {/* Hero Header */}
            <div className="profile-hero">
                <div className="d-flex flex-column flex-md-row align-items-center gap-3">
                    <img
                        src={getProfilePictureSrc(user.picture)}
                        alt="Profile"
                        className="profile-avatar profile-avatar-lg"
                    />
                    <div className="text-center text-md-start">
                        <h1 className="profile-name">
                            {user.firstname || 'User'} {user.lastname || ''}
                        </h1>
                        <p className="profile-email mb-0">{user.email}</p>
                        <div className="profile-badges">
                            {activeLeague && (
                                <span className="profile-badge profile-badge-gold">
                                    <i className="fas fa-trophy"></i>
                                    {activeLeague.name}
                                </span>
                            )}
                            {user.google_id && (
                                <span className="profile-badge profile-badge-purple">
                                    <i className="fab fa-google"></i>
                                    Google
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Global Stats (All-Time) */}
                <div className="profile-stats">
                    <div className="profile-stat">
                        <div className="profile-stat-value">{globalStats.gamesPlayed}</div>
                        <div className="profile-stat-label">Games</div>
                    </div>
                    <div className="profile-stat">
                        <div className="profile-stat-value">{globalStats.wins}</div>
                        <div className="profile-stat-label">Wins</div>
                    </div>
                    <div className="profile-stat">
                        <div className="profile-stat-value">{globalStats.winRate}%</div>
                        <div className="profile-stat-label">Win Rate</div>
                    </div>
                    <div className="profile-stat">
                        <div className="profile-stat-value">{globalStats.elo || '—'}</div>
                        <div className="profile-stat-label">ELO</div>
                    </div>
                </div>
            </div>

            {/* Navigation */}
            <div className="profile-nav">
                {TAB_CONFIG.map(tab => (
                    <button
                        key={tab.key}
                        className={`profile-nav-item ${activeTab === tab.key ? 'active' : ''}`}
                        onClick={() => handleTabSelect(tab.key)}
                    >
                        <i className={`fas ${tab.icon}`}></i>
                        <span>{tab.label}</span>
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            <div className="profile-content">
                {activeTab === 'overview' && (
                    <OverviewTab user={user} currentLeague={currentLeague} />
                )}
                {activeTab === 'statistics' && (
                    <StatisticsTab user={user} currentLeague={currentLeague} />
                )}
                {activeTab === 'league' && (
                    <LeagueTab currentLeague={currentLeague} onCommanderUpdated={fetchProfile} />
                )}
                {activeTab === 'activity' && (
                    <ActivityTab />
                )}
                {activeTab === 'settings' && (
                    <SettingsTab user={user} handlePictureUpdate={handlePictureUpdate} />
                )}
            </div>
        </div>
    );
};

export default Profile;
