import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useLocation, Link } from 'react-router-dom';
import { useToast } from '../../context/ToastContext';
import { usePermissions } from '../../context/PermissionsProvider';
import { getLeagueDetails, setActiveLeague } from '../../api/leaguesApi';
import { getTournamentStatus } from '../../api/tournamentApi';
import { formatDate } from '../../utils/dateFormatter';
import TournamentAdminPanel from '../Tournament/TournamentAdminPanel';
import {
    LeagueSettingsTab,
    LeagueUsersTab,
    LeaguePodsTab,
    AttendanceAdminTab
} from './tabs';
import './LeagueDashboardPage.css';

const LeagueDashboardPage = () => {
    const { leagueId } = useParams();
    const location = useLocation();
    const { showToast } = useToast();
    const { permissions } = usePermissions();

    // State
    const [league, setLeague] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [tournamentData, setTournamentData] = useState(null);
    const [tournamentLoading, setTournamentLoading] = useState(false);

    // Tab state from URL hash
    const getInitialTab = () => {
        const hash = location.hash.replace('#', '');
        if (['settings', 'users', 'attendance', 'pods', 'tournament'].includes(hash)) {
            return hash;
        }
        return 'settings';
    };
    const [activeTab, setActiveTab] = useState(getInitialTab);

    const hasTournamentManage = permissions.some(p => p.name === 'tournament_manage');

    // Calculate current week
    const calculateCurrentWeek = () => {
        if (!league?.start_date) return null;
        const start = new Date(league.start_date);
        const now = new Date();
        const diffTime = now - start;
        const diffWeeks = Math.floor(diffTime / (1000 * 60 * 60 * 24 * 7)) + 1;
        return Math.max(1, Math.min(diffWeeks, league.number_of_weeks || diffWeeks));
    };

    // Fetch league data
    const fetchLeague = useCallback(async () => {
        if (!leagueId) return;

        try {
            setLoading(true);
            const data = await getLeagueDetails(leagueId);
            setLeague(data);
        } catch (err) {
            console.error('Error fetching league:', err);
            setError('Failed to load league. It may not exist or you may not have access.');
        } finally {
            setLoading(false);
        }
    }, [leagueId]);

    // Fetch tournament data
    const fetchTournamentData = useCallback(async () => {
        if (!leagueId) return;
        setTournamentLoading(true);
        try {
            const data = await getTournamentStatus(leagueId);
            setTournamentData(data);
        } catch (err) {
            console.error('Error fetching tournament data:', err);
        } finally {
            setTournamentLoading(false);
        }
    }, [leagueId]);

    useEffect(() => {
        fetchLeague();
    }, [fetchLeague]);

    useEffect(() => {
        if (activeTab === 'tournament' && leagueId) {
            fetchTournamentData();
        }
    }, [activeTab, leagueId, fetchTournamentData]);

    // Update URL hash when tab changes
    const handleTabChange = (tab) => {
        setActiveTab(tab);
        window.history.replaceState(null, '', `#${tab}`);
    };

    // Handle set as active league
    const handleSetActive = async () => {
        try {
            await setActiveLeague(parseInt(leagueId));
            showToast('League set as active!', 'success');
            fetchLeague();
        } catch (err) {
            showToast('Failed to set league as active.', 'error');
        }
    };

    // Handle league update from settings tab
    const handleLeagueUpdate = () => {
        fetchLeague();
    };

    const currentWeek = calculateCurrentWeek();

    // Render loading state
    if (loading) {
        return (
            <div className="container-fluid mt-4">
                <div className="text-center py-5">
                    <div className="spinner-border" role="status">
                        <span className="visually-hidden">Loading...</span>
                    </div>
                </div>
            </div>
        );
    }

    // Render error state
    if (error) {
        return (
            <div className="container-fluid mt-4">
                <div className="alert alert-danger">
                    <i className="fas fa-exclamation-triangle me-2"></i>
                    {error}
                </div>
                <Link to="/admin/leagues" className="btn btn-outline-secondary">
                    <i className="fas fa-arrow-left me-2"></i>
                    Back to All Leagues
                </Link>
            </div>
        );
    }

    // Render not found state
    if (!league) {
        return (
            <div className="container-fluid mt-4">
                <div className="alert alert-warning">
                    <i className="fas fa-exclamation-triangle me-2"></i>
                    League not found.
                </div>
                <Link to="/admin/leagues" className="btn btn-outline-secondary">
                    <i className="fas fa-arrow-left me-2"></i>
                    Back to All Leagues
                </Link>
            </div>
        );
    }

    return (
        <div className="container-fluid mt-4">
            <div className="league-dashboard">
                {/* Back Link */}
                <Link to="/admin/leagues" className="back-link">
                    <i className="fas fa-arrow-left me-2"></i>
                    All Leagues
                </Link>

                {/* League Header */}
                <div className="league-dashboard-header">
                    <div className="league-header-info">
                        <div className="league-header-title">
                            <h2>{league.name}</h2>
                            <div className="league-header-badges">
                                {league.is_active && (
                                    <span className="badge bg-success">
                                        <i className="fas fa-star me-1"></i>
                                        Active League
                                    </span>
                                )}
                                {league.league_phase && league.league_phase !== 'regular_season' && (
                                    <span className="badge bg-warning text-dark">
                                        <i className="fas fa-trophy me-1"></i>
                                        {league.league_phase === 'tournament' ? 'Tournament Phase' : league.league_phase}
                                    </span>
                                )}
                            </div>
                        </div>
                        <div className="league-header-meta">
                            <span className="league-meta-item">
                                <i className="fas fa-calendar me-1"></i>
                                {formatDate(league.start_date)} - {formatDate(league.end_date)}
                            </span>
                            {currentWeek && league.number_of_weeks && (
                                <span className="league-meta-item">
                                    <i className="fas fa-calendar-week me-1"></i>
                                    Week {currentWeek} of {league.number_of_weeks}
                                </span>
                            )}
                            <span className="league-meta-item">
                                <i className="fas fa-users me-1"></i>
                                {league.participant_count || 0} players
                            </span>
                            <span className="league-meta-item">
                                <i className="fas fa-coins me-1"></i>
                                ${league.weekly_budget || 0}/week budget
                            </span>
                        </div>
                    </div>
                    <div className="league-header-actions">
                        {!league.is_active && (
                            <button
                                className="btn btn-success"
                                onClick={handleSetActive}
                            >
                                <i className="fas fa-star me-2"></i>
                                Set as Active
                            </button>
                        )}
                    </div>
                </div>

                {/* Tabs */}
                <ul className="nav nav-tabs league-dashboard-tabs">
                    <li className="nav-item">
                        <button
                            className={`nav-link ${activeTab === 'settings' ? 'active' : ''}`}
                            onClick={() => handleTabChange('settings')}
                            title="Settings"
                        >
                            <i className="fas fa-cog"></i>
                            <span className="tab-text ms-1">Settings</span>
                        </button>
                    </li>
                    <li className="nav-item">
                        <button
                            className={`nav-link ${activeTab === 'users' ? 'active' : ''}`}
                            onClick={() => handleTabChange('users')}
                            title="Users"
                        >
                            <i className="fas fa-users"></i>
                            <span className="tab-text ms-1">Users</span>
                        </button>
                    </li>
                    <li className="nav-item">
                        <button
                            className={`nav-link ${activeTab === 'attendance' ? 'active' : ''}`}
                            onClick={() => handleTabChange('attendance')}
                            title="Attendance"
                        >
                            <i className="fas fa-clipboard-check"></i>
                            <span className="tab-text ms-1">Attendance</span>
                        </button>
                    </li>
                    <li className="nav-item">
                        <button
                            className={`nav-link ${activeTab === 'pods' ? 'active' : ''}`}
                            onClick={() => handleTabChange('pods')}
                            title="Pods"
                        >
                            <i className="fas fa-gamepad"></i>
                            <span className="tab-text ms-1">Pods</span>
                        </button>
                    </li>
                    {hasTournamentManage && (
                        <li className="nav-item">
                            <button
                                className={`nav-link ${activeTab === 'tournament' ? 'active' : ''}`}
                                onClick={() => handleTabChange('tournament')}
                                title="Tournament"
                            >
                                <i className="fas fa-trophy"></i>
                                <span className="tab-text ms-1">Tournament</span>
                            </button>
                        </li>
                    )}
                </ul>

                {/* Tab Content */}
                <div className="league-dashboard-content">
                    {activeTab === 'settings' && (
                        <LeagueSettingsTab
                            leagueId={parseInt(leagueId)}
                            league={league}
                            onUpdate={handleLeagueUpdate}
                        />
                    )}

                    {activeTab === 'users' && (
                        <LeagueUsersTab leagueId={parseInt(leagueId)} />
                    )}

                    {activeTab === 'attendance' && (
                        <AttendanceAdminTab leagueId={parseInt(leagueId)} />
                    )}

                    {activeTab === 'pods' && (
                        <LeaguePodsTab leagueId={parseInt(leagueId)} />
                    )}

                    {activeTab === 'tournament' && hasTournamentManage && (
                        <div>
                            {tournamentLoading ? (
                                <div className="text-center py-5">
                                    <div className="spinner-border" role="status">
                                        <span className="visually-hidden">Loading...</span>
                                    </div>
                                </div>
                            ) : (
                                <TournamentAdminPanel
                                    leagueId={parseInt(leagueId)}
                                    league={tournamentData?.league}
                                    podStats={tournamentData?.podStats}
                                    onRefresh={fetchTournamentData}
                                />
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default LeagueDashboardPage;
