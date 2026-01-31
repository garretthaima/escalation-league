import React, { useEffect, useState, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { usePermissions } from '../../context/PermissionsProvider';
import TournamentAdminPanel from '../Tournament/TournamentAdminPanel';
import { AttendanceAdminTab, PodsAdminTab, SettingsAdminTab } from './tabs';
import { getTournamentStatus } from '../../api/tournamentApi';

const LeagueAdminPage = () => {
    const location = useLocation();
    const { activeLeague, permissions } = usePermissions();

    // Tab state - default to 'settings', but check URL hash
    const getInitialTab = () => {
        const hash = location.hash.replace('#', '');
        if (['settings', 'tournament', 'attendance', 'pods'].includes(hash)) {
            return hash;
        }
        return 'settings';
    };
    const [activeTab, setActiveTab] = useState(getInitialTab);

    // Tournament tab state
    const [tournamentData, setTournamentData] = useState(null);
    const [tournamentLoading, setTournamentLoading] = useState(false);

    const leagueId = activeLeague?.league_id || activeLeague?.id;
    const hasTournamentManage = permissions.some(p => p.name === 'tournament_manage');

    // Update URL hash when tab changes
    const handleTabChange = (tab) => {
        setActiveTab(tab);
        window.history.replaceState(null, '', `#${tab}`);
    };

    // Fetch tournament data when on tournament tab
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
        if (activeTab === 'tournament' && leagueId) {
            fetchTournamentData();
        }
    }, [activeTab, leagueId, fetchTournamentData]);

    return (
        <div className="container-fluid mt-4">
            <h2 className="mb-4">
                <i className="fas fa-cogs me-2"></i>
                League Management
            </h2>

            {/* Tabs */}
            <ul className="nav nav-tabs mb-4">
                <li className="nav-item">
                    <button
                        className={`nav-link ${activeTab === 'settings' ? 'active' : ''}`}
                        onClick={() => handleTabChange('settings')}
                    >
                        <i className="fas fa-sliders-h me-1"></i>
                        Settings
                    </button>
                </li>
                {hasTournamentManage && (
                    <li className="nav-item">
                        <button
                            className={`nav-link ${activeTab === 'tournament' ? 'active' : ''}`}
                            onClick={() => handleTabChange('tournament')}
                        >
                            <i className="fas fa-trophy me-1"></i>
                            Tournament
                        </button>
                    </li>
                )}
                <li className="nav-item">
                    <button
                        className={`nav-link ${activeTab === 'attendance' ? 'active' : ''}`}
                        onClick={() => handleTabChange('attendance')}
                    >
                        <i className="fas fa-clipboard-check me-1"></i>
                        Attendance
                    </button>
                </li>
                <li className="nav-item">
                    <button
                        className={`nav-link ${activeTab === 'pods' ? 'active' : ''}`}
                        onClick={() => handleTabChange('pods')}
                    >
                        <i className="fas fa-users me-1"></i>
                        Pods
                    </button>
                </li>
            </ul>

            {/* Tab Content */}
            {activeTab === 'settings' && <SettingsAdminTab />}

            {activeTab === 'tournament' && hasTournamentManage && (
                <div>
                    {!leagueId ? (
                        <div className="alert alert-warning">
                            <i className="fas fa-exclamation-triangle me-2"></i>
                            Please select an active league to manage the tournament.
                        </div>
                    ) : tournamentLoading ? (
                        <div className="text-center py-5">
                            <div className="spinner-border" role="status">
                                <span className="visually-hidden">Loading...</span>
                            </div>
                        </div>
                    ) : (
                        <TournamentAdminPanel
                            leagueId={leagueId}
                            league={tournamentData?.league}
                            podStats={tournamentData?.podStats}
                            onRefresh={fetchTournamentData}
                        />
                    )}
                </div>
            )}

            {activeTab === 'attendance' && <AttendanceAdminTab />}

            {activeTab === 'pods' && <PodsAdminTab />}
        </div>
    );
};

export default LeagueAdminPage;
