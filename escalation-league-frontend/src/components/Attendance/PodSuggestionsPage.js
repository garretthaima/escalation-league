import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getPodSuggestions, getSession } from '../../api/attendanceApi';
import { createPod } from '../../api/podsApi';
import { usePermissions } from '../context/PermissionsProvider';
import { useToast } from '../context/ToastContext';
import LoadingSpinner from '../Shared/LoadingSpinner';
import './PodSuggestionsPage.css';

const PodSuggestionsPage = () => {
    const { sessionId } = useParams();
    const navigate = useNavigate();
    const { activeLeague, permissions } = usePermissions();
    const { showToast } = useToast();

    const [, setSession] = useState(null);
    const [suggestions, setSuggestions] = useState(null);
    const [podSize, setPodSize] = useState(4);
    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState({});
    const [error, setError] = useState('');
    // Track turn order for each pod (key = pod index, value = array of player ids in order)
    const [turnOrders, setTurnOrders] = useState({});
    const [draggedPlayer, setDraggedPlayer] = useState(null);

    const fetchSuggestions = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const [sessionData, suggestionsData] = await Promise.all([
                getSession(sessionId),
                getPodSuggestions(sessionId, podSize)
            ]);
            setSession(sessionData);
            setSuggestions(suggestionsData);
            // Initialize turn orders with default player order
            if (suggestionsData?.pods) {
                const initialOrders = {};
                suggestionsData.pods.forEach((pod, index) => {
                    initialOrders[index] = pod.players.map(p => p.id);
                });
                setTurnOrders(initialOrders);
            }
        } catch (err) {
            console.error('Error fetching suggestions:', err);
            setError('Failed to load pod suggestions.');
        } finally {
            setLoading(false);
        }
    }, [sessionId, podSize]);

    const isAdmin = permissions?.includes('pod_manage');

    useEffect(() => {
        fetchSuggestions();
    }, [fetchSuggestions]);

    // Randomize turn order for a specific pod
    const randomizeTurnOrder = useCallback((podIndex) => {
        setTurnOrders(prev => {
            const current = [...(prev[podIndex] || [])];
            // Fisher-Yates shuffle
            for (let i = current.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [current[i], current[j]] = [current[j], current[i]];
            }
            return { ...prev, [podIndex]: current };
        });
    }, []);

    // Handle drag start
    const handleDragStart = (e, podIndex, playerId) => {
        setDraggedPlayer({ podIndex, playerId });
        e.dataTransfer.effectAllowed = 'move';
    };

    // Handle drag over
    const handleDragOver = (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    // Handle drop - reorder players
    const handleDrop = (e, podIndex, targetPlayerId) => {
        e.preventDefault();
        if (!draggedPlayer || draggedPlayer.podIndex !== podIndex) return;

        setTurnOrders(prev => {
            const order = [...(prev[podIndex] || [])];
            const draggedIndex = order.indexOf(draggedPlayer.playerId);
            const targetIndex = order.indexOf(targetPlayerId);

            if (draggedIndex === -1 || targetIndex === -1) return prev;

            // Remove dragged player and insert at target position
            order.splice(draggedIndex, 1);
            order.splice(targetIndex, 0, draggedPlayer.playerId);

            return { ...prev, [podIndex]: order };
        });
        setDraggedPlayer(null);
    };

    // Move player up in turn order
    const movePlayerUp = (podIndex, playerId) => {
        setTurnOrders(prev => {
            const order = [...(prev[podIndex] || [])];
            const index = order.indexOf(playerId);
            if (index <= 0) return prev;
            [order[index], order[index - 1]] = [order[index - 1], order[index]];
            return { ...prev, [podIndex]: order };
        });
    };

    // Move player down in turn order
    const movePlayerDown = (podIndex, playerId) => {
        setTurnOrders(prev => {
            const order = [...(prev[podIndex] || [])];
            const index = order.indexOf(playerId);
            if (index === -1 || index >= order.length - 1) return prev;
            [order[index], order[index + 1]] = [order[index + 1], order[index]];
            return { ...prev, [podIndex]: order };
        });
    };

    // Get ordered players for a pod based on turn order
    const getOrderedPlayers = (pod, podIndex) => {
        const order = turnOrders[podIndex] || pod.players.map(p => p.id);
        return order.map(id => pod.players.find(p => p.id === id)).filter(Boolean);
    };

    const handleCreatePod = async (pod, index) => {
        if (!activeLeague?.id) return;

        setCreating(prev => ({ ...prev, [index]: true }));
        try {
            // Use turn order from state
            const turnOrder = turnOrders[index] || pod.players.map(p => p.id);
            await createPod({
                league_id: activeLeague.id,
                player_ids: pod.players.map(p => p.id),
                turn_order: turnOrder
            });
            showToast('Pod created successfully!', 'success');
            // Remove this pod from suggestions and turn orders
            setSuggestions(prev => ({
                ...prev,
                pods: prev.pods.filter((_, i) => i !== index)
            }));
            setTurnOrders(prev => {
                const newOrders = { ...prev };
                delete newOrders[index];
                // Re-index remaining pods
                const reindexed = {};
                Object.keys(newOrders).forEach(key => {
                    const oldIndex = parseInt(key);
                    if (oldIndex > index) {
                        reindexed[oldIndex - 1] = newOrders[key];
                    } else {
                        reindexed[key] = newOrders[key];
                    }
                });
                return reindexed;
            });
        } catch (err) {
            console.error('Error creating pod:', err);
            showToast('Failed to create pod.', 'error');
        } finally {
            setCreating(prev => ({ ...prev, [index]: false }));
        }
    };

    const handleCreateAllPods = async () => {
        if (!suggestions?.pods?.length || !activeLeague?.id) return;

        for (let i = 0; i < suggestions.pods.length; i++) {
            const pod = suggestions.pods[i];
            try {
                const turnOrder = turnOrders[i] || pod.players.map(p => p.id);
                await createPod({
                    league_id: activeLeague.id,
                    player_ids: pod.players.map(p => p.id),
                    turn_order: turnOrder
                });
            } catch (err) {
                console.error(`Error creating pod ${i + 1}:`, err);
                showToast(`Failed to create pod ${i + 1}.`, 'error');
            }
        }
        showToast('All pods created!', 'success');
        navigate('/pods/active');
    };

    const getScoreColor = (score) => {
        if (score === 0) return 'text-success';
        if (score <= 2) return 'text-warning';
        return 'text-danger';
    };

    const getScoreLabel = (score) => {
        if (score === 0) return 'Fresh matchups!';
        if (score <= 2) return 'Some repeats';
        return 'Many repeats';
    };

    if (!isAdmin) {
        return (
            <div className="container mt-4">
                <div className="alert alert-warning">
                    <i className="fas fa-lock me-2"></i>
                    You don't have permission to view pod suggestions.
                </div>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="container mt-4 text-center py-5">
                <LoadingSpinner size="lg" showText text="Calculating optimal pods..." />
            </div>
        );
    }

    return (
        <div className="container mt-4">
            <div className="d-flex justify-content-between align-items-center mb-4">
                <h2>
                    <i className="fas fa-magic me-2"></i>
                    Pod Suggestions
                </h2>
                <button className="btn btn-outline-secondary" onClick={() => navigate('/attendance')}>
                    <i className="fas fa-arrow-left me-2"></i>
                    Back to Attendance
                </button>
            </div>

            {error && <div className="alert alert-danger">{error}</div>}

            {/* Controls */}
            <div className="card mb-4">
                <div className="card-body">
                    <div className="row align-items-center">
                        <div className="col-md-4">
                            <label className="form-label">Pod Size</label>
                            <select
                                className="form-select"
                                value={podSize}
                                onChange={(e) => setPodSize(parseInt(e.target.value))}
                            >
                                <option value={3}>3 Players</option>
                                <option value={4}>4 Players (Standard)</option>
                                <option value={5}>5 Players</option>
                                <option value={6}>6 Players</option>
                            </select>
                        </div>
                        <div className="col-md-4">
                            <div className="text-center">
                                <strong>{suggestions?.totalPlayers || 0}</strong> players checked in
                                <br />
                                <strong>{suggestions?.pods?.length || 0}</strong> pods suggested
                            </div>
                        </div>
                        <div className="col-md-4 text-end">
                            {suggestions?.pods?.length > 0 && (
                                <button
                                    className="btn btn-success"
                                    onClick={handleCreateAllPods}
                                >
                                    <i className="fas fa-check-double me-2"></i>
                                    Create All Pods
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Suggested Pods */}
            {suggestions?.pods?.length === 0 && (
                <div className="alert alert-info">
                    <i className="fas fa-info-circle me-2"></i>
                    Not enough players for pods. Need at least {podSize} players.
                </div>
            )}

            <div className="row">
                {suggestions?.pods?.map((pod, index) => (
                    <div key={index} className="col-lg-6 mb-4">
                        <div className="card h-100 pod-suggestion-card">
                            <div className="card-header d-flex justify-content-between align-items-center">
                                <span>
                                    <i className="fas fa-users me-2"></i>
                                    Pod {index + 1}
                                </span>
                                <span className={`badge ${pod.score === 0 ? 'bg-success' : pod.score <= 2 ? 'bg-warning' : 'bg-danger'}`}>
                                    Score: {pod.score}
                                </span>
                            </div>
                            <div className="card-body">
                                {/* Turn Order */}
                                <div className="mb-3">
                                    <div className="d-flex justify-content-between align-items-center mb-2">
                                        <h6 className="mb-0">
                                            <i className="fas fa-sort-numeric-down me-2"></i>
                                            Turn Order:
                                        </h6>
                                        <button
                                            className="btn btn-sm btn-outline-secondary"
                                            onClick={() => randomizeTurnOrder(index)}
                                            title="Randomize turn order"
                                        >
                                            <i className="fas fa-random me-1"></i>
                                            Randomize
                                        </button>
                                    </div>
                                    <div className="turn-order-list">
                                        {getOrderedPlayers(pod, index).map((player, turnIndex) => (
                                            <div
                                                key={player.id}
                                                className="turn-order-item d-flex align-items-center justify-content-between p-2 mb-1 rounded"
                                                draggable
                                                onDragStart={(e) => handleDragStart(e, index, player.id)}
                                                onDragOver={handleDragOver}
                                                onDrop={(e) => handleDrop(e, index, player.id)}
                                            >
                                                <div className="d-flex align-items-center">
                                                    <span className={`turn-number badge ${turnIndex === 0 ? 'bg-warning text-dark' : 'bg-secondary'} me-2`}>
                                                        {turnIndex + 1}
                                                    </span>
                                                    <i className="fas fa-grip-vertical text-muted me-2" style={{ cursor: 'grab' }}></i>
                                                    <span>{player.firstname} {player.lastname}</span>
                                                    {turnIndex === 0 && (
                                                        <span className="badge bg-warning text-dark ms-2">
                                                            <i className="fas fa-play-circle me-1"></i>
                                                            First
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="btn-group btn-group-sm">
                                                    <button
                                                        className="btn btn-outline-secondary"
                                                        onClick={() => movePlayerUp(index, player.id)}
                                                        disabled={turnIndex === 0}
                                                        title="Move up"
                                                    >
                                                        <i className="fas fa-chevron-up"></i>
                                                    </button>
                                                    <button
                                                        className="btn btn-outline-secondary"
                                                        onClick={() => movePlayerDown(index, player.id)}
                                                        disabled={turnIndex === pod.players.length - 1}
                                                        title="Move down"
                                                    >
                                                        <i className="fas fa-chevron-down"></i>
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Pairings breakdown */}
                                <div>
                                    <h6>Matchup History:</h6>
                                    <small className={getScoreColor(pod.score)}>{getScoreLabel(pod.score)}</small>
                                    <div className="pairings-list mt-2">
                                        {pod.pairings.map((pairing, pIndex) => {
                                            const p1 = pod.players.find(p => p.id === pairing.player1);
                                            const p2 = pod.players.find(p => p.id === pairing.player2);
                                            return (
                                                <div key={pIndex} className="pairing-row d-flex justify-content-between">
                                                    <span>{p1?.firstname} vs {p2?.firstname}</span>
                                                    <span className={pairing.previousGames === 0 ? 'text-success' : 'text-muted'}>
                                                        {pairing.previousGames === 0 ? 'Never played!' : `${pairing.previousGames} games`}
                                                    </span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                            <div className="card-footer">
                                <button
                                    className="btn btn-primary w-100"
                                    onClick={() => handleCreatePod(pod, index)}
                                    disabled={creating[index]}
                                >
                                    {creating[index] ? (
                                        <>
                                            <span className="spinner-border spinner-border-sm me-2"></span>
                                            Creating...
                                        </>
                                    ) : (
                                        <>
                                            <i className="fas fa-plus me-2"></i>
                                            Create This Pod
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Leftover Players */}
            {suggestions?.leftover?.length > 0 && (
                <div className="card mt-4 border-warning">
                    <div className="card-header bg-warning text-dark">
                        <i className="fas fa-user-clock me-2"></i>
                        Leftover Players ({suggestions.leftover.length})
                    </div>
                    <div className="card-body">
                        <p className="text-muted mb-2">
                            These players couldn't be placed in a full pod:
                        </p>
                        <div className="d-flex flex-wrap gap-2">
                            {suggestions.leftover.map(player => (
                                <span key={player.id} className="badge bg-secondary fs-6">
                                    {player.firstname} {player.lastname}
                                </span>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PodSuggestionsPage;
