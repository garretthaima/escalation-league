import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getPods, logPodResult } from '../../../api/podsApi';
import { getUserProfile } from '../../../api/usersApi';
import { usePermissions } from '../../../context/PermissionsProvider';
import { useToast } from '../../../context/ToastContext';
import { useWebSocket } from '../../../context/WebSocketProvider';
import CollapsibleSection from '../../Shared/CollapsibleSection';
import LoadingSpinner from '../../Shared/LoadingSpinner';
import { DiscordPromptBanner } from '../../Shared';
import GameCard from './GameCard';
import ConfirmationCard from './ConfirmationCard';
import CreateGameModal from './CreateGameModal';
import DeclareResultModal from './DeclareResultModal';
import { formatDate, parseDate } from '../../../utils/dateFormatter';

const PodsDashboard = () => {
    const { permissions, loading: permissionsLoading, activeLeague } = usePermissions();
    const { showToast } = useToast();
    const { socket, connected, joinLeague, leaveLeague } = useWebSocket();

    // Derive leagueId from context (API returns 'id' from leagues.*, fallback to league_id for compatibility)
    const leagueId = activeLeague?.id || activeLeague?.league_id;

    // State
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [userId, setUserId] = useState(null);

    // Pod data
    const [activePods, setActivePods] = useState([]);
    const [pendingPods, setPendingPods] = useState([]);
    const [recentCompleted, setRecentCompleted] = useState([]);

    // Modals
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showResultModal, setShowResultModal] = useState(false);
    const [selectedPodId, setSelectedPodId] = useState(null);

    // Permissions
    const canReadPods = permissions.some(p => p.name === 'pod_read');
    const canCreatePods = permissions.some(p => p.name === 'pod_create');
    const isAdmin = permissions.some(p => p.name === 'admin_pod_update');

    // Disable pod creation during tournament phase (only pre-generated tournament pods allowed)
    const isTournamentPhase = activeLeague?.league_phase === 'tournament';
    const canCreateNewPods = canCreatePods && !isTournamentPhase;

    // Fetch initial data
    useEffect(() => {
        // Wait for permissions to load before checking
        if (permissionsLoading) return;

        const fetchData = async () => {
            try {
                if (!canReadPods) {
                    setError('You do not have permission to view games.');
                    setLoading(false);
                    return;
                }

                if (!activeLeague) {
                    setError('You are not part of any league.');
                    setLoading(false);
                    return;
                }

                const userProfile = await getUserProfile();
                setUserId(userProfile.user.id);

                // Fetch pods by status
                const [active, pending, completed] = await Promise.all([
                    getPods({ confirmation_status: 'active' }),
                    getPods({ confirmation_status: 'pending' }),
                    getPods({ confirmation_status: 'complete' })
                ]);

                // Filter to user's pods (unless admin)
                const filterUserPods = (pods) => {
                    if (isAdmin) return pods;
                    return pods.filter(pod =>
                        pod.participants?.some(p => p.player_id === userProfile.user.id)
                    );
                };

                setActivePods(filterUserPods(active || []));
                setPendingPods(filterUserPods(pending || []));
                // Only show recent 5 completed games (sorted by newest first)
                const userCompleted = filterUserPods(completed || []);
                const sortedCompleted = userCompleted.sort((a, b) =>
                    parseDate(b.created_at) - parseDate(a.created_at)
                );
                setRecentCompleted(sortedCompleted.slice(0, 5));

            } catch (err) {
                console.error('Error fetching pods:', err);
                setError('Failed to load games.');
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [permissionsLoading, canReadPods, isAdmin, activeLeague]);

    // WebSocket listeners
    useEffect(() => {
        if (!socket || !connected || !leagueId) return;

        joinLeague(leagueId);

        // New pod created
        socket.on('pod:created', (data) => {
            if (data.confirmation_status === 'active') {
                if (data.participants?.some(p => p.player_id === userId) || isAdmin) {
                    setActivePods(prev => [...prev, data]);
                    if (data.participants?.some(p => p.player_id === userId)) {
                        showToast('Game started!', 'success');
                    }
                }
            }
        });

        // Pod activated (shouldn't happen with new flow, but keep for compatibility)
        socket.on('pod:activated', (data) => {
            const { podId } = data;
            setActivePods(prev => {
                const exists = prev.some(p => p.id === podId);
                if (!exists) {
                    // Fetch the pod data if we don't have it
                    getPods({ podId }).then(pods => {
                        if (pods.length > 0 && (pods[0].participants?.some(p => p.player_id === userId) || isAdmin)) {
                            setActivePods(current => [...current, pods[0]]);
                        }
                    });
                }
                return prev;
            });
        });

        // Winner declared - move from active to pending
        socket.on('pod:winner_declared', async (data) => {
            const { podId, winnerId } = data;
            // Remove from active immediately
            setActivePods(prev => prev.filter(p => p.id !== podId));

            // Fetch fresh pod data to get updated participant results
            try {
                const freshPod = await getPods({ podId });
                if (freshPod) {
                    // Only add if user is participant or admin
                    if (freshPod.participants?.some(p => p.player_id === userId) || isAdmin) {
                        setPendingPods(pending => {
                            // Avoid duplicates
                            if (pending.some(p => p.id === podId)) return pending;
                            return [...pending, freshPod];
                        });
                    }
                }
            } catch (err) {
                console.error('Failed to fetch updated pod data:', err);
            }

            // Only show toast if someone else declared (not the current user)
            if (winnerId !== userId) {
                showToast('A game result was declared', 'info');
            }
        });

        // Pod confirmed
        socket.on('pod:confirmed', (data) => {
            const { podId, playerId, isComplete } = data;

            if (isComplete) {
                // Move from pending to completed
                setPendingPods(prev => {
                    const pod = prev.find(p => p.id === podId);
                    if (pod) {
                        setRecentCompleted(completed => [
                            { ...pod, confirmation_status: 'complete' },
                            ...completed
                        ].slice(0, 5));
                    }
                    return prev.filter(p => p.id !== podId);
                });
                showToast('Game completed!', 'success');
            } else {
                // Update confirmation status
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
            showToast('A game was deleted', 'info');
        });

        return () => {
            socket.off('pod:created');
            socket.off('pod:activated');
            socket.off('pod:winner_declared');
            socket.off('pod:confirmed');
            socket.off('pod:deleted');
            if (leagueId) leaveLeague(leagueId);
        };
    }, [socket, connected, leagueId, userId, isAdmin, joinLeague, leaveLeague, showToast]);

    // Handlers
    const handleDeclareResult = (podId) => {
        setSelectedPodId(podId);
        setShowResultModal(true);
    };

    const handleDeclareWin = async () => {
        setShowResultModal(false);
        const podId = selectedPodId;
        try {
            await logPodResult(podId, { result: 'win' });
            showToast('Winner declared! Waiting for confirmations.', 'success');

            // Move pod from active to pending immediately (don't wait for WebSocket)
            setActivePods(prev => prev.filter(p => p.id !== podId));

            // Fetch fresh pod data to show in pending
            try {
                const freshPod = await getPods({ podId });
                if (freshPod) {
                    setPendingPods(pending => {
                        if (pending.some(p => p.id === podId)) return pending;
                        return [...pending, freshPod];
                    });
                }
            } catch (fetchErr) {
                console.error('Failed to fetch updated pod:', fetchErr);
            }
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
        const podId = selectedPodId;
        try {
            await logPodResult(podId, { result: 'draw' });
            showToast('Draw declared! Waiting for confirmations.', 'success');

            // Move pod from active to pending immediately (don't wait for WebSocket)
            setActivePods(prev => prev.filter(p => p.id !== podId));

            // Fetch fresh pod data to show in pending
            try {
                const freshPod = await getPods({ podId });
                if (freshPod) {
                    setPendingPods(pending => {
                        if (pending.some(p => p.id === podId)) return pending;
                        return [...pending, freshPod];
                    });
                }
            } catch (fetchErr) {
                console.error('Failed to fetch updated pod:', fetchErr);
            }
        } catch (err) {
            showToast(err.response?.data?.error || 'Failed to declare draw.', 'error');
        }
    };

    const handleConfirmResult = async (podId) => {
        try {
            await logPodResult(podId, {});
            showToast('Game confirmed!', 'success');
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

    // Stats
    const activeCount = activePods.length;
    const pendingCount = pendingPods.length;
    const needsConfirmationCount = pendingPods.filter(pod =>
        pod.participants?.some(p => p.player_id === userId && p.confirmed === 0)
    ).length;

    return (
        <div className="container mt-4">
            {/* Discord Prompt Banner */}
            <DiscordPromptBanner />

            {/* Header */}
            <div className="d-flex flex-column flex-sm-row justify-content-between align-items-start align-items-sm-center gap-3 mb-4">
                <div>
                    <h2 className="mb-1">Pods & Games</h2>
                    <div className="d-flex gap-3 text-muted" style={{ fontSize: '0.9rem' }}>
                        <span>
                            <i className="fas fa-gamepad me-1"></i>
                            {activeCount} Active
                        </span>
                        <span>
                            <i className="fas fa-clock me-1"></i>
                            {pendingCount} Pending
                        </span>
                    </div>
                </div>
                {canCreateNewPods && (
                    <button
                        className="btn btn-primary"
                        onClick={() => setShowCreateModal(true)}
                        style={{ whiteSpace: 'nowrap' }}
                    >
                        <i className="fas fa-plus me-2"></i>
                        Create Game
                    </button>
                )}
            </div>

            {/* Your Active Games */}
            <CollapsibleSection
                title="Your Active Games"
                icon="fas fa-gamepad"
                badge={activeCount}
                id="active-games"
                defaultOpen={true}
            >
                {activePods.length === 0 ? (
                    <div className="text-center text-muted py-4">
                        <i className="fas fa-dice fa-3x mb-3"></i>
                        <p>No active games right now.</p>
                        {canCreateNewPods && (
                            <button
                                className="btn btn-outline-primary"
                                onClick={() => setShowCreateModal(true)}
                            >
                                <i className="fas fa-plus me-2"></i>
                                Start a Game
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="row g-3">
                        {activePods.map(pod => (
                            <div key={pod.id} className="col-md-6 col-lg-4">
                                <GameCard
                                    pod={pod}
                                    userId={userId}
                                    onDeclareResult={handleDeclareResult}
                                />
                            </div>
                        ))}
                    </div>
                )}
            </CollapsibleSection>

            {/* Games Needing Confirmation */}
            <CollapsibleSection
                title="Needs Your Confirmation"
                icon="fas fa-clock"
                badge={needsConfirmationCount > 0 ? needsConfirmationCount : null}
                id="pending-games"
                defaultOpen={needsConfirmationCount > 0}
                actions={
                    needsConfirmationCount > 0 && (
                        <span className="badge bg-danger">Action Required</span>
                    )
                }
            >
                {pendingPods.length === 0 ? (
                    <div className="text-center text-muted py-4">
                        <i className="fas fa-check-circle fa-3x mb-3"></i>
                        <p>No games waiting for confirmation.</p>
                    </div>
                ) : (
                    <div className="row g-3">
                        {pendingPods.map(pod => (
                            <div key={pod.id} className="col-md-6 col-lg-4">
                                <ConfirmationCard
                                    pod={pod}
                                    userId={userId}
                                    onConfirm={handleConfirmResult}
                                />
                            </div>
                        ))}
                    </div>
                )}
            </CollapsibleSection>

            {/* Recent Completed Games */}
            <CollapsibleSection
                title="Recently Completed"
                icon="fas fa-history"
                badge={recentCompleted.length}
                id="completed-games"
                defaultOpen={false}
                actions={
                    <Link
                        to="/pods/history"
                        className="text-decoration-none small"
                        style={{ color: 'var(--text-secondary)' }}
                    >
                        View All
                    </Link>
                }
            >
                {recentCompleted.length === 0 ? (
                    <div className="text-center text-muted py-4">
                        <i className="fas fa-trophy fa-3x mb-3"></i>
                        <p>No completed games yet.</p>
                    </div>
                ) : (
                    <div className="list-group">
                        {recentCompleted.map(pod => {
                            const winner = pod.participants?.find(p => p.result === 'win');
                            const isDraw = pod.participants?.some(p => p.result === 'draw');
                            return (
                                <div key={pod.id} className="list-group-item d-flex justify-content-between align-items-center">
                                    <div>
                                        <strong>Pod #{pod.id}</strong>
                                        <span className="text-muted ms-2">
                                            {formatDate(pod.created_at)}
                                        </span>
                                    </div>
                                    <div>
                                        {isDraw ? (
                                            <span className="badge bg-secondary">Draw</span>
                                        ) : winner ? (
                                            <span className="badge bg-success">
                                                <i className="fas fa-trophy me-1"></i>
                                                {winner.firstname} {winner.lastname}
                                            </span>
                                        ) : (
                                            <span className="badge bg-secondary">-</span>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </CollapsibleSection>

            {/* Modals */}
            <CreateGameModal
                show={showCreateModal}
                onHide={() => setShowCreateModal(false)}
                leagueId={leagueId}
                userId={userId}
            />

            <DeclareResultModal
                show={showResultModal}
                onHide={() => setShowResultModal(false)}
                onDeclareWin={handleDeclareWin}
                onDeclareDraw={handleDeclareDraw}
            />
        </div>
    );
};

export default PodsDashboard;
