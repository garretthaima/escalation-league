import React, { useState, useEffect, useCallback } from 'react';
import { getPods, joinPod, createPod, overridePod, logPodResult } from '../../api/podsApi'; // Use unified getPods
import { isUserInLeague, getLeagueParticipants } from '../../api/userLeaguesApi';
import { usePermissions } from '../context/PermissionsProvider';
import { getUserProfile } from '../../api/usersApi';
import { useToast } from '../context/ToastContext';
import { useWebSocket } from '../context/WebSocketProvider';

const ActiveGamesTab = () => {
    const [openPods, setOpenPods] = useState([]);
    const [activePods, setActivePods] = useState([]);
    const [leagueId, setLeagueId] = useState(null);
    const [userId, setUserId] = useState(null);
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showWinModal, setShowWinModal] = useState(false);
    const [selectedPodId, setSelectedPodId] = useState(null);

    // Create Game Modal state
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [leagueUsers, setLeagueUsers] = useState([]);
    const [selectedPlayers, setSelectedPlayers] = useState([]);
    const [turnOrder, setTurnOrder] = useState([]);
    const [creatingGame, setCreatingGame] = useState(false);

    const { permissions } = usePermissions();
    const { showToast } = useToast();
    const { socket, connected, joinLeague, leaveLeague } = useWebSocket();

    // Check permissions
    const canReadPods = permissions.some((perm) => perm.name === 'pod_read');
    const canCreatePods = permissions.some((perm) => perm.name === 'pod_create');
    const canUpdatePods = permissions.some((perm) => perm.name === 'pod_update');
    const isAdmin = permissions.some((perm) => perm.name === 'admin_pod_update');

    // Fetch league ID early for WebSocket connection (don't wait for pods)
    useEffect(() => {
        const fetchLeagueId = async () => {
            try {
                const response = await isUserInLeague();
                if (response.inLeague && response.league?.league_id) {
                    setLeagueId(response.league.league_id);
                }
            } catch (err) {
                console.error('Error fetching league ID:', err);
            }
        };
        fetchLeagueId();
    }, []);

    useEffect(() => {
        const fetchPods = async () => {
            try {
                if (!canReadPods) {
                    setError('You do not have permission to view games.');
                    setLoading(false);
                    return;
                }

                const userProfile = await getUserProfile();
                setUserId(userProfile.user.id);

                // Fetch open and active pods using getPods with filters
                const [openPodsData, activePodsData] = await Promise.all([
                    getPods({ confirmation_status: 'open' }), // Open pods
                    getPods({ confirmation_status: 'active' }), // Active pods
                ]);

                // Only filter active pods if not admin - admins see all
                const userActivePods = isAdmin ? activePodsData : activePodsData.filter(pod =>
                    pod.participants?.some(p => p.player_id === userProfile.user.id)
                );

                setOpenPods(openPodsData || []);
                setActivePods(userActivePods || []);
            } catch (err) {
                console.error('Error fetching pods:', err);
                setError('Failed to fetch pods.');
            } finally {
                setLoading(false);
            }
        };

        fetchPods();
    }, [canReadPods]);

    // WebSocket listeners for real-time updates
    useEffect(() => {
        if (!socket || !connected || !leagueId) return;

        // Join the league room to receive updates
        joinLeague(leagueId);

        // Listen for new pods
        socket.on('pod:created', (data) => {
            // Check if pod is active (created with players) or open
            if (data.confirmation_status === 'active') {
                // Only add to active pods if user is a participant
                if (data.participants?.some(p => p.player_id === userId)) {
                    setActivePods(prev => [...prev, data]);
                    showToast('Game started!', 'success');
                }
            } else {
                setOpenPods(prev => [...prev, data]);
                showToast('New game available!', 'info');
            }
        });

        // Listen for players joining
        socket.on('pod:player_joined', (data) => {
            setOpenPods(prev => prev.map(pod =>
                pod.id === data.podId
                    ? {
                        ...pod,
                        participants: [
                            ...(pod.participants || []),
                            {
                                player_id: data.player.id,
                                firstname: data.player.firstname,
                                lastname: data.player.lastname,
                                email: data.player.email || '',
                                result: null,
                                confirmed: 0
                            }
                        ]
                    }
                    : pod
            ));
        });

        // Listen for pod activation (moved from open to active)
        socket.on('pod:activated', (data) => {
            const { podId } = data;

            setOpenPods(prev => {
                const activatedPod = prev.find(pod => pod.id === podId);
                if (activatedPod && activatedPod.participants?.some(p => p.player_id === userId)) {
                    setActivePods(activePrev => [...activePrev, { ...activatedPod, confirmation_status: 'active' }]);
                }
                return prev.filter(pod => pod.id !== podId);
            });

            showToast('Game started!', 'success');
        });

        // Listen for winner declarations (pod moves to pending)
        socket.on('pod:winner_declared', (data) => {
            // Remove from active pods (it's now pending)
            setActivePods(prev => prev.filter(pod => pod.id !== data.podId));
        });

        // Listen for pod deletions (admin removed a pod)
        socket.on('pod:deleted', (data) => {
            // Remove from both open and active pods
            setOpenPods(prev => prev.filter(pod => pod.id !== data.podId));
            setActivePods(prev => prev.filter(pod => pod.id !== data.podId));
            showToast('A game was deleted', 'info');
        });

        // Cleanup
        return () => {
            if (socket) {
                socket.off('pod:created');
                socket.off('pod:player_joined');
                socket.off('pod:activated');
                socket.off('pod:winner_declared');
                socket.off('pod:deleted');
            }
            if (leagueId) {
                leaveLeague(leagueId);
            }
        };
    }, [socket, connected, leagueId, userId, joinLeague, leaveLeague, showToast]);


    const handleJoinPod = async (podId) => {
        try {
            await joinPod(podId);
            showToast('Joined pod successfully!', 'success');
            // No need to refresh - WebSocket will update the UI for all users including this one
        } catch (err) {
            console.error('Error joining pod:', err.response?.data?.error || err.message);
            showToast(err.response?.data?.error || 'Failed to join pod.', 'error');
        }
    };

    // Simple pod creation (open pod that others join)
    const handleCreatePod = async () => {
        try {
            const response = await isUserInLeague();
            if (!response.inLeague || !response.league) {
                showToast('You are not part of any league.', 'warning');
                return;
            }

            const leagueId = response.league.league_id;
            await createPod({ leagueId });

            // WebSocket event (pod:created) will update the UI
            showToast(`New pod created successfully in league: ${response.league.league_name}!`, 'success');
        } catch (err) {
            console.error('Error creating pod:', err.response?.data?.error || err.message);
            showToast(err.response?.data?.error || 'Failed to create pod.', 'error');
        }
    };

    // Open create game modal with player selection
    const handleOpenCreateModal = async () => {
        try {
            const response = await isUserInLeague();
            if (!response.inLeague || !response.league) {
                showToast('You are not part of any league.', 'warning');
                return;
            }

            // Fetch league participants
            const participants = await getLeagueParticipants(response.league.league_id);
            const users = Array.isArray(participants) ? participants : [];
            // Map user_id to id for consistency
            const mappedUsers = users.map(u => ({ ...u, id: u.user_id || u.id }));
            setLeagueUsers(mappedUsers);

            // Pre-select current user
            const currentUserInList = mappedUsers.find(u => u.id === userId);
            if (currentUserInList) {
                setSelectedPlayers([currentUserInList]);
                setTurnOrder([currentUserInList.id]);
            } else {
                setSelectedPlayers([]);
                setTurnOrder([]);
            }

            setShowCreateModal(true);
        } catch (err) {
            console.error('Error loading league participants:', err);
            showToast('Failed to load league participants.', 'error');
        }
    };

    // Toggle player selection
    const togglePlayerSelection = (user) => {
        const isSelected = selectedPlayers.some(p => p.id === user.id);
        if (isSelected) {
            // Remove from selection and turn order
            setSelectedPlayers(prev => prev.filter(p => p.id !== user.id));
            setTurnOrder(prev => prev.filter(id => id !== user.id));
        } else {
            if (selectedPlayers.length >= 4) {
                showToast('Maximum 4 players allowed', 'warning');
                return;
            }
            // Add to selection and turn order
            setSelectedPlayers(prev => [...prev, user]);
            setTurnOrder(prev => [...prev, user.id]);
        }
    };

    // Randomize turn order
    const randomizeTurnOrder = useCallback(() => {
        setTurnOrder(prev => {
            const shuffled = [...prev];
            for (let i = shuffled.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
            }
            return shuffled;
        });
        showToast('Turn order randomized', 'info');
    }, [showToast]);

    // Move player up in turn order
    const movePlayerUp = useCallback((playerId) => {
        setTurnOrder(prev => {
            const order = [...prev];
            const index = order.indexOf(playerId);
            if (index <= 0) return prev;
            [order[index], order[index - 1]] = [order[index - 1], order[index]];
            return order;
        });
    }, []);

    // Move player down in turn order
    const movePlayerDown = useCallback((playerId) => {
        setTurnOrder(prev => {
            const order = [...prev];
            const index = order.indexOf(playerId);
            if (index === -1 || index >= order.length - 1) return prev;
            [order[index], order[index + 1]] = [order[index + 1], order[index]];
            return order;
        });
    }, []);

    // Get player by ID
    const getPlayerById = useCallback((playerId) => {
        return selectedPlayers.find(p => p.id === playerId);
    }, [selectedPlayers]);

    // Create game with selected players
    const handleCreateGameWithPlayers = async () => {
        if (selectedPlayers.length < 3) {
            showToast('At least 3 players are required', 'warning');
            return;
        }

        setCreatingGame(true);
        try {
            await createPod({
                leagueId,
                player_ids: selectedPlayers.map(p => p.id),
                turn_order: turnOrder
            });

            showToast('Game created successfully!', 'success');
            setShowCreateModal(false);
            setSelectedPlayers([]);
            setTurnOrder([]);
            // WebSocket will update the UI
        } catch (err) {
            console.error('Error creating game:', err.response?.data?.error || err.message);
            showToast(err.response?.data?.error || 'Failed to create game.', 'error');
        } finally {
            setCreatingGame(false);
        }
    };

    const handleOverridePod = async (podId) => {
        try {
            await overridePod(podId);
            showToast('Pod successfully overridden to active!', 'success');
            // WebSocket event (pod:activated) will update the UI
        } catch (err) {
            console.error('Error overriding pod:', err.response?.data?.error || err.message);
            showToast(err.response?.data?.error || 'Failed to override pod.', 'error');
        }
    };
    const handleDeclareWinner = (podId) => {
        setSelectedPodId(podId);
        setShowWinModal(true);
    };

    const confirmDeclareWinner = async () => {
        setShowWinModal(false);

        try {
            await logPodResult(selectedPodId, { result: 'win' });
            showToast('Winner declared! Waiting for other players to confirm.', 'success');
            // WebSocket event (pod:winner_declared) will update the UI
        } catch (err) {
            console.error('Error declaring winner:', err.response?.data?.error || err.message);

            // Check if someone else already won
            if (err.response?.data?.error?.includes('already been declared')) {
                showToast('A winner has already been declared for this game.', 'info');
                // WebSocket event will update the UI, no need to reload
            } else {
                showToast(err.response?.data?.error || 'Failed to declare winner.', 'error');
            }
        }
    };

    if (loading) {
        return <div className="text-center mt-4">Loading pods...</div>;
    }

    if (error) {
        return <div className="alert alert-danger">{error}</div>;
    }

    // Defensive: always use arrays for pods and participants
    const safeOpenPods = Array.isArray(openPods) ? openPods : [];
    const safeActivePods = Array.isArray(activePods) ? activePods : [];

    return (
        <div>
            {/* Open Pods Section */}
            <div className="mb-4">
                <h3>Open Games</h3>
                {canCreatePods && (
                    <div className="mb-3">
                        <button
                            className="btn btn-primary me-2"
                            onClick={handleOpenCreateModal}
                        >
                            <i className="fas fa-users me-2"></i>
                            Create Game with Players
                        </button>
                        <button
                            className="btn btn-outline-secondary"
                            onClick={handleCreatePod}
                        >
                            <i className="fas fa-plus me-2"></i>
                            Create Open Game
                        </button>
                    </div>
                )}
                <div className="row">
                    {safeOpenPods.length > 0 ? (
                        safeOpenPods.map((pod) => (
                            <div key={pod.id} className="col-md-6 mb-4">
                                <div className="card">
                                    <div className="card-body">
                                        <h5 className="card-title">Pod #{pod.id}</h5>
                                        <div className="table-responsive">
                                            <table className="table table-bordered">
                                                <tbody>
                                                    {Array.from({ length: 2 }).map((_, rowIndex) => (
                                                        <tr key={rowIndex}>
                                                            {Array.from({ length: 2 }).map((_, colIndex) => {
                                                                const participantIndex = rowIndex * 2 + colIndex;
                                                                const participantsArr = Array.isArray(pod.participants) ? pod.participants : [];
                                                                const participant = participantsArr[participantIndex];
                                                                return (
                                                                    <td key={colIndex}>
                                                                        {participant
                                                                            ? `${participant.firstname} ${participant.lastname}`
                                                                            : 'Empty'}
                                                                    </td>
                                                                );
                                                            })}
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                        {Array.isArray(pod.participants) && pod.participants.length >= 3 && pod.participants.some((p) => p.player_id === userId) && (
                                            <button
                                                className="btn btn-warning mt-3"
                                                onClick={() => handleOverridePod(pod.id)}
                                            >
                                                Override to Active
                                            </button>
                                        )}
                                        {canCreatePods && (
                                            <button
                                                className="btn btn-secondary mt-3"
                                                onClick={() => handleJoinPod(pod.id)}
                                                disabled={
                                                    Array.isArray(pod.participants) && (
                                                        pod.participants.some((p) => p.player_id === userId) ||
                                                        pod.participants.length >= 4
                                                    )
                                                }
                                            >
                                                {Array.isArray(pod.participants) && pod.participants.some((p) => p.player_id === userId)
                                                    ? 'Already Joined'
                                                    : Array.isArray(pod.participants) && pod.participants.length >= 4
                                                        ? 'Pod Full'
                                                        : 'Join Pod'}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))
                    ) : (
                        <p className="text-center">No open games available.</p>
                    )}
                </div>
            </div>

            {/* Active Pods Section */}
            <div>
                <h3>Active Games</h3>
                <div className="row">
                    {safeActivePods.length > 0 ? (
                        safeActivePods.map((pod) => {
                            const participantsArr = Array.isArray(pod.participants) ? pod.participants : [];
                            // Sort by turn_order if available
                            const sortedParticipants = [...participantsArr].sort((a, b) =>
                                (a.turn_order || 999) - (b.turn_order || 999)
                            );
                            const hasTurnOrder = sortedParticipants.some(p => p.turn_order);

                            return (
                                <div key={pod.id} className="col-md-6 mb-4">
                                    <div className="card h-100">
                                        <div className="card-body d-flex flex-column">
                                            <h5 className="card-title">Pod #{pod.id}</h5>
                                            <div className="flex-grow-1">
                                                {hasTurnOrder ? (
                                                    /* Turn Order Display */
                                                    <div className="turn-order-display mb-3">
                                                        <small className="text-muted d-block mb-2">
                                                            <i className="fas fa-sort-numeric-down me-1"></i>
                                                            Turn Order
                                                        </small>
                                                        <ol className="list-group list-group-numbered">
                                                            {sortedParticipants.map((participant, idx) => (
                                                                <li
                                                                    key={participant.player_id}
                                                                    className={`list-group-item d-flex justify-content-between align-items-center ${idx === 0 ? 'list-group-item-warning' : ''}`}
                                                                >
                                                                    <span>
                                                                        {participant.firstname} {participant.lastname}
                                                                        {idx === 0 && (
                                                                            <span className="badge bg-warning text-dark ms-2">
                                                                                <i className="fas fa-play-circle me-1"></i>
                                                                                First
                                                                            </span>
                                                                        )}
                                                                    </span>
                                                                </li>
                                                            ))}
                                                        </ol>
                                                    </div>
                                                ) : (
                                                    /* Fallback: Original 2x2 Grid */
                                                    <div className="table-responsive">
                                                        <table className="table table-bordered">
                                                            <tbody>
                                                                {Array.from({ length: 2 }).map((_, rowIndex) => (
                                                                    <tr key={rowIndex}>
                                                                        {Array.from({ length: 2 }).map((_, colIndex) => {
                                                                            const participantIndex = rowIndex * 2 + colIndex;
                                                                            const participant = participantsArr[participantIndex];
                                                                            return (
                                                                                <td key={colIndex}>
                                                                                    {participant
                                                                                        ? `${participant.firstname} ${participant.lastname}`
                                                                                        : 'Empty'}
                                                                                </td>
                                                                            );
                                                                        })}
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                )}
                                            </div>
                                            {/* Declare Winner Button */}
                                            {participantsArr.some((p) => String(p.player_id) === String(userId)) && (
                                                <div className="text-center mt-auto">
                                                    <button
                                                        className="btn btn-success"
                                                        onClick={() => handleDeclareWinner(pod.id)}
                                                    >
                                                        I Won!
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    ) : (
                        <p className="text-center">No active games available.</p>
                    )}
                </div>
            </div>

            {/* Bootstrap Modal for Win Confirmation */}
            <div className={`modal fade ${showWinModal ? 'show' : ''}`} style={{ display: showWinModal ? 'block' : 'none' }} tabIndex="-1">
                <div className="modal-dialog">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h5 className="modal-title">Declare Victory</h5>
                            <button type="button" className="btn-close" onClick={() => setShowWinModal(false)} aria-label="Close"></button>
                        </div>
                        <div className="modal-body">
                            <p>Are you sure you won this game? This will notify other players to confirm the result.</p>
                        </div>
                        <div className="modal-footer">
                            <button type="button" className="btn btn-secondary" onClick={() => setShowWinModal(false)}>Cancel</button>
                            <button type="button" className="btn btn-success" onClick={confirmDeclareWinner}>Yes, I Won!</button>
                        </div>
                    </div>
                </div>
            </div>
            {showWinModal && <div className="modal-backdrop fade show"></div>}

            {/* Create Game Modal */}
            <div className={`modal fade ${showCreateModal ? 'show' : ''}`} style={{ display: showCreateModal ? 'block' : 'none' }} tabIndex="-1">
                <div className="modal-dialog modal-lg">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h5 className="modal-title">
                                <i className="fas fa-users me-2"></i>
                                Create Game with Players
                            </h5>
                            <button type="button" className="btn-close" onClick={() => setShowCreateModal(false)} aria-label="Close"></button>
                        </div>
                        <div className="modal-body">
                            <div className="row">
                                {/* Player Selection */}
                                <div className="col-md-6">
                                    <h6>
                                        <i className="fas fa-user-plus me-2"></i>
                                        Select Players ({selectedPlayers.length}/4)
                                    </h6>
                                    <p className="text-muted small">Select 3-4 players for this game</p>
                                    <div className="list-group" style={{ maxHeight: '300px', overflowY: 'auto' }}>
                                        {leagueUsers.map(user => {
                                            const isSelected = selectedPlayers.some(p => p.id === user.id);
                                            const isCurrentUser = user.id === userId;
                                            return (
                                                <button
                                                    key={user.id}
                                                    type="button"
                                                    className={`list-group-item list-group-item-action d-flex justify-content-between align-items-center ${isSelected ? 'active' : ''}`}
                                                    onClick={() => togglePlayerSelection(user)}
                                                >
                                                    <span>
                                                        {user.firstname} {user.lastname}
                                                        {isCurrentUser && <span className="badge bg-info ms-2">You</span>}
                                                    </span>
                                                    {isSelected && <i className="fas fa-check"></i>}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Turn Order */}
                                <div className="col-md-6">
                                    <div className="d-flex justify-content-between align-items-center mb-2">
                                        <h6 className="mb-0">
                                            <i className="fas fa-sort-numeric-down me-2"></i>
                                            Turn Order
                                        </h6>
                                        <button
                                            className="btn btn-sm btn-outline-secondary"
                                            onClick={randomizeTurnOrder}
                                            disabled={turnOrder.length < 2}
                                        >
                                            <i className="fas fa-random me-1"></i>
                                            Randomize
                                        </button>
                                    </div>
                                    <p className="text-muted small">Drag or use arrows to reorder</p>
                                    {turnOrder.length === 0 ? (
                                        <div className="alert alert-secondary">
                                            <i className="fas fa-info-circle me-2"></i>
                                            Select players to set turn order
                                        </div>
                                    ) : (
                                        <div className="list-group">
                                            {turnOrder.map((playerId, index) => {
                                                const player = getPlayerById(playerId);
                                                if (!player) return null;
                                                return (
                                                    <div
                                                        key={playerId}
                                                        className={`list-group-item d-flex justify-content-between align-items-center ${index === 0 ? 'list-group-item-warning' : ''}`}
                                                    >
                                                        <div className="d-flex align-items-center">
                                                            <span className={`badge ${index === 0 ? 'bg-warning text-dark' : 'bg-secondary'} me-2`}>
                                                                {index + 1}
                                                            </span>
                                                            <span>{player.firstname} {player.lastname}</span>
                                                            {index === 0 && (
                                                                <span className="badge bg-warning text-dark ms-2">
                                                                    <i className="fas fa-play-circle me-1"></i>
                                                                    First
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className="btn-group btn-group-sm">
                                                            <button
                                                                className="btn btn-outline-secondary"
                                                                onClick={() => movePlayerUp(playerId)}
                                                                disabled={index === 0}
                                                            >
                                                                <i className="fas fa-chevron-up"></i>
                                                            </button>
                                                            <button
                                                                className="btn btn-outline-secondary"
                                                                onClick={() => movePlayerDown(playerId)}
                                                                disabled={index === turnOrder.length - 1}
                                                            >
                                                                <i className="fas fa-chevron-down"></i>
                                                            </button>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button
                                type="button"
                                className="btn btn-secondary"
                                onClick={() => setShowCreateModal(false)}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                className="btn btn-primary"
                                onClick={handleCreateGameWithPlayers}
                                disabled={selectedPlayers.length < 3 || creatingGame}
                            >
                                {creatingGame ? (
                                    <>
                                        <span className="spinner-border spinner-border-sm me-2"></span>
                                        Creating...
                                    </>
                                ) : (
                                    <>
                                        <i className="fas fa-play me-2"></i>
                                        Create & Start Game
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
            {showCreateModal && <div className="modal-backdrop fade show"></div>}
        </div>
    );
};

export default ActiveGamesTab;