import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getLeagueDetails, getLeagueStats } from '../../../api/leaguesApi';
import { getLeagueParticipants, getUserLeagueStats } from '../../../api/userLeaguesApi';
import { getMetagameAnalysis } from '../../../api/metagameApi';
import { usePermissions } from '../../../context/PermissionsProvider';
import { calculateTotalSeasonBudget, calculateWeeksFromDates } from '../../../utils/budgetCalculations';
import { formatDate } from '../../../utils/dateFormatter';
import CollapsibleSection from '../../Shared/CollapsibleSection';
import LoadingSpinner from '../../Shared/LoadingSpinner';
import { DiscordPromptBanner } from '../../Shared';
import UserStandingCard from './UserStandingCard';
import LeaderboardSection from './LeaderboardSection';
import MetagamePreview from './MetagamePreview';
import ParticipantsSection from './ParticipantsSection';
import UpdateCommanderModal from '../UpdateCommanderModal';
import './LeagueDashboard.css';

const LeagueDashboard = () => {
    const navigate = useNavigate();
    const { user, loading: loadingPermissions, activeLeague: contextLeague } = usePermissions();

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Data state
    const [league, setLeague] = useState(null);
    const [userStats, setUserStats] = useState(null);
    const [leaderboard, setLeaderboard] = useState([]);
    const [participants, setParticipants] = useState([]);
    const [metagame, setMetagame] = useState(null);
    const [metagameLoading, setMetagameLoading] = useState(false);
    const [showCommanderModal, setShowCommanderModal] = useState(false);

    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                setLoading(true);
                setError(null);

                // Check if user is in a league (from context)
                if (!contextLeague) {
                    navigate('/leagues/signup');
                    return;
                }

                const leagueId = contextLeague.id;

                // Fetch essential data in parallel (fast endpoints)
                const [leagueDetails, userStatsData, leaderboardData, participantsData] = await Promise.all([
                    getLeagueDetails(leagueId),
                    getUserLeagueStats(leagueId),
                    getLeagueStats(leagueId).then(data => data.leaderboard || []).catch(() => []),
                    getLeagueParticipants(leagueId).catch(() => [])
                ]);

                setLeague(leagueDetails);
                setUserStats(userStatsData);
                setLeaderboard(leaderboardData);
                setParticipants(participantsData);

                // Find user's rank in leaderboard
                if (userStatsData && leaderboardData.length > 0) {
                    const userRank = leaderboardData.find(p => p.player_id === user?.id);
                    if (userRank) {
                        setUserStats(prev => ({ ...prev, rank: userRank.rank }));
                    }
                }
            } catch (err) {
                console.error('Error fetching dashboard data:', err);
                setError('Failed to load league dashboard.');
            } finally {
                setLoading(false);
            }
        };

        if (!loadingPermissions) {
            fetchDashboardData();
        }
    }, [loadingPermissions, navigate, user?.id, contextLeague]);

    // Lazy load metagame data after dashboard renders
    useEffect(() => {
        const fetchMetagameData = async () => {
            if (!league?.id || metagame !== null) return;

            setMetagameLoading(true);
            try {
                const metagameData = await getMetagameAnalysis(league.id);
                setMetagame(metagameData);
            } catch (err) {
                console.error('Error fetching metagame data:', err);
                // Silently fail - metagame is not critical
            } finally {
                setMetagameLoading(false);
            }
        };

        fetchMetagameData();
    }, [league?.id, metagame]);

    const handleCommanderUpdate = () => {
        setShowCommanderModal(false);
        // Refresh user stats
        if (league?.id) {
            getUserLeagueStats(league.id).then(setUserStats);
        }
    };

    if (loadingPermissions || loading) {
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
                <div className="alert alert-danger">{error}</div>
            </div>
        );
    }

    if (!league) {
        return null;
    }

    return (
        <div className="container mt-4 league-dashboard">
            {/* Discord Prompt Banner */}
            <DiscordPromptBanner />

            {/* Hero Section */}
            <div className="dashboard-hero mb-4">
                <div className="row align-items-center">
                    <div className="col-md-8">
                        <h1 className="mb-2">{league.name}</h1>
                        <p className="text-muted mb-2">{league.description}</p>
                        <div className="d-flex flex-wrap gap-3">
                            <span>
                                <i className="fas fa-calendar me-1"></i>
                                Week {league.current_week}
                            </span>
                            <span>
                                <i className="fas fa-clock me-1"></i>
                                {formatDate(league.start_date)} - {formatDate(league.end_date)}
                            </span>
                            <span>
                                <i className="fas fa-dollar-sign me-1"></i>
                                ${calculateTotalSeasonBudget(league.number_of_weeks || calculateWeeksFromDates(league.start_date, league.end_date), league.weekly_budget).toFixed(2)} season budget
                            </span>
                        </div>
                    </div>
                    <div className="col-md-4 text-md-end mt-3 mt-md-0">
                        <div className="d-flex gap-2 justify-content-md-end">
                            <a href="/leagues/budget" className="btn btn-outline-primary btn-sm">
                                <i className="fas fa-coins me-1"></i> Budget Tracker
                            </a>
                        </div>
                    </div>
                </div>
            </div>

            {/* Your Standing Card */}
            <UserStandingCard
                userStats={userStats}
                leagueId={league.id}
                onUpdateCommander={() => setShowCommanderModal(true)}
            />

            {/* Leaderboard Section */}
            <CollapsibleSection
                title="Leaderboard"
                icon="fas fa-trophy"
                badge={leaderboard.length}
                id="leaderboard"
                defaultOpen={true}
            >
                <LeaderboardSection
                    leaderboard={leaderboard}
                    leagueId={league.id}
                    currentUserId={user?.id}
                    compact={true}
                />
            </CollapsibleSection>

            {/* Metagame Preview */}
            <CollapsibleSection
                title="Metagame Insights"
                icon="fas fa-chart-pie"
                id="metagame"
                defaultOpen={true}
                actions={
                    <span className="badge bg-warning text-dark">BETA</span>
                }
            >
                <MetagamePreview metagame={metagame} leagueId={league.id} loading={metagameLoading} />
            </CollapsibleSection>

            {/* Participants Section */}
            <CollapsibleSection
                title="Participants"
                icon="fas fa-users"
                badge={participants.length}
                id="participants"
                defaultOpen={false}
            >
                <ParticipantsSection participants={participants} leagueId={league.id} />
            </CollapsibleSection>

            {/* Update Commander Modal */}
            <UpdateCommanderModal
                show={showCommanderModal}
                onHide={() => setShowCommanderModal(false)}
                onUpdate={handleCommanderUpdate}
                leagueId={league.id}
                currentCommander={userStats?.current_commander}
                currentPartner={userStats?.commander_partner}
                currentDeckUrl={userStats?.decklist_url}
            />
        </div>
    );
};

export default LeagueDashboard;
