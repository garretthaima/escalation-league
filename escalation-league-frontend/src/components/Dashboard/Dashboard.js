import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getLeagueStats } from '../../api/leaguesApi';
import { getPods, logPodResult } from '../../api/podsApi';
import { getUserLeagueStats } from '../../api/userLeaguesApi';
import { usePermissions } from '../../context/PermissionsProvider';
import { useToast } from '../../context/ToastContext';
import { useWebSocket } from '../../context/WebSocketProvider';
import CollapsibleSection from '../Shared/CollapsibleSection';
import LoadingSpinner from '../Shared/LoadingSpinner';
import LeaderboardSection from '../Leagues/Dashboard/LeaderboardSection';
import DeclareResultModal from '../Pods/Dashboard/DeclareResultModal';
import LeagueInfoBanner from './LeagueInfoBanner';
import ActionItemsSection from './ActionItemsSection';
import QuickStatsCard from './QuickStatsCard';
import './Dashboard.css';

const Dashboard = () => {
    const { user, loading: permissionsLoading, activeLeague } = usePermissions();
    const { showToast } = useToast();
    const { socket, connected, joinLeague, leaveLeague } = useWebSocket();

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Data state
    const [userStats, setUserStats] = useState(null);
    const [leaderboard, setLeaderboard] = useState([]);
    const [pendingPods, setPendingPods] = useState([]);
    const [activePods, setActivePods] = useState([]);

    // Modal state
    const [showResultModal, setShowResultModal] = useState(false);
    const [selectedPodId, setSelectedPodId] = useState(null);

    const leagueId = activeLeague?.id || activeLeague?.league_id;

    // Fetch dashboard data
    useEffect(() => {
        const fetchDashboardData = async () => {
            if (permissionsLoading) return;

            try {
                setLoading(true);
                setError(null);

                // If user is not in a league, show empty state
                if (!activeLeague) {
                    setLoading(false);
                    return;
                }

                // Fetch all data in parallel
                const [userStatsData, leagueStatsData, allPods] = await Promise.all([
                    getUserLeagueStats(leagueId).catch(() => null),
                    getLeagueStats(leagueId).then(data => data.leaderboard || []).catch(() => []),
                    getPods({ league_id: leagueId }).catch(() => [])
                ]);

                setUserStats(userStatsData);
                setLeaderboard(leagueStatsData);

                // Find user's rank in leaderboard
                if (userStatsData && leagueStatsData.length > 0) {
                    const userRank = leagueStatsData.find(p => p.player_id === user?.id);
                    if (userRank) {
                        setUserStats(prev => ({ ...prev, rank: userRank.rank }));
                    }
                }

                // Filter pods for current user
                const userId = user?.id;
                const myPendingPods = allPods.filter(p =>
                    p.confirmation_status === 'pending' &&
                    p.participants?.some(part => part.player_id === userId && part.confirmed === 0)
                );
                const myActivePods = allPods.filter(p =>
                    p.confirmation_status === 'active' &&
                    p.participants?.some(part => part.player_id === userId)
                );

                setPendingPods(myPendingPods);
                setActivePods(myActivePods);

            } catch (err) {
                console.error('Error fetching dashboard data:', err);
                setError('Failed to load dashboard.');
            } finally {
                setLoading(false);
            }
        };

        fetchDashboardData();
    }, [permissionsLoading, activeLeague, leagueId, user?.id]);

    // WebSocket listeners for real-time updates
    useEffect(() => {
        if (!socket || !connected || !leagueId) return;

        joinLeague(leagueId);

        // Pod created
        socket.on('pod:created', (data) => {
            if (data.confirmation_status === 'active' &&
                data.participants?.some(p => p.player_id === user?.id)) {
                setActivePods(prev => [...prev, data]);
            }
        });

        // Winner declared - move from active to pending
        socket.on('pod:winner_declared', (data) => {
            const { podId } = data;
            setActivePods(prev => {
                const pod = prev.find(p => p.id === podId);
                if (pod) {
                    setPendingPods(pending => [...pending, { ...pod, confirmation_status: 'pending' }]);
                }
                return prev.filter(p => p.id !== podId);
            });
        });

        // Pod confirmed
        socket.on('pod:confirmed', (data) => {
            const { podId, playerId, isComplete } = data;

            if (isComplete) {
                setPendingPods(prev => prev.filter(p => p.id !== podId));
            } else {
                setPendingPods(prev => prev.map(pod => {
                    if (pod.id === podId && Array.isArray(pod.participants)) {
                        return {
                            ...pod,
                            participants: pod.participants.map(p =>
                                p.player_id === playerId ? { ...p, confirmed: 1 } : p
                            )
                        };
                    }
                    return pod;
                }));
            }
        });

        // Pod deleted
        socket.on('pod:deleted', (data) => {
            setActivePods(prev => prev.filter(p => p.id !== data.podId));
            setPendingPods(prev => prev.filter(p => p.id !== data.podId));
        });

        return () => {
            socket.off('pod:created');
            socket.off('pod:winner_declared');
            socket.off('pod:confirmed');
            socket.off('pod:deleted');
            if (leagueId) leaveLeague(leagueId);
        };
    }, [socket, connected, leagueId, user?.id, joinLeague, leaveLeague]);

    // Handlers
    const handleDeclareResult = (podId) => {
        setSelectedPodId(podId);
        setShowResultModal(true);
    };

    const handleDeclareWin = async () => {
        setShowResultModal(false);
        try {
            await logPodResult(selectedPodId, { result: 'win' });
            showToast('Winner declared! Waiting for confirmations.', 'success');
        } catch (err) {
            if (err.response?.data?.error?.includes('already been declared')) {
                showToast('A winner has already been declared.', 'info');
            } else {
                showToast(err.response?.data?.error || 'Failed to declare winner.', 'error');
            }
        }
    };

    const handleDeclareDraw = async () => {
        setShowResultModal(false);
        try {
            await logPodResult(selectedPodId, { result: 'draw' });
            showToast('Draw declared! Waiting for confirmations.', 'success');
        } catch (err) {
            showToast(err.response?.data?.error || 'Failed to declare draw.', 'error');
        }
    };

    const handleConfirmResult = async (podId) => {
        try {
            await logPodResult(podId, {});
            showToast('Game confirmed!', 'success');
            // Remove from pending list
            setPendingPods(prev => prev.filter(p => p.id !== podId));
        } catch (err) {
            showToast('Failed to confirm game.', 'error');
        }
    };

    // Loading state
    if (loading || permissionsLoading) {
        return (
            <div className="container mt-4">
                <div className="text-center py-5">
                    <LoadingSpinner size="lg" />
                </div>
            </div>
        );
    }

    // Error state
    if (error) {
        return (
            <div className="container mt-4">
                <div className="alert alert-danger">{error}</div>
            </div>
        );
    }

    // Not in a league state
    if (!activeLeague) {
        return (
            <div className="container mt-4">
                <div className="text-center py-5">
                    <i className="fas fa-trophy fa-4x text-muted mb-4"></i>
                    <h3>Welcome to Escalation League!</h3>
                    <p className="text-muted mb-4">
                        You're not part of any league yet. Join a league to start tracking your games.
                    </p>
                    <Link to="/leagues" className="btn btn-primary">
                        <i className="fas fa-search me-2"></i>
                        Find a League
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="container mt-4 dashboard">
            {/* League Context Banner */}
            <LeagueInfoBanner
                league={activeLeague}
                playerCount={leaderboard.length}
            />

            {/* Action Items - Pending confirmations and active games */}
            <ActionItemsSection
                pendingPods={pendingPods}
                activePods={activePods}
                userId={user?.id}
                onConfirm={handleConfirmResult}
                onDeclareResult={handleDeclareResult}
            />

            {/* Main content: Stats + Leaderboard */}
            <div className="row">
                {/* Your Stats */}
                <div className="col-lg-4 col-md-5 mb-4">
                    <QuickStatsCard
                        userStats={userStats}
                        totalPlayers={leaderboard.length}
                        leagueId={leagueId}
                    />
                </div>

                {/* Leaderboard */}
                <div className="col-lg-8 col-md-7 mb-4">
                    <CollapsibleSection
                        title="Leaderboard"
                        icon="fas fa-trophy"
                        badge={leaderboard.length}
                        id="dashboard-leaderboard"
                        defaultOpen={true}
                    >
                        {leaderboard.length > 0 ? (
                            <LeaderboardSection
                                leaderboard={leaderboard}
                                leagueId={leagueId}
                                currentUserId={user?.id}
                                compact={true}
                            />
                        ) : (
                            <div className="text-center text-muted py-4">
                                <i className="fas fa-trophy fa-2x mb-3"></i>
                                <p>No standings yet. Play some games!</p>
                            </div>
                        )}
                    </CollapsibleSection>
                </div>
            </div>

            {/* Declare Result Modal */}
            <DeclareResultModal
                show={showResultModal}
                onHide={() => setShowResultModal(false)}
                onDeclareWin={handleDeclareWin}
                onDeclareDraw={handleDeclareDraw}
            />
        </div>
    );
};

export default Dashboard;
