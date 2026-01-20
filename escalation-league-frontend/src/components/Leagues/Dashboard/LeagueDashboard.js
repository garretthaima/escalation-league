import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getLeagueDetails, getLeagueStats } from '../../../api/leaguesApi';
import { isUserInLeague, getLeagueParticipants, getUserLeagueStats } from '../../../api/userLeaguesApi';
import { getMetagameAnalysis } from '../../../api/metagameApi';
import { usePermissions } from '../../context/PermissionsProvider';
import CollapsibleSection from '../../Shared/CollapsibleSection';
import UserStandingCard from './UserStandingCard';
import LeaderboardSection from './LeaderboardSection';
import MetagamePreview from './MetagamePreview';
import ParticipantsSection from './ParticipantsSection';
import UpdateCommanderModal from '../UpdateCommanderModal';
import './LeagueDashboard.css';

const LeagueDashboard = () => {
    const navigate = useNavigate();
    const { user, loading: loadingPermissions } = usePermissions();

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Data state
    const [league, setLeague] = useState(null);
    const [userStats, setUserStats] = useState(null);
    const [leaderboard, setLeaderboard] = useState([]);
    const [participants, setParticipants] = useState([]);
    const [metagame, setMetagame] = useState(null);
    const [showCommanderModal, setShowCommanderModal] = useState(false);

    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                setLoading(true);
                setError(null);

                // Check if user is in a league
                const { inLeague, league: activeLeague } = await isUserInLeague();
                if (!inLeague) {
                    navigate('/leagues/signup');
                    return;
                }

                const leagueId = activeLeague.league_id;

                // Fetch all data in parallel
                const [leagueDetails, userStatsData, leaderboardData, participantsData, metagameData] = await Promise.all([
                    getLeagueDetails(leagueId),
                    getUserLeagueStats(leagueId),
                    getLeagueStats(leagueId).then(data => data.leaderboard || []).catch(() => []),
                    getLeagueParticipants(leagueId).catch(() => []),
                    getMetagameAnalysis(leagueId).catch(() => null)
                ]);

                setLeague(leagueDetails);
                setUserStats(userStatsData);
                setLeaderboard(leaderboardData);
                setParticipants(participantsData);
                setMetagame(metagameData);

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
    }, [loadingPermissions, navigate, user?.id]);

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
                    <div className="spinner-border" role="status">
                        <span className="visually-hidden">Loading...</span>
                    </div>
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

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            timeZone: 'UTC'
        });
    };

    return (
        <div className="container mt-4 league-dashboard">
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
                                ${league.weekly_budget}/week budget
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
                <MetagamePreview metagame={metagame} leagueId={league.id} />
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
