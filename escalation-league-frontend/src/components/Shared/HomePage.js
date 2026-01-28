import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getActiveLeague, getLeagueStats } from '../../api/leaguesApi';
import { getPods } from '../../api/podsApi';
import { usePermissions } from '../../context/PermissionsProvider';
import { parseDate } from '../../utils/dateFormatter';
import LeaderboardSection from '../Leagues/Dashboard/LeaderboardSection';
import LiveStatsBar from './LiveStatsBar';
import ActiveLeagueCard from './ActiveLeagueCard';
import RecentWinners from './RecentWinners';
import './Shared.css';

const HomePage = () => {
    const navigate = useNavigate();
    const { activeLeague: userActiveLeague, user, loading: authLoading } = usePermissions();
    const isLoggedIn = !!user;

    const [loading, setLoading] = useState(true);
    const [league, setLeague] = useState(null);
    const [leaderboard, setLeaderboard] = useState([]);
    const [recentGames, setRecentGames] = useState([]);
    const [stats, setStats] = useState({
        activeGames: 0,
        totalPlayers: 0,
        completedGames: 0
    });

    useEffect(() => {
        const fetchLeagueData = async () => {
            // Only fetch league data if user is logged in
            if (!isLoggedIn || authLoading) {
                setLoading(false);
                return;
            }

            try {
                setLoading(true);

                // Fetch active league first
                const activeLeague = await getActiveLeague().catch(() => null);
                setLeague(activeLeague);

                if (activeLeague?.id) {
                    // Fetch league stats and pods in parallel
                    const [leagueStatsData, activePods, completedPods] = await Promise.all([
                        getLeagueStats(activeLeague.id).then(data => data.leaderboard || []).catch(() => []),
                        getPods({ confirmation_status: 'active', league_id: activeLeague.id }).catch(() => []),
                        getPods({ confirmation_status: 'complete', league_id: activeLeague.id }).catch(() => [])
                    ]);

                    setLeaderboard(leagueStatsData.slice(0, 5)); // Top 5 only

                    // Get recent completed games (last 3)
                    const sortedCompleted = completedPods.sort((a, b) =>
                        parseDate(b.created_at) - parseDate(a.created_at)
                    );
                    setRecentGames(sortedCompleted.slice(0, 3));

                    // Set stats
                    setStats({
                        activeGames: activePods.length,
                        totalPlayers: leagueStatsData.length,
                        completedGames: completedPods.length
                    });
                }
            } catch (err) {
                console.error('Error fetching homepage data:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchLeagueData();
    }, [isLoggedIn, authLoading]);

    return (
        <div className="homepage">
            {/* Hero Section */}
            <div className="hero-section">
                <div className="hero-background"></div>
                <div className="hero-content">
                    <h1>Welcome to Escalation League</h1>
                    <p>Compete, track your progress, and climb the leaderboard!</p>
                    <button className="btn btn-primary btn-lg" onClick={() => navigate('/leagues')}>
                        Join a League
                    </button>
                </div>
            </div>

            {/* Live Stats Bar - only show when logged in */}
            {isLoggedIn && (
                <LiveStatsBar
                    activeGames={stats.activeGames}
                    totalPlayers={stats.totalPlayers}
                    completedGames={stats.completedGames}
                    loading={loading}
                />
            )}

            {/* Main Content */}
            <div className="container py-4">
                {!isLoggedIn ? (
                    /* Logged Out View - Show sign in prompt */
                    <div className="row justify-content-center">
                        <div className="col-lg-8">
                            <div className="card text-center py-5">
                                <div className="card-body">
                                    <i className="fas fa-lock fa-3x text-muted mb-4"></i>
                                    <h3 className="mb-3">Sign in to view league info</h3>
                                    <p className="text-muted mb-4">
                                        Access the leaderboard, see active games, track your budget, and more.
                                    </p>
                                    <button
                                        className="btn btn-primary btn-lg"
                                        onClick={() => navigate('/signin')}
                                    >
                                        <i className="fas fa-sign-in-alt me-2"></i>
                                        Sign In
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                /* Logged In View - Show league data */
                <div className="row g-4">
                    {/* Active League Card */}
                    <div className="col-lg-4">
                        <ActiveLeagueCard
                            league={league}
                            playerCount={stats.totalPlayers}
                        />
                    </div>

                    {/* Leaderboard Preview */}
                    <div className="col-lg-5">
                        <div className="card h-100">
                            <div className="card-body">
                                <h5 className="card-title mb-3">
                                    <i className="fas fa-trophy me-2 text-brand-gold"></i>
                                    Top Players
                                </h5>
                                {loading ? (
                                    <div className="text-center py-4">
                                        <i className="fas fa-spinner fa-spin fa-2x text-muted"></i>
                                    </div>
                                ) : leaderboard.length > 0 ? (
                                    <>
                                        <div className="homepage-leaderboard">
                                            <LeaderboardSection
                                                leaderboard={leaderboard}
                                                leagueId={league?.id}
                                                compact={true}
                                            />
                                        </div>
                                        <div className="text-center mt-3">
                                            <button
                                                className="btn btn-link btn-sm"
                                                onClick={() => navigate('/leagues')}
                                            >
                                                View Full Leaderboard
                                                <i className="fas fa-chevron-right ms-1"></i>
                                            </button>
                                        </div>
                                    </>
                                ) : (
                                    <div className="text-center text-muted py-4">
                                        <i className="fas fa-trophy fa-2x mb-3"></i>
                                        <p>No standings yet</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Recent Winners */}
                    <div className="col-lg-3">
                        <RecentWinners games={recentGames} loading={loading} />
                    </div>
                </div>
                )}

                {/* Quick Links - Show for logged in users only */}
                {isLoggedIn && (
                    <div className="quick-links mt-4">
                        <div
                            className={`homepage-card ${userActiveLeague ? 'disabled' : ''}`}
                            onClick={() => !userActiveLeague && navigate('/leagues')}
                        >
                            <i className={`fas fa-users fa-2x mb-3 ${userActiveLeague ? 'text-muted' : 'text-primary'}`}></i>
                            <h3>{userActiveLeague ? 'Already in League' : 'Join a League'}</h3>
                            <p>{userActiveLeague
                                ? `You're in ${userActiveLeague.name || 'a league'}`
                                : 'Find and join an active league to start competing.'
                            }</p>
                        </div>
                        <div className="homepage-card" onClick={() => navigate('/pods')}>
                            <i className="fas fa-gamepad fa-2x mb-3 text-success"></i>
                            <h3>View Games</h3>
                            <p>See the current games and their participants.</p>
                        </div>
                        <div className="homepage-card" onClick={() => navigate('/leagues')}>
                            <i className="fas fa-chart-line fa-2x mb-3 text-info"></i>
                            <h3>Leaderboard</h3>
                            <p>Track your progress and see how you rank.</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default HomePage;
