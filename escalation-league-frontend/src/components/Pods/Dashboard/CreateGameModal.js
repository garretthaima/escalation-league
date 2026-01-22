import React, { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import { getLeagueParticipants } from '../../../api/userLeaguesApi';
import { createPod } from '../../../api/podsApi';
import { useToast } from '../../context/ToastContext';
import LoadingSpinner from '../../Shared/LoadingSpinner';

/**
 * Modal for creating a new game with player selection and turn order
 */
const CreateGameModal = ({ show, onHide, leagueId, userId, onGameCreated }) => {
    const [leagueUsers, setLeagueUsers] = useState([]);
    const [selectedPlayers, setSelectedPlayers] = useState([]);
    const [turnOrder, setTurnOrder] = useState([]);
    const [creating, setCreating] = useState(false);
    const [loading, setLoading] = useState(false);
    const { showToast } = useToast();

    // Load league participants when modal opens
    useEffect(() => {
        const loadParticipants = async () => {
            if (!show || !leagueId) return;

            setLoading(true);
            try {
                const participants = await getLeagueParticipants(leagueId);
                const users = Array.isArray(participants) ? participants : [];
                // Map user_id to id for consistency
                const mappedUsers = users.map(u => ({ ...u, id: u.user_id || u.id }));
                setLeagueUsers(mappedUsers);

                // Pre-select current user (use String comparison for type safety)
                const currentUser = mappedUsers.find(u => String(u.id) === String(userId));
                if (currentUser) {
                    setSelectedPlayers([currentUser]);
                    setTurnOrder([currentUser.id]);
                }
            } catch (err) {
                console.error('Error loading participants:', err);
                showToast('Failed to load league participants.', 'error');
            } finally {
                setLoading(false);
            }
        };

        if (show) {
            loadParticipants();
        } else {
            // Reset state when modal closes
            setSelectedPlayers([]);
            setTurnOrder([]);
        }
    }, [show, leagueId, userId, showToast]);

    // Toggle player selection
    const togglePlayer = (user) => {
        const isSelected = selectedPlayers.some(p => String(p.id) === String(user.id));
        if (isSelected) {
            setSelectedPlayers(prev => prev.filter(p => String(p.id) !== String(user.id)));
            setTurnOrder(prev => prev.filter(id => String(id) !== String(user.id)));
        } else {
            if (selectedPlayers.length >= 4) {
                showToast('Maximum 4 players allowed', 'warning');
                return;
            }
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
    const moveUp = useCallback((playerId) => {
        setTurnOrder(prev => {
            const order = [...prev];
            const index = order.indexOf(playerId);
            if (index <= 0) return prev;
            [order[index], order[index - 1]] = [order[index - 1], order[index]];
            return order;
        });
    }, []);

    // Move player down in turn order
    const moveDown = useCallback((playerId) => {
        setTurnOrder(prev => {
            const order = [...prev];
            const index = order.indexOf(playerId);
            if (index === -1 || index >= order.length - 1) return prev;
            [order[index], order[index + 1]] = [order[index + 1], order[index]];
            return order;
        });
    }, []);

    // Get player by ID - use leagueUsers as source of truth for player data
    // Use String comparison to handle potential type mismatches between numbers/strings
    const getPlayer = useCallback((playerId) => {
        return leagueUsers.find(p => String(p.id) === String(playerId));
    }, [leagueUsers]);

    // Create the game
    const handleCreate = async () => {
        if (selectedPlayers.length < 3) {
            showToast('At least 3 players are required', 'warning');
            return;
        }

        setCreating(true);
        try {
            await createPod({
                leagueId,
                player_ids: selectedPlayers.map(p => p.id),
                turn_order: turnOrder
            });

            showToast('Game created successfully!', 'success');
            onHide();
            if (onGameCreated) onGameCreated();
        } catch (err) {
            console.error('Error creating game:', err);
            showToast(err.response?.data?.error || 'Failed to create game.', 'error');
        } finally {
            setCreating(false);
        }
    };

    if (!show) return null;

    return (
        <>
            <div className="modal fade show" style={{ display: 'block' }} tabIndex="-1">
                <div className="modal-dialog modal-lg">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h5 className="modal-title">
                                <i className="fas fa-gamepad me-2"></i>
                                Create Game
                            </h5>
                            <button
                                type="button"
                                className="btn-close"
                                onClick={onHide}
                                aria-label="Close"
                            />
                        </div>
                        <div className="modal-body">
                            {loading ? (
                                <div className="text-center py-4">
                                    <LoadingSpinner size="md" />
                                </div>
                            ) : (
                                <div className="row">
                                    {/* Player Selection */}
                                    <div className="col-md-6">
                                        <h6>
                                            <i className="fas fa-user-plus me-2"></i>
                                            Select Players ({selectedPlayers.length}/4)
                                        </h6>
                                        <p className="text-muted small mb-2">
                                            Select 3-4 players for this game
                                        </p>
                                        <div
                                            className="list-group"
                                            style={{ maxHeight: '350px', overflowY: 'auto' }}
                                        >
                                            {leagueUsers.map(user => {
                                                const isSelected = selectedPlayers.some(p => String(p.id) === String(user.id));
                                                const isCurrentUser = String(user.id) === String(userId);
                                                return (
                                                    <button
                                                        key={user.id}
                                                        type="button"
                                                        className={`list-group-item list-group-item-action d-flex justify-content-between align-items-center`}
                                                        onClick={() => togglePlayer(user)}
                                                        style={isSelected ? {
                                                            background: 'var(--brand-purple)',
                                                            borderColor: 'var(--brand-purple)',
                                                            color: '#fff'
                                                        } : {}}
                                                    >
                                                        <span>
                                                            {user.firstname} {user.lastname}
                                                            {isCurrentUser && (
                                                                <span
                                                                    className="badge ms-2"
                                                                    style={{
                                                                        background: isSelected ? 'var(--brand-gold)' : 'var(--brand-gold)',
                                                                        color: '#1a1a2e'
                                                                    }}
                                                                >
                                                                    You
                                                                </span>
                                                            )}
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
                                                className="btn btn-sm"
                                                onClick={randomizeTurnOrder}
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
                                        <p className="text-muted small mb-2">
                                            Use arrows to reorder who goes first
                                        </p>
                                        {turnOrder.length === 0 ? (
                                            <div className="alert alert-secondary mb-0">
                                                <i className="fas fa-info-circle me-2"></i>
                                                Select players to set turn order
                                            </div>
                                        ) : (
                                            <div className="list-group">
                                                {turnOrder.map((playerId, index) => {
                                                    const player = getPlayer(playerId);
                                                    if (!player) return null;
                                                    return (
                                                        <div
                                                            key={playerId}
                                                            className="list-group-item d-flex justify-content-between align-items-center py-2"
                                                            style={{
                                                                background: index === 0 ? 'rgba(212, 175, 55, 0.15)' : 'var(--bg-primary)',
                                                                borderColor: index === 0 ? 'var(--brand-gold)' : 'var(--border-color)'
                                                            }}
                                                        >
                                                            <div className="d-flex align-items-center flex-grow-1 min-width-0">
                                                                <span
                                                                    className="badge me-2 flex-shrink-0"
                                                                    style={{
                                                                        background: index === 0 ? 'var(--brand-gold)' : 'var(--bg-secondary)',
                                                                        color: index === 0 ? '#1a1a2e' : 'var(--text-primary)'
                                                                    }}
                                                                >
                                                                    {index + 1}
                                                                </span>
                                                                <span className="text-truncate">
                                                                    {player.firstname} {player.lastname}
                                                                </span>
                                                            </div>
                                                            <div className="btn-group btn-group-sm flex-shrink-0 ms-2">
                                                                <button
                                                                    className="btn btn-sm px-2"
                                                                    onClick={() => moveUp(playerId)}
                                                                    disabled={index === 0}
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
                                                                    onClick={() => moveDown(playerId)}
                                                                    disabled={index === turnOrder.length - 1}
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
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="modal-footer">
                            <button
                                type="button"
                                className="btn btn-secondary"
                                onClick={onHide}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                className="btn"
                                onClick={handleCreate}
                                disabled={selectedPlayers.length < 3 || creating}
                                style={{
                                    background: 'var(--brand-purple)',
                                    borderColor: 'var(--brand-purple)',
                                    color: '#fff'
                                }}
                            >
                                {creating ? (
                                    <>
                                        <span className="spinner-border spinner-border-sm me-2"></span>
                                        Creating...
                                    </>
                                ) : (
                                    <>
                                        <i className="fas fa-play me-2"></i>
                                        Create Game
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
            <div className="modal-backdrop fade show"></div>
        </>
    );
};

CreateGameModal.propTypes = {
    show: PropTypes.bool.isRequired,
    onHide: PropTypes.func.isRequired,
    leagueId: PropTypes.number,
    userId: PropTypes.number,
    onGameCreated: PropTypes.func
};

export default CreateGameModal;
