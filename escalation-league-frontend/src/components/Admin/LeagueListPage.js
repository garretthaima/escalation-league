import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { getLeagues } from '../../api/leaguesApi';
import { formatDate } from '../../utils/dateFormatter';
import CollapsibleSection from '../Shared/CollapsibleSection';
import './LeagueListPage.css';

// Tab display names for legacy route redirects
const TAB_DISPLAY_NAMES = {
    pods: 'Pods',
    attendance: 'Attendance',
    settings: 'Settings',
    users: 'Users',
    tournament: 'Tournament'
};

// Stat Card Component
const StatCard = ({ icon, label, value, variant = 'default' }) => (
    <div className={`stat-card stat-card-${variant}`}>
        <i className={`fas ${icon} stat-card-icon`}></i>
        <div className="stat-card-value">{value}</div>
        <div className="stat-card-label">{label}</div>
    </div>
);

// League Card Component - clickable to navigate to dashboard
const LeagueCard = ({ league, onClick }) => {
    const calculateCurrentWeek = () => {
        if (!league.start_date) return null;
        const start = new Date(league.start_date);
        const now = new Date();
        const diffTime = now - start;
        const diffWeeks = Math.floor(diffTime / (1000 * 60 * 60 * 24 * 7)) + 1;
        return Math.max(1, Math.min(diffWeeks, league.number_of_weeks || diffWeeks));
    };

    const currentWeek = calculateCurrentWeek();

    return (
        <div
            className={`league-card league-card-clickable ${league.is_active ? 'league-card-active' : ''}`}
            onClick={onClick}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && onClick()}
        >
            <div className="league-card-header">
                <div className="league-card-title">
                    <h5>{league.name}</h5>
                    {league.is_active && (
                        <span className="badge bg-success ms-2">
                            <i className="fas fa-star me-1"></i>Active
                        </span>
                    )}
                </div>
                {league.league_phase && league.league_phase !== 'regular_season' && (
                    <span className="badge bg-warning text-dark">
                        <i className="fas fa-trophy me-1"></i>
                        {league.league_phase === 'tournament' ? 'Tournament' : league.league_phase}
                    </span>
                )}
            </div>
            <div className="league-card-body">
                <div className="league-card-stats">
                    {league.is_active && currentWeek && league.number_of_weeks && (
                        <div className="league-stat">
                            <i className="fas fa-calendar-week me-1"></i>
                            Week {currentWeek} of {league.number_of_weeks}
                        </div>
                    )}
                    <div className="league-stat">
                        <i className="fas fa-calendar me-1"></i>
                        {formatDate(league.start_date)} - {formatDate(league.end_date)}
                    </div>
                    <div className="league-stat">
                        <i className="fas fa-users me-1"></i>
                        {league.participant_count || 0} players
                    </div>
                    <div className="league-stat">
                        <i className="fas fa-coins me-1"></i>
                        ${league.weekly_budget || 0}/week budget
                    </div>
                </div>
            </div>
            <div className="league-card-footer">
                <span className="text-muted small">
                    <i className="fas fa-arrow-right me-1"></i>
                    Click to manage
                </span>
            </div>
        </div>
    );
};

// Main League List Page component
const LeagueListPage = () => {
    const navigate = useNavigate();
    const location = useLocation();

    // State
    const [leagues, setLeagues] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Check if we have a hash for tab redirection (from legacy routes)
    const targetTab = location.hash ? location.hash : '';
    const targetTabName = targetTab.replace('#', '');

    // Calculate stats
    const activeLeague = leagues.find(l => l.is_active);
    const totalPlayers = leagues.reduce((sum, l) => sum + (l.participant_count || 0), 0);

    // Fetch data on mount
    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            const leaguesData = await getLeagues();
            setLeagues(leaguesData);
        } catch (err) {
            setError('Failed to fetch data. Please try again.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // Auto-redirect to active league if coming from a legacy route with a target tab
    useEffect(() => {
        if (targetTabName && TAB_DISPLAY_NAMES[targetTabName] && activeLeague && leagues.length > 0) {
            // Auto-navigate to active league with the target tab
            navigate(`/admin/leagues/${activeLeague.id}${targetTab}`, { replace: true });
        }
    }, [targetTabName, activeLeague, leagues, navigate, targetTab]);

    // Handlers
    const handleLeagueClick = (league) => {
        // Preserve the hash (targetTab) when navigating to the league dashboard
        navigate(`/admin/leagues/${league.id}${targetTab}`);
    };

    // Render
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

    if (error) {
        return (
            <div className="container-fluid mt-4">
                <div className="alert alert-danger">{error}</div>
            </div>
        );
    }

    return (
        <div className="container-fluid mt-4">
            <div className="league-list-page">
                {/* Header */}
                <div className="league-list-header">
                    <div>
                        <h2 className="mb-1">
                            <i className="fas fa-trophy me-2"></i>
                            League Management
                        </h2>
                        <p className="text-muted mb-0">Select a league to manage settings, players, pods, and more</p>
                    </div>
                    <button
                        className="btn btn-primary"
                        onClick={() => navigate('/admin/leagues/create')}
                    >
                        <i className="fas fa-plus me-2"></i>
                        Create League
                    </button>
                </div>

                {/* Target Tab Info (shown when redirected from legacy routes - only if no active league) */}
                {targetTabName && TAB_DISPLAY_NAMES[targetTabName] && !activeLeague && (
                    <div className="alert alert-info d-flex align-items-center mb-3">
                        <i className="fas fa-info-circle me-2"></i>
                        <span>
                            Select a league to open the <strong>{TAB_DISPLAY_NAMES[targetTabName]}</strong> tab.
                        </span>
                    </div>
                )}

                {/* Stats Row */}
                <div className="stats-row">
                    <StatCard
                        icon="fa-trophy"
                        label="Total Leagues"
                        value={leagues.length}
                        variant="primary"
                    />
                    <StatCard
                        icon="fa-star"
                        label="Active League"
                        value={activeLeague?.name || 'None'}
                        variant="success"
                    />
                    <StatCard
                        icon="fa-users"
                        label="Total Players"
                        value={totalPlayers}
                        variant="info"
                    />
                </div>

                {/* Leagues Section */}
                <CollapsibleSection
                    title="Leagues"
                    icon="fas fa-trophy"
                    badge={leagues.length}
                    defaultOpen={true}
                >
                    {leagues.length === 0 ? (
                        <div className="text-center text-muted py-4">
                            <i className="fas fa-trophy fa-3x mb-3 opacity-50"></i>
                            <p>No leagues created yet.</p>
                            <button
                                className="btn btn-primary"
                                onClick={() => navigate('/admin/leagues/create')}
                            >
                                <i className="fas fa-plus me-2"></i>
                                Create Your First League
                            </button>
                        </div>
                    ) : (
                        <div className="league-cards-grid">
                            {leagues.map((league) => (
                                <LeagueCard
                                    key={league.id}
                                    league={league}
                                    onClick={() => handleLeagueClick(league)}
                                />
                            ))}
                        </div>
                    )}
                </CollapsibleSection>
            </div>
        </div>
    );
};

export default LeagueListPage;
