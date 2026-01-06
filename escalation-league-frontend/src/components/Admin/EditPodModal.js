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
        <div className="modal show d-block" tabIndex="-1" role="dialog" style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}>
            <div className="modal-dialog modal-lg" role="document">
                <div className="modal-content">
                    <div className="modal-header">
                        <h5 className="modal-title">Edit Pod</h5>
                        <button type="button" className="btn-close" aria-label="Close" onClick={onClose}></button>
                    </div>
                    <div className="modal-body">
                        {/* Display Pod Status */}
                        <div className="mb-3">
                            <strong>Status:</strong> {pod.confirmation_status.charAt(0).toUpperCase() + pod.confirmation_status.slice(1)}
                        </div>

                        {/* Display Pod Result */}
                        <div className="mb-3">
                            <strong>Result:</strong> {pod.result === 'win' ? 'Win' : pod.result === 'draw' ? 'Draw' : 'Pending'}
                        </div>

                        <h5>Participants</h5>
                        <ul className="list-group mb-3">
                            {participants.map((participant, index) => (
                                <li
                                    key={`${participant.player_id || 'participant'}-${index}`}
                                    className={`list-group-item d-flex justify-content-between align-items-center ${currentWinner && currentWinner.player_id === participant.player_id ? 'bg-success text-white' : ''
                                        }`}
                                >
                                    {participant.firstname} {participant.lastname}
                                    <button
                                        className="btn btn-danger btn-sm"
                                        onClick={() => handleRemoveParticipant(participant.player_id)}
                                    >
                                        Remove
                                    </button>
                                </li>
                            ))}
                        </ul>
                        <div className="form-check mb-3">
                            <input
                                className="form-check-input"
                                type="checkbox"
                                id="isDraw"
                                checked={isDraw}
                                onChange={(e) => setIsDraw(e.target.checked)}
                            />
                            <label className="form-check-label" htmlFor="isDraw">
                                Mark as Draw
                            </label>
                        </div>

                        {/* Override Button for Pending Pods */}
                        {pod.confirmation_status === 'pending' && (
                            <button
                                className="btn btn-warning mb-3"
                                onClick={async () => {
                                    try {
                                        // Update participants' results and confirmed status
                                        const updatedParticipants = participants.map((participant) => ({
                                            player_id: participant.player_id,
                                            result: participant.result || 'loss', // Default to "loss" if result is null
                                            confirmed: 1, // Ensure all participants are confirmed
                                        }));

                                        // Update the pod's confirmation_status to "complete"
                                        // Backend will handle stats updates
                                        const updates = {
                                            participants: updatedParticipants,
                                            confirmation_status: 'complete', // Mark the pod as complete
                                        };

                                        await updatePod(pod.id, updates);

                                        // Update the local pod state
                                        pod.confirmation_status = 'complete';

                                        // Refresh the pods list
                                        onSave();
                                    } catch (err) {
                                        console.error('Error overriding pod status:', err.message);
                                    }
                                }}
                            >
                                Override to Complete
                            </button>
                        )}
                        {!isDraw && (
                            <div className="mb-3">
                                <label htmlFor="winnerSelect" className="form-label">
                                    Set Winner:
                                </label>
                                <select
                                    id="winnerSelect"
                                    className="form-select"
                                    value={winnerId}
                                    onChange={(e) => setWinnerId(e.target.value)}
                                >
                                    <option value="">Select Winner</option>
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
                    </div>
                    <div className="modal-footer">
                        <button type="button" className="btn btn-primary" onClick={handleSave}>
                            Save
                        </button>
                        <button type="button" className="btn btn-danger" onClick={handleDeletePod}>
                            Delete Pod
                        </button>
                        <button type="button" className="btn btn-secondary" onClick={onClose}>
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
        </div>
    );
};

export default EditPodModal;