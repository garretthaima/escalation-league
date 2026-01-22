import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { updatePod, deletePod } from '../../api/podsAdminApi';
import { getPods } from '../../api/podsApi';
import { getLeagueParticipants } from '../../api/userLeaguesApi';
import { useToast } from '../context/ToastContext';
import ConfirmModal from '../Shared/ConfirmModal';
import LoadingSpinner from '../Shared/LoadingSpinner';
import './EditPodPage.css';

const EditPodPage = () => {
    const { podId } = useParams();
    const navigate = useNavigate();
    const { showToast } = useToast();

    const [pod, setPod] = useState(null);
    const [participants, setParticipants] = useState([]);
    const [leagueUsers, setLeagueUsers] = useState([]);
    const [selectedUserId, setSelectedUserId] = useState('');
    const [winnerId, setWinnerId] = useState('');
    const [isDraw, setIsDraw] = useState(false);
    const [currentWinner, setCurrentWinner] = useState(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [showAddModal, setShowAddModal] = useState(false);
    const [loading, setLoading] = useState(true);
    const [pendingRemovals, setPendingRemovals] = useState([]); // Track participants to remove
    const [pendingAdditions, setPendingAdditions] = useState([]); // Track participants to add
    const [showPodInfo, setShowPodInfo] = useState(false); // Collapsed by default on mobile
    const [originalParticipants, setOriginalParticipants] = useState([]); // Track original state for comparison
    const [originalWinnerId, setOriginalWinnerId] = useState('');
    const [originalIsDraw, setOriginalIsDraw] = useState(false);
    const [turnOrder, setTurnOrder] = useState([]); // Track turn order as array of player_ids
    const [originalTurnOrder, setOriginalTurnOrder] = useState([]); // Track original turn order
    const [draggedId, setDraggedId] = useState(null); // Track dragged player for drag-and-drop
    const [dragOverId, setDragOverId] = useState(null); // Track drag-over target

    useEffect(() => {
        const fetchPodDetails = async () => {
            try {
                const podDetails = await getPods({ podId });
                if (podDetails) {
                    setPod(podDetails);
                    const participantsData = podDetails.participants || [];
                    setParticipants(participantsData);
                    setOriginalParticipants(JSON.parse(JSON.stringify(participantsData))); // Deep copy

                    // Initialize turn order from participants (sorted by turn_order if available)
                    const sortedParticipants = [...participantsData].sort((a, b) =>
                        (a.turn_order || 999) - (b.turn_order || 999)
                    );
                    const initialTurnOrder = sortedParticipants.map(p => p.player_id);
                    setTurnOrder(initialTurnOrder);
                    setOriginalTurnOrder([...initialTurnOrder]);

                    const winner = podDetails.participants.find(
                        (participant) => participant.result === 'win'
                    );
                    setCurrentWinner(winner || null);

                    // Pre-populate winner dropdown with current winner
                    if (winner) {
                        setWinnerId(winner.player_id.toString());
                        setOriginalWinnerId(winner.player_id.toString());
                    }

                    // Check if it's a draw
                    const allDraw = podDetails.participants.length > 0 &&
                        podDetails.participants.every(p => p.result === 'draw');
                    setIsDraw(allDraw);
                    setOriginalIsDraw(allDraw);

                    // Fetch league participants for adding players
                    if (podDetails.league_id) {
                        const leagueParticipants = await getLeagueParticipants(podDetails.league_id);
                        // API returns array directly, and uses user_id not id
                        const users = Array.isArray(leagueParticipants) ? leagueParticipants : [];
                        // Map user_id to id for consistency
                        const mappedUsers = users.map(u => ({ ...u, id: u.user_id }));
                        setLeagueUsers(mappedUsers);
                    }
                } else {
                    showToast('Pod not found', 'error');
                    navigate('/admin/pods');
                }
            } catch (err) {
                console.error('Error fetching pod details:', err.message);
                showToast('Failed to load pod details', 'error');
                navigate('/admin/pods');
            } finally {
                setLoading(false);
            }
        };

        fetchPodDetails();
    }, [podId, navigate, showToast]);

    // Check if there are any unsaved changes
    const hasChanges = () => {
        // Check for pending additions or removals
        if (pendingRemovals.length > 0 || pendingAdditions.length > 0) {
            return true;
        }

        // Check if winner changed
        if (winnerId !== originalWinnerId) {
            return true;
        }

        // Check if draw status changed
        if (isDraw !== originalIsDraw) {
            return true;
        }

        // Check if turn order changed
        if (turnOrder.length !== originalTurnOrder.length ||
            turnOrder.some((id, idx) => id !== originalTurnOrder[idx])) {
            return true;
        }

        // Check if original participants had no turn_order set (all null/undefined)
        // If so, saving will set the turn order for the first time
        const hadNoTurnOrder = originalParticipants.length > 0 &&
            originalParticipants.every(p => !p.turn_order);
        if (hadNoTurnOrder && turnOrder.length > 0) {
            return true;
        }

        // Check if any DQ status changed
        const dqChanged = participants.some((p, index) => {
            const original = originalParticipants[index];
            return original && p.result !== original.result;
        });

        if (dqChanged) {
            return true;
        }

        return false;
    };

    // Randomize turn order using Fisher-Yates shuffle
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

    // Get participant by player_id
    const getParticipantById = useCallback((playerId) => {
        return participants.find(p => p.player_id === playerId) ||
               pendingAdditions.find(p => p.player_id === playerId);
    }, [participants, pendingAdditions]);

    // Drag and drop handlers for turn order
    const handleDragStart = useCallback((e, playerId) => {
        setDraggedId(playerId);
        e.dataTransfer.effectAllowed = 'move';
    }, []);

    const handleDragOver = useCallback((e, playerId) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        if (playerId !== draggedId) {
            setDragOverId(playerId);
        }
    }, [draggedId]);

    const handleDragLeave = useCallback(() => {
        setDragOverId(null);
    }, []);

    const handleDrop = useCallback((e, targetId) => {
        e.preventDefault();
        if (draggedId && draggedId !== targetId) {
            setTurnOrder(prev => {
                const order = [...prev];
                const draggedIndex = order.indexOf(draggedId);
                const targetIndex = order.indexOf(targetId);
                if (draggedIndex !== -1 && targetIndex !== -1) {
                    order.splice(draggedIndex, 1);
                    order.splice(targetIndex, 0, draggedId);
                }
                return order;
            });
        }
        setDraggedId(null);
        setDragOverId(null);
    }, [draggedId]);

    const handleDragEnd = useCallback(() => {
        setDraggedId(null);
        setDragOverId(null);
    }, []);

    const handleRemoveParticipant = (participantId) => {
        // Mark for removal instead of actually removing from state
        setPendingRemovals([...pendingRemovals, participantId]);

        // Remove from turn order
        setTurnOrder(prev => prev.filter(id => id !== participantId));

        // If removing the winner, clear winner selection
        if (winnerId === String(participantId)) {
            setWinnerId('');
            setCurrentWinner(null);
        }

        showToast('Participant marked for removal', 'info');
    };

    const handleUndoRemove = (participantId) => {
        setPendingRemovals(pendingRemovals.filter(id => id !== participantId));
        // Re-add to turn order at the end
        setTurnOrder(prev => [...prev, participantId]);
        showToast('Removal cancelled', 'info');
    };

    const handleAddParticipant = () => {
        if (participants.length - pendingRemovals.length + pendingAdditions.length >= 4) {
            showToast('Pod is full (maximum 4 players)', 'error');
            return;
        }
        setShowAddModal(true);
    };

    const confirmAddParticipant = () => {
        if (!selectedUserId) {
            showToast('Please select a player', 'error');
            return;
        }

        // Check if player already in pod or pending addition
        if (participants.some(p => String(p.player_id) === selectedUserId) ||
            pendingAdditions.some(p => String(p.player_id) === selectedUserId)) {
            showToast('Player is already in this pod', 'error');
            return;
        }

        // Find the user details
        const userToAdd = leagueUsers.find(u => String(u.id) === selectedUserId);
        if (!userToAdd) {
            showToast('User not found', 'error');
            return;
        }

        // Add to pending additions
        const newParticipant = {
            player_id: userToAdd.id,
            firstname: userToAdd.firstname,
            lastname: userToAdd.lastname,
            result: null,
            confirmed: 0,
            isNew: true
        };

        setPendingAdditions([...pendingAdditions, newParticipant]);
        // Add to turn order at the end
        setTurnOrder(prev => [...prev, userToAdd.id]);
        showToast('Participant marked for addition', 'info');
        setShowAddModal(false);
        setSelectedUserId('');
    };

    const handleUndoAdd = (participantId) => {
        setPendingAdditions(pendingAdditions.filter(p => p.player_id !== participantId));
        // Remove from turn order
        setTurnOrder(prev => prev.filter(id => id !== participantId));
        showToast('Addition cancelled', 'info');
    };

    const handleToggleDQ = (playerId) => {
        // Find participant first to check current state
        const participant = participants.find(p => p.player_id === playerId);
        const willBeDQd = participant?.result !== 'disqualified';

        // Local state update only - actual toggle happens on Save
        setParticipants(participants.map(p => {
            if (p.player_id === playerId) {
                const newResult = p.result === 'disqualified' ? 'loss' : 'disqualified';
                return { ...p, result: newResult };
            }
            return p;
        }));

        if (willBeDQd) {
            showToast('Player will be DQ\'d on Save', 'info');
        } else {
            showToast('Player will be reinstated on Save', 'info');
        }
    };

    const handleDeletePod = async () => {
        setShowDeleteConfirm(true);
    };

    const confirmDeletePod = async () => {
        try {
            await deletePod(pod.id);
            showToast('Pod deleted successfully', 'success');
            navigate('/admin/pods');
        } catch (err) {
            console.error('Error deleting pod:', err.message);
            showToast('Failed to delete pod', 'error');
        } finally {
            setShowDeleteConfirm(false);
        }
    };

    const handleSave = async () => {
        // Combine current participants + pending additions - pending removals
        const finalParticipants = [
            ...participants.filter(p => !pendingRemovals.includes(p.player_id)),
            ...pendingAdditions
        ];

        // Build the updates payload with final state
        // IMPORTANT: Preserve original confirmed values and don't auto-complete
        const participantUpdates = finalParticipants.map((participant) => {
            let result;
            if (participant.result === 'disqualified') {
                result = 'disqualified'; // DQ takes priority
            } else if (isDraw) {
                result = 'draw';
            } else if (winnerId && String(participant.player_id) === winnerId) {
                result = 'win';
            } else if (winnerId) {
                result = 'loss'; // Only set loss if a winner is selected
            } else {
                // No winner selected - preserve original result or null
                const original = originalParticipants.find(op => op.player_id === participant.player_id);
                result = original?.result || null;
            }

            // Get turn order position (1-indexed)
            const turnOrderPosition = turnOrder.indexOf(participant.player_id) + 1;

            // Preserve original confirmed status
            const original = originalParticipants.find(op => op.player_id === participant.player_id);

            return {
                player_id: participant.player_id,
                result: result,
                confirmed: original?.confirmed ?? participant.confirmed ?? 0,
                turn_order: turnOrderPosition > 0 ? turnOrderPosition : null,
            };
        });

        const updates = {
            participants: participantUpdates,
        };

        // Only include result if winner or draw is set
        if (isDraw) {
            updates.result = 'draw';
        } else if (winnerId) {
            updates.result = 'win';
        }

        // DO NOT send confirmation_status - let the pod stay in its current state
        // Status changes should only happen via Force Complete button or player confirmations

        try {
            await updatePod(pod.id, updates);
            showToast('Pod updated successfully', 'success');
            navigate('/admin/pods');
        } catch (err) {
            console.error('Error updating pod:', err.message);
            showToast('Failed to update pod', 'error');
        }
    };

    const handleForceComplete = async () => {
        try {
            const updatedParticipants = participants.map((participant) => ({
                player_id: participant.player_id,
                result: participant.result || 'loss',
                confirmed: 1,
            }));

            const updates = {
                participants: updatedParticipants,
                confirmation_status: 'complete',
            };

            await updatePod(pod.id, updates);
            showToast('Pod marked as complete', 'success');
            navigate('/admin/pods');
        } catch (err) {
            console.error('Error overriding pod status:', err.message);
            showToast('Failed to override pod status', 'error');
        }
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

    if (!pod) {
        return null;
    }

    return (
        <div className="container mt-4">
            {/* Header */}
            <div className="d-flex justify-content-between align-items-center mb-4">
                <div>
                    <button
                        className="text-decoration-none p-0 mb-2"
                        onClick={() => navigate('/admin/pods')}
                        style={{
                            color: 'var(--text-primary)',
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer'
                        }}
                    >
                        <i className="fas fa-arrow-left me-2"></i>
                        Back to Pods
                    </button>
                    <h2 className="mb-0">
                        <i className="fas fa-edit me-2"></i>
                        Edit Pod #{pod.id}
                    </h2>
                </div>
            </div>

            <div className="row">
                <div className="col-lg-8">
                    {/* Pod Information Card */}
                    <div className="card mb-4">
                        <div
                            className="card-header d-flex justify-content-between align-items-center"
                            style={{ cursor: 'pointer' }}
                            onClick={() => setShowPodInfo(!showPodInfo)}
                        >
                            <h5 className="mb-0">
                                <i className="fas fa-info-circle me-2"></i>
                                Pod Information
                            </h5>
                            <i className={`fas fa-chevron-${showPodInfo ? 'up' : 'down'} d-md-none`}></i>
                        </div>
                        <div className={`card-body collapse ${showPodInfo ? 'show' : ''} d-md-block`}>
                            <div className="row">
                                <div className="col-md-3 mb-3">
                                    <small className="text-muted d-block mb-1">Status</small>
                                    <span className={`badge ${pod.confirmation_status === 'open' ? 'bg-info' :
                                        pod.confirmation_status === 'active' ? 'bg-warning text-dark' :
                                            pod.confirmation_status === 'pending' ? 'bg-warning text-dark' :
                                                'bg-success'
                                        }`}>
                                        {pod.confirmation_status.charAt(0).toUpperCase() + pod.confirmation_status.slice(1)}
                                    </span>
                                </div>
                                <div className="col-md-3 mb-3">
                                    <small className="text-muted d-block mb-1">Result</small>
                                    <span>{pod.result === 'win' ? 'Win' : pod.result === 'draw' ? 'Draw' : 'Pending'}</span>
                                </div>
                                <div className="col-md-3 mb-3">
                                    <small className="text-muted d-block mb-1">Date Created</small>
                                    <span>{new Date(pod.created_at).toLocaleDateString()}</span>
                                </div>
                                <div className="col-md-3 mb-3">
                                    <small className="text-muted d-block mb-1">Players</small>
                                    <span>{participants.length} participants</span>
                                </div>
                            </div>
                            <div className="row">
                                <div className="col-md-6">
                                    <small className="text-muted d-block mb-1">League</small>
                                    <span>{pod.league_name || `League #${pod.league_id}`}</span>
                                </div>
                                <div className="col-md-6">
                                    <small className="text-muted d-block mb-1">Win Condition</small>
                                    <span>{pod.win_condition?.name || 'Not set'}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Participants Card */}
                    <div className="card mb-4">
                        <div className="card-header d-flex justify-content-between align-items-center">
                            <div>
                                <h5 className="mb-0 d-inline">
                                    <i className="fas fa-users me-2"></i>
                                    Participants
                                </h5>
                                <span className="badge bg-secondary ms-2">
                                    {participants.length - pendingRemovals.length + pendingAdditions.length}/4
                                </span>
                            </div>
                            {participants.length - pendingRemovals.length + pendingAdditions.length < 4 && (
                                <button
                                    className="btn btn-sm btn-primary"
                                    onClick={handleAddParticipant}
                                >
                                    <i className="fas fa-plus me-1"></i>
                                    Add Player
                                </button>
                            )}
                        </div>
                        <ul className="list-group list-group-flush">
                            {participants.map((participant, index) => {
                                const isPendingRemoval = pendingRemovals.includes(participant.player_id);
                                const isWinner = winnerId === String(participant.player_id);
                                const canBeWinner = !isDraw && !isPendingRemoval && participant.result !== 'disqualified';

                                return (
                                    <li
                                        key={`${participant.player_id || 'participant'}-${index}`}
                                        className={`list-group-item ${isPendingRemoval ? 'list-group-item-danger text-decoration-line-through opacity-50' :
                                                isWinner ? 'list-group-item-success' :
                                                    participant.result === 'disqualified' ? 'list-group-item-warning' :
                                                        currentWinner && currentWinner.player_id === participant.player_id ? 'list-group-item-success' : ''
                                            }`}
                                    >
                                        <div className="d-flex justify-content-between align-items-center flex-wrap gap-2">
                                            <div className="flex-grow-1 d-flex align-items-center gap-2">
                                                <strong>{participant.firstname} {participant.lastname}</strong>
                                                {isPendingRemoval && (
                                                    <span className="badge bg-danger">
                                                        <i className="fas fa-trash me-1"></i>
                                                        Will be removed
                                                    </span>
                                                )}
                                                {participant.result === 'disqualified' && !isPendingRemoval && (
                                                    <span className="badge bg-warning text-dark">
                                                        <i className="fas fa-flag me-1"></i>
                                                        DQ (0 pts)
                                                    </span>
                                                )}
                                                {pod.confirmation_status === 'pending' && !participant.confirmed && !isPendingRemoval && (
                                                    <span className="badge bg-secondary">
                                                        <i className="fas fa-clock me-1"></i>
                                                        Not confirmed
                                                    </span>
                                                )}
                                            </div>
                                            <div className="btn-group">
                                                {isPendingRemoval ? (
                                                    <button
                                                        className="btn btn-outline-secondary btn-sm"
                                                        onClick={() => handleUndoRemove(participant.player_id)}
                                                    >
                                                        <i className="fas fa-undo me-1"></i>
                                                        <span className="d-none d-sm-inline">Undo</span>
                                                    </button>
                                                ) : (
                                                    <>
                                                        {canBeWinner && (
                                                            <button
                                                                className={`btn btn-sm ${isWinner ? 'btn-success' : 'btn-outline-success'}`}
                                                                onClick={() => setWinnerId(isWinner ? '' : participant.player_id.toString())}
                                                                title={isWinner ? 'Unselect as winner' : 'Mark as winner'}
                                                            >
                                                                <i className={`fas ${isWinner ? 'fa-trophy' : 'fa-crown'}`}></i>
                                                                <span className="d-none d-md-inline ms-1">{isWinner ? 'Winner' : 'Winner'}</span>
                                                            </button>
                                                        )}
                                                        <button
                                                            className={`btn btn-sm ${participant.result === 'disqualified' ? 'btn-warning' : 'btn-outline-warning'}`}
                                                            onClick={() => handleToggleDQ(participant.player_id)}
                                                            title={participant.result === 'disqualified' ? 'Reinstate player' : 'Mark as DQ'}
                                                        >
                                                            <i className={`fas ${participant.result === 'disqualified' ? 'fa-undo' : 'fa-flag'}`}></i>
                                                            <span className="d-none d-md-inline ms-1">{participant.result === 'disqualified' ? 'Undo' : 'DQ'}</span>
                                                        </button>
                                                        <button
                                                            className="btn btn-outline-danger btn-sm"
                                                            onClick={() => handleRemoveParticipant(participant.player_id)}
                                                            title="Remove participant"
                                                        >
                                                            <i className="fas fa-times"></i>
                                                            <span className="d-none d-md-inline ms-1">Remove</span>
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </li>
                                );
                            })}
                            {pendingAdditions.map((participant, index) => (
                                <li
                                    key={`new-${participant.player_id || 'participant'}-${index}`}
                                    className="list-group-item d-flex justify-content-between align-items-center list-group-item-info"
                                >
                                    <div>
                                        <strong>{participant.firstname} {participant.lastname}</strong>
                                        <span className="badge bg-info text-dark ms-2">
                                            <i className="fas fa-plus me-1"></i>
                                            Will be added
                                        </span>
                                    </div>
                                    <button
                                        className="btn btn-outline-secondary btn-sm"
                                        onClick={() => handleUndoAdd(participant.player_id)}
                                    >
                                        <i className="fas fa-undo me-1"></i>
                                        Undo
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Turn Order Card */}
                    <div className="card mb-4">
                        <div className="card-header d-flex justify-content-between align-items-center">
                            <h5 className="mb-0">
                                <i className="fas fa-sort-numeric-down me-2"></i>
                                Turn Order
                            </h5>
                            <button
                                className="btn btn-sm"
                                onClick={randomizeTurnOrder}
                                title="Randomize turn order"
                                disabled={turnOrder.length < 2}
                                style={{
                                    background: 'var(--bg-secondary)',
                                    border: '1px solid var(--border-color)',
                                    color: 'var(--text-secondary)'
                                }}
                            >
                                <i className="fas fa-random me-1"></i>
                                Randomize
                            </button>
                        </div>
                        <div className="card-body">
                            <p className="text-muted small mb-2">
                                <span className="d-none d-md-inline">Drag to reorder or use </span>
                                <span className="d-md-none">Use </span>
                                arrows to reorder
                            </p>
                            {turnOrder.length === 0 ? (
                                <p className="text-muted mb-0">No players in pod yet.</p>
                            ) : (
                                <div className="turn-order-list">
                                    {turnOrder.map((playerId, index) => {
                                        const participant = getParticipantById(playerId);
                                        if (!participant) return null;

                                        const isPendingRemoval = pendingRemovals.includes(playerId);
                                        const isNew = pendingAdditions.some(p => p.player_id === playerId);
                                        const isDragging = draggedId === playerId;
                                        const isDragOver = dragOverId === playerId;

                                        return (
                                            <div
                                                key={playerId}
                                                draggable={!isPendingRemoval}
                                                onDragStart={(e) => handleDragStart(e, playerId)}
                                                onDragOver={(e) => handleDragOver(e, playerId)}
                                                onDragLeave={handleDragLeave}
                                                onDrop={(e) => handleDrop(e, playerId)}
                                                onDragEnd={handleDragEnd}
                                                className={`turn-order-item d-flex align-items-center justify-content-between p-2 mb-1 rounded ${
                                                    isPendingRemoval ? 'opacity-50' : ''
                                                }`}
                                                style={{
                                                    background: isDragOver ? 'rgba(45, 27, 78, 0.2)' : index === 0 ? 'rgba(212, 175, 55, 0.15)' : 'var(--bg-primary)',
                                                    border: `1px solid ${isDragOver ? 'var(--brand-purple)' : index === 0 ? 'var(--brand-gold)' : 'var(--border-color)'}`,
                                                    opacity: isDragging ? 0.5 : isPendingRemoval ? 0.5 : 1,
                                                    cursor: isPendingRemoval ? 'default' : 'grab',
                                                    transition: 'background 0.15s, border-color 0.15s'
                                                }}
                                            >
                                                <div className="d-flex align-items-center">
                                                    <i className="fas fa-grip-vertical text-muted me-2 d-none d-md-inline" style={{ cursor: isPendingRemoval ? 'default' : 'grab' }}></i>
                                                    <span
                                                        className="badge me-2"
                                                        style={{
                                                            background: index === 0 ? 'var(--brand-gold)' : 'var(--bg-secondary)',
                                                            color: index === 0 ? '#1a1a2e' : 'var(--text-primary)'
                                                        }}
                                                    >
                                                        {index + 1}
                                                    </span>
                                                    <span>{participant.firstname} {participant.lastname}</span>
                                                    {index === 0 && (
                                                        <span
                                                            className="badge ms-2"
                                                            style={{
                                                                background: 'var(--brand-gold)',
                                                                color: '#1a1a2e'
                                                            }}
                                                        >
                                                            <i className="fas fa-play-circle me-1"></i>
                                                            First
                                                        </span>
                                                    )}
                                                    {isNew && (
                                                        <span className="badge bg-info text-dark ms-2">New</span>
                                                    )}
                                                </div>
                                                <div className="btn-group btn-group-sm">
                                                    <button
                                                        className="btn btn-sm px-2"
                                                        onClick={() => movePlayerUp(playerId)}
                                                        disabled={index === 0}
                                                        title="Move up"
                                                        style={{
                                                            background: 'var(--bg-secondary)',
                                                            border: '1px solid var(--border-color)',
                                                            color: 'var(--text-secondary)'
                                                        }}
                                                    >
                                                        <i className="fas fa-chevron-up"></i>
                                                    </button>
                                                    <button
                                                        className="btn btn-sm px-2"
                                                        onClick={() => movePlayerDown(playerId)}
                                                        disabled={index === turnOrder.length - 1}
                                                        title="Move down"
                                                        style={{
                                                            background: 'var(--bg-secondary)',
                                                            border: '1px solid var(--border-color)',
                                                            color: 'var(--text-secondary)'
                                                        }}
                                                    >
                                                        <i className="fas fa-chevron-down"></i>
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                            <small className="text-muted d-block mt-2">
                                <i className="fas fa-info-circle me-1"></i>
                                <span className="d-none d-md-inline">Drag, use arrows, or click Randomize</span>
                                <span className="d-md-none">Use arrows or click Randomize</span>
                            </small>
                        </div>
                    </div>
                </div>

                <div className="col-lg-4">
                    {/* Actions Card */}
                    <div className="card mb-4 sticky-top" style={{ top: '20px' }}>
                        <div className="card-header">
                            <h5 className="mb-0">
                                <i className="fas fa-bolt me-2"></i>
                                Actions
                            </h5>
                        </div>
                        <div className="card-body">
                            {/* Draw Toggle */}
                            <div className="mb-3">
                                <button
                                    type="button"
                                    className={`btn w-100 ${isDraw ? 'btn-warning' : 'btn-outline-secondary'}`}
                                    onClick={() => {
                                        const newDrawState = !isDraw;
                                        setIsDraw(newDrawState);
                                        if (newDrawState) {
                                            setWinnerId(''); // Clear winner when marking as draw
                                        }
                                    }}
                                >
                                    <i className={`fas ${isDraw ? 'fa-check-circle' : 'fa-handshake'} me-2`}></i>
                                    {isDraw ? 'Marked as Draw' : 'Mark as Draw'}
                                </button>
                                {isDraw && (
                                    <small className="text-muted d-block mt-2">
                                        <i className="fas fa-info-circle me-1"></i>
                                        All non-DQ'd players will receive draw points
                                    </small>
                                )}
                            </div>

                            <hr />

                            <button
                                type="button"
                                className="btn btn-primary w-100 mb-2"
                                onClick={handleSave}
                                disabled={!hasChanges()}
                            >
                                <i className="fas fa-save me-2"></i>
                                Save Changes
                            </button>

                            {pod.confirmation_status === 'pending' && (
                                <div className="alert alert-warning mb-3">
                                    <p className="mb-2">
                                        <i className="fas fa-exclamation-triangle me-2"></i>
                                        <strong>Pending Confirmation</strong>
                                    </p>
                                    <p className="small mb-2">Waiting for player confirmations.</p>
                                    <button
                                        className="btn btn-warning btn-sm w-100"
                                        onClick={handleForceComplete}
                                    >
                                        <i className="fas fa-forward me-2"></i>
                                        Force Complete
                                    </button>
                                </div>
                            )}

                            <hr />

                            <h6 className="text-danger">
                                <i className="fas fa-exclamation-triangle me-2"></i>
                                Danger Zone
                            </h6>
                            <p className="text-muted small mb-2">
                                Deleting this pod will reverse all stat changes and cannot be undone.
                            </p>
                            <button
                                type="button"
                                className="btn btn-outline-danger w-100"
                                onClick={handleDeletePod}
                            >
                                <i className="fas fa-trash me-2"></i>
                                Delete Pod
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <ConfirmModal
                show={showDeleteConfirm}
                title="Delete Pod"
                message="Are you sure you want to delete this pod? This action cannot be undone."
                onConfirm={confirmDeletePod}
                onCancel={() => setShowDeleteConfirm(false)}
                confirmText="Delete"
                type="danger"
            />

            {/* Add Participant Modal */}
            {showAddModal && (
                <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
                    <div className="modal-dialog modal-dialog-centered">
                        <div className="modal-content">
                            <div className="modal-header">
                                <h5 className="modal-title">
                                    <i className="fas fa-user-plus me-2"></i>
                                    Add Participant
                                </h5>
                                <button
                                    type="button"
                                    className="btn-close"
                                    onClick={() => setShowAddModal(false)}
                                ></button>
                            </div>
                            <div className="modal-body">
                                <p>Select a player to add to this pod:</p>
                                <select
                                    className="form-select"
                                    value={selectedUserId}
                                    onChange={(e) => setSelectedUserId(e.target.value)}
                                >
                                    <option value="">Choose player...</option>
                                    {leagueUsers
                                        .filter(user => {
                                            // Exclude if user is in pod AND NOT pending removal
                                            const isInPod = participants.some(p => p.player_id === user.id);
                                            const isPendingRemoval = pendingRemovals.some(id => id === user.id);
                                            const isPendingAddition = pendingAdditions.some(p => p.player_id === user.id);

                                            // Show user if: (not in pod OR pending removal) AND not pending addition
                                            return (!isInPod || isPendingRemoval) && !isPendingAddition;
                                        })
                                        .map(user => (
                                            <option key={user.id} value={user.id}>
                                                {user.firstname} {user.lastname}
                                            </option>
                                        ))}
                                </select>
                            </div>
                            <div className="modal-footer">
                                <button
                                    type="button"
                                    className="btn btn-secondary"
                                    onClick={() => setShowAddModal(false)}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    className="btn btn-primary"
                                    onClick={confirmAddParticipant}
                                    disabled={!selectedUserId}
                                >
                                    <i className="fas fa-plus me-2"></i>
                                    Add Player
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default EditPodPage;
