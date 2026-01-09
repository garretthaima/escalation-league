import React, { useState, useEffect } from 'react';
import { updatePod, removeParticipant, deletePod } from '../../api/podsAdminApi';
import { getPods } from '../../api/podsApi';
import { useToast } from '../context/ToastContext';
import ConfirmModal from '../Shared/ConfirmModal';

const EditPodModal = ({ pod, onClose, onSave, onDelete }) => {
    const [participants, setParticipants] = useState([]);
    const [winnerId, setWinnerId] = useState('');
    const [isDraw, setIsDraw] = useState(false);
    const [currentWinner, setCurrentWinner] = useState(null); // State for the current winner
    const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [participantToRemove, setParticipantToRemove] = useState(null);
    const { showToast } = useToast();

    useEffect(() => {
        const fetchPodDetails = async () => {
            try {
                // Use getPods with a filter for podId
                const podDetails = await getPods({ podId: pod.id }); // Do not destructure
                if (podDetails) {
                    setParticipants(podDetails.participants || []); // Ensure participants is an array

                    // Check if confirmation_status is complete and set the current winner
                    const winner = podDetails.participants.find(
                        (participant) => participant.result === 'win'
                    );
                    setCurrentWinner(winner || null);

                } else {
                    console.error('Pod not found.');
                }
            } catch (err) {
                console.error('Error fetching pod details:', err.message);
            }
        };

        fetchPodDetails();
    }, [pod]);

    console.log('Current winner:', currentWinner);

    const handleRemoveParticipant = async (participantId) => {
        setParticipantToRemove(participantId);
        setShowRemoveConfirm(true);
    };

    const confirmRemoveParticipant = async () => {
        try {
            await removeParticipant(pod.id, participantToRemove);
            setParticipants(participants.filter((p) => p.player_id !== participantToRemove));
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
            // Backend will handle reversing stats if pod was complete
            await deletePod(pod.id);
            showToast('Pod deleted successfully', 'success');

            // Refresh the pods list
            onDelete();

            // Close the modal
            onClose();
        } catch (err) {
            console.error('Error deleting pod:', err.message);
            showToast('Failed to delete pod', 'error');
        } finally {
            setShowDeleteConfirm(false);
        }
    };

    const handleSave = async () => {
        const updates = {
            participants: participants.map((participant) => ({
                player_id: participant.player_id,
                result: isDraw ? 'draw' : participant.player_id == winnerId ? 'win' : 'loss', // Use == for loose comparison
                confirmed: 1, // Mark all participants as confirmed
            })),
            result: isDraw ? 'draw' : 'win',
            confirmation_status: 'complete', // Mark the pod as complete
        };


        try {
            // Backend will handle reversing old stats and applying new stats
            await updatePod(pod.id, updates);
            showToast('Pod updated successfully', 'success');

            // Refresh the pods list
            onSave();
        } catch (err) {
            console.error('Error updating pod:', err.message);
            showToast('Failed to update pod', 'error');
        }
    };

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
                                        <span className={`badge ${pod.confirmation_status === 'open' ? 'bg-info' :
                                                pod.confirmation_status === 'active' ? 'bg-warning text-dark' :
                                                    pod.confirmation_status === 'pending' ? 'bg-warning text-dark' :
                                                        'bg-success'
                                            }`}>
                                            {pod.confirmation_status.charAt(0).toUpperCase() + pod.confirmation_status.slice(1)}
                                        </span>
                                    </div>
                                </div>
                                <div className="col-6">
                                    <small className="text-muted">Result</small>
                                    <div>
                                        {pod.result === 'win' ? 'Win' : pod.result === 'draw' ? 'Draw' : 'Pending'}
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
                                    className={`list-group-item d-flex justify-content-between align-items-center ${currentWinner && currentWinner.player_id === participant.player_id ? 'list-group-item-success' : ''
                                        }`}
                                >
                                    <div>
                                        {participant.firstname} {participant.lastname}
                                    </div>
                                    <button
                                        className="btn btn-outline-danger btn-sm"
                                        onClick={() => handleRemoveParticipant(participant.player_id)}
                                    >
                                        <i className="fas fa-times"></i>
                                    </button>
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
                                    onChange={(e) => setIsDraw(e.target.checked)}
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
                                        {participants.map((participant, index) => (
                                            <option
                                                key={`${participant.player_id || 'participant'}-${index}`}
                                                value={participant.player_id}
                                            >
                                                {participant.firstname} {participant.lastname}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            {/* Override Button for Pending Pods */}
                            {pod.confirmation_status === 'pending' && (
                                <div className="alert alert-warning mt-3 mb-0">
                                    <p className="mb-2">
                                        <i className="fas fa-exclamation-triangle me-2"></i>
                                        <strong>Pending Confirmation</strong>
                                    </p>
                                    <p className="small mb-2">This pod is waiting for player confirmations.</p>
                                    <button
                                        className="btn btn-warning btn-sm"
                                        onClick={async () => {
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
                                                pod.confirmation_status = 'complete';
                                                onSave();
                                            } catch (err) {
                                                console.error('Error overriding pod status:', err.message);
                                            }
                                        }}
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
                </div>

                {/* Footer Actions */}
                <div className="offcanvas-footer border-top p-3 bg-light">
                    <div className="d-flex gap-2">
                        <button
                            type="button"
                            className="btn btn-primary flex-grow-1"
                            onClick={handleSave}
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