import React, { useState, useEffect } from 'react';
import { updatePod, removeParticipant, deletePod } from '../../api/podsAdminApi';
import { getPods } from '../../api/podsApi';
import { useToast } from '../context/ToastContext';
import ConfirmModal from '../Shared/ConfirmModal';

const EditPodModal = ({ pod, onClose, onSave, onDelete }) => {
    // Loaded state
    const [participants, setParticipants] = useState([]);
    const [confirmationStatus, setConfirmationStatus] = useState('');

    // Derived/editable state
    const [winnerId, setWinnerId] = useState('');
    const [isDraw, setIsDraw] = useState(false);
    const [dqPlayerIds, setDqPlayerIds] = useState([]);

    // Track originals to compute changes
    const [originalState, setOriginalState] = useState(null);

    // UI state
    const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [participantToRemove, setParticipantToRemove] = useState(null);
    const [loading, setLoading] = useState(true);

    const { showToast } = useToast();

    useEffect(() => {
        const fetchPodDetails = async () => {
            try {
                setLoading(true);
                const podDetails = await getPods({ podId: pod.id });
                if (!podDetails) {
                    console.error('Pod not found.');
                    return;
                }

                // Store participants with all their data
                setParticipants(podDetails.participants || []);
                setConfirmationStatus(podDetails.confirmation_status);

                // Derive state from participant results
                const winner = podDetails.participants.find(p => p.result === 'win');
                const dqPlayers = podDetails.participants.filter(p => p.result === 'disqualified').map(p => p.player_id);
                const nonDqParticipants = podDetails.participants.filter(p => p.result !== 'disqualified');
                const allDraw = nonDqParticipants.length > 0 &&
                    nonDqParticipants.every(p => p.result === 'draw');

                setWinnerId(winner ? String(winner.player_id) : '');
                setDqPlayerIds(dqPlayers);
                setIsDraw(allDraw);

                // Store original state for comparison
                setOriginalState({
                    participants: podDetails.participants.map(p => ({
                        player_id: p.player_id,
                        result: p.result,
                        confirmed: p.confirmed
                    })),
                    confirmationStatus: podDetails.confirmation_status,
                    winnerId: winner ? String(winner.player_id) : '',
                    isDraw: allDraw,
                    dqPlayerIds: dqPlayers
                });
            } catch (err) {
                console.error('Error fetching pod details:', err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchPodDetails();
    }, [pod]);

    const toggleDq = (playerId) => {
        setDqPlayerIds(prev => {
            if (prev.includes(playerId)) {
                return prev.filter(id => id !== playerId);
            } else {
                // If DQ'ing the winner, clear winner
                if (String(playerId) === winnerId) {
                    setWinnerId('');
                }
                return [...prev, playerId];
            }
        });
    };

    const handleRemoveParticipant = async (participantId) => {
        setParticipantToRemove(participantId);
        setShowRemoveConfirm(true);
    };

    const confirmRemoveParticipant = async () => {
        try {
            await removeParticipant(pod.id, participantToRemove);
            setParticipants(participants.filter((p) => p.player_id !== participantToRemove));
            // Also remove from DQ list if they were DQ'd
            setDqPlayerIds(prev => prev.filter(id => id !== participantToRemove));
            // Clear winner if removed player was winner
            if (String(participantToRemove) === winnerId) {
                setWinnerId('');
            }
            showToast('Participant removed successfully', 'success');
        } catch (err) {
            console.error('Error removing participant:', err.message);
            showToast('Failed to remove participant', 'error');
        } finally {
            setShowRemoveConfirm(false);
            setParticipantToRemove(null);
        }
    };

    const handleDeletePod = async () => {
        setShowDeleteConfirm(true);
    };

    const confirmDeletePod = async () => {
        try {
            await deletePod(pod.id);
            showToast('Pod deleted successfully', 'success');
            onDelete();
            onClose();
        } catch (err) {
            console.error('Error deleting pod:', err.message);
            showToast('Failed to delete pod', 'error');
        } finally {
            setShowDeleteConfirm(false);
        }
    };

    const handleSave = async () => {
        if (!originalState) return;

        // Build new participant results based on current UI state
        const newParticipantResults = participants.map(p => {
            // DQ takes priority
            if (dqPlayerIds.includes(p.player_id)) {
                return { player_id: p.player_id, result: 'disqualified', confirmed: p.confirmed };
            }
            // Draw mode
            if (isDraw) {
                return { player_id: p.player_id, result: 'draw', confirmed: p.confirmed };
            }
            // Winner/loser mode
            if (winnerId) {
                const isWinner = String(p.player_id) === winnerId;
                return { player_id: p.player_id, result: isWinner ? 'win' : 'loss', confirmed: p.confirmed };
            }
            // No changes made - preserve original
            const original = originalState.participants.find(op => op.player_id === p.player_id);
            return { player_id: p.player_id, result: original?.result || null, confirmed: p.confirmed };
        });

        // Determine pod result
        let podResult = null;
        if (isDraw) {
            podResult = 'draw';
        } else if (winnerId) {
            podResult = 'win';
        }

        // Only send participants and result - DO NOT send confirmation_status
        // Status changes should only happen via Force Complete button
        const updates = {
            participants: newParticipantResults,
        };

        // Only include result if it changed
        if (podResult) {
            updates.result = podResult;
        }

        try {
            await updatePod(pod.id, updates);
            showToast('Pod updated successfully', 'success');
            onSave();
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
            showToast('Pod force completed', 'success');
            onSave();
        } catch (err) {
            console.error('Error overriding pod status:', err.message);
            showToast('Failed to force complete pod', 'error');
        }
    };

    // Get result badge for a participant
    const getResultBadge = (participant) => {
        if (dqPlayerIds.includes(participant.player_id)) {
            return <span className="badge bg-danger ms-2">DQ</span>;
        }
        if (isDraw) {
            return <span className="badge bg-secondary ms-2">Draw</span>;
        }
        if (winnerId && String(participant.player_id) === winnerId) {
            return <span className="badge bg-success ms-2">Winner</span>;
        }
        if (winnerId && String(participant.player_id) !== winnerId) {
            return <span className="badge bg-warning text-dark ms-2">Loss</span>;
        }
        // Show original result if no changes
        const original = originalState?.participants.find(op => op.player_id === participant.player_id);
        if (original?.result === 'win') {
            return <span className="badge bg-success ms-2">Winner</span>;
        }
        if (original?.result === 'loss') {
            return <span className="badge bg-warning text-dark ms-2">Loss</span>;
        }
        if (original?.result === 'draw') {
            return <span className="badge bg-secondary ms-2">Draw</span>;
        }
        if (original?.result === 'disqualified') {
            return <span className="badge bg-danger ms-2">DQ</span>;
        }
        return null;
    };

    // Non-DQ participants for winner selection
    const eligibleParticipants = participants.filter(p => !dqPlayerIds.includes(p.player_id));

    return (
        <>
            {/* Backdrop */}
            <div
                className="offcanvas-backdrop fade show"
                onClick={onClose}
                style={{ zIndex: 1040 }}
            />

            {/* Side Panel */}
            <div
                className="offcanvas offcanvas-end show"
                tabIndex="-1"
                style={{
                    visibility: 'visible',
                    width: '600px',
                    zIndex: 1045
                }}
            >
                <div className="offcanvas-header border-bottom">
                    <h5 className="offcanvas-title">
                        <i className="fas fa-edit me-2"></i>
                        Edit Pod #{pod.id}
                    </h5>
                    <button type="button" className="btn-close" onClick={onClose}></button>
                </div>

                <div className="offcanvas-body">
                    {loading ? (
                        <div className="text-center py-4">
                            <div className="spinner-border" role="status">
                                <span className="visually-hidden">Loading...</span>
                            </div>
                        </div>
                    ) : (
                        <>
                            {/* Pod Information Card */}
                            <div className="card mb-4">
                                <div className="card-header">
                                    <strong>Pod Information</strong>
                                </div>
                                <div className="card-body">
                                    <div className="row mb-2">
                                        <div className="col-6">
                                            <small className="text-muted">Status</small>
                                            <div>
                                                <span className={`badge ${confirmationStatus === 'open' ? 'bg-info' :
                                                        confirmationStatus === 'active' ? 'bg-warning text-dark' :
                                                            confirmationStatus === 'pending' ? 'bg-warning text-dark' :
                                                                'bg-success'
                                                    }`}>
                                                    {confirmationStatus.charAt(0).toUpperCase() + confirmationStatus.slice(1)}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="col-6">
                                            <small className="text-muted">Result</small>
                                            <div>
                                                {isDraw ? 'Draw' : winnerId ? 'Win' : 'Pending'}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="row">
                                        <div className="col-6">
                                            <small className="text-muted">Date</small>
                                            <div>{new Date(pod.created_at).toLocaleDateString()}</div>
                                        </div>
                                        <div className="col-6">
                                            <small className="text-muted">Players</small>
                                            <div>{participants.length} participants</div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Participants Section */}
                            <div className="card mb-4">
                                <div className="card-header d-flex justify-content-between align-items-center">
                                    <strong>Participants</strong>
                                    <span className="badge bg-secondary">{participants.length}</span>
                                </div>
                                <ul className="list-group list-group-flush">
                                    {participants.map((participant, index) => (
                                        <li
                                            key={`${participant.player_id || 'participant'}-${index}`}
                                            className={`list-group-item d-flex justify-content-between align-items-center ${
                                                dqPlayerIds.includes(participant.player_id) ? 'list-group-item-danger' :
                                                winnerId && String(participant.player_id) === winnerId ? 'list-group-item-success' : ''
                                            }`}
                                        >
                                            <div className="d-flex align-items-center">
                                                <span className={dqPlayerIds.includes(participant.player_id) ? 'text-decoration-line-through' : ''}>
                                                    {participant.firstname} {participant.lastname}
                                                </span>
                                                {getResultBadge(participant)}
                                            </div>
                                            <div className="d-flex gap-2">
                                                <button
                                                    className={`btn btn-sm ${dqPlayerIds.includes(participant.player_id) ? 'btn-danger' : 'btn-outline-secondary'}`}
                                                    onClick={() => toggleDq(participant.player_id)}
                                                    title={dqPlayerIds.includes(participant.player_id) ? 'Remove DQ' : 'Disqualify'}
                                                >
                                                    <i className="fas fa-ban"></i>
                                                </button>
                                                <button
                                                    className="btn btn-outline-danger btn-sm"
                                                    onClick={() => handleRemoveParticipant(participant.player_id)}
                                                    title="Remove from pod"
                                                >
                                                    <i className="fas fa-times"></i>
                                                </button>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            {/* Game Result Section */}
                            <div className="card mb-4">
                                <div className="card-header">
                                    <strong>Game Result</strong>
                                </div>
                                <div className="card-body">
                                    <div className="form-check mb-3">
                                        <input
                                            className="form-check-input"
                                            type="checkbox"
                                            id="isDraw"
                                            checked={isDraw}
                                            onChange={(e) => {
                                                setIsDraw(e.target.checked);
                                                if (e.target.checked) {
                                                    setWinnerId('');
                                                }
                                            }}
                                        />
                                        <label className="form-check-label" htmlFor="isDraw">
                                            <i className="fas fa-handshake me-2"></i>
                                            Mark as Draw
                                        </label>
                                    </div>

                                    {!isDraw && (
                                        <div>
                                            <label htmlFor="winnerSelect" className="form-label">
                                                <i className="fas fa-trophy me-2"></i>
                                                Select Winner
                                            </label>
                                            <select
                                                id="winnerSelect"
                                                className="form-select"
                                                value={winnerId}
                                                onChange={(e) => setWinnerId(e.target.value)}
                                            >
                                                <option value="">Choose winner...</option>
                                                {eligibleParticipants.map((participant, index) => (
                                                    <option
                                                        key={`${participant.player_id || 'participant'}-${index}`}
                                                        value={participant.player_id}
                                                    >
                                                        {participant.firstname} {participant.lastname}
                                                    </option>
                                                ))}
                                            </select>
                                            {eligibleParticipants.length === 0 && (
                                                <small className="text-danger">All players are disqualified</small>
                                            )}
                                        </div>
                                    )}

                                    {/* Override Button for Pending Pods */}
                                    {confirmationStatus === 'pending' && (
                                        <div className="alert alert-warning mt-3 mb-0">
                                            <p className="mb-2">
                                                <i className="fas fa-exclamation-triangle me-2"></i>
                                                <strong>Pending Confirmation</strong>
                                            </p>
                                            <p className="small mb-2">This pod is waiting for player confirmations.</p>
                                            <button
                                                className="btn btn-warning btn-sm"
                                                onClick={handleForceComplete}
                                            >
                                                <i className="fas fa-forward me-2"></i>
                                                Force Complete
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Danger Zone */}
                            <div className="card border-danger mb-4">
                                <div className="card-header bg-danger text-white">
                                    <strong>
                                        <i className="fas fa-exclamation-triangle me-2"></i>
                                        Danger Zone
                                    </strong>
                                </div>
                                <div className="card-body">
                                    <p className="text-muted small mb-2">
                                        Deleting this pod will reverse all stat changes and cannot be undone.
                                    </p>
                                    <button
                                        type="button"
                                        className="btn btn-outline-danger"
                                        onClick={handleDeletePod}
                                    >
                                        <i className="fas fa-trash me-2"></i>
                                        Delete Pod
                                    </button>
                                </div>
                            </div>
                        </>
                    )}
                </div>

                {/* Footer Actions */}
                <div className="offcanvas-footer border-top p-3 bg-light">
                    <div className="d-flex gap-2">
                        <button
                            type="button"
                            className="btn btn-primary flex-grow-1"
                            onClick={handleSave}
                            disabled={loading}
                        >
                            <i className="fas fa-save me-2"></i>
                            Save Changes
                        </button>
                        <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={onClose}
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            </div>

            <ConfirmModal
                show={showRemoveConfirm}
                title="Remove Participant"
                message="Are you sure you want to remove this participant from the pod?"
                onConfirm={confirmRemoveParticipant}
                onCancel={() => setShowRemoveConfirm(false)}
                confirmText="Remove"
                type="danger"
            />

            <ConfirmModal
                show={showDeleteConfirm}
                title="Delete Pod"
                message="Are you sure you want to delete this pod? This action cannot be undone."
                onConfirm={confirmDeletePod}
                onCancel={() => setShowDeleteConfirm(false)}
                confirmText="Delete"
                type="danger"
            />
        </>
    );
};

export default EditPodModal;
