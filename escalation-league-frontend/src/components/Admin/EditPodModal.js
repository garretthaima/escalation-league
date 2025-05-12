import React, { useState, useEffect } from 'react';
import { updatePod, removeParticipant, deletePod } from '../../api/podsAdminApi';
import { getPods } from '../../api/podsApi'; // Use getPods instead of getPodDetails
import { updateUserStats } from '../../api/usersApi';
import { updateLeagueStats } from '../../api/userLeaguesApi';
import { updateStats } from '../../utils/statsHelper'; // Assuming you have a function to update stats

const EditPodModal = ({ pod, onClose, onSave, onDelete }) => {
    const [participants, setParticipants] = useState([]);
    const [winnerId, setWinnerId] = useState('');
    const [isDraw, setIsDraw] = useState(false);
    const [currentWinner, setCurrentWinner] = useState(null); // State for the current winner

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
        if (!window.confirm('Are you sure you want to remove this participant?')) return;

        try {
            await removeParticipant(pod.id, participantId);
            setParticipants(participants.filter((p) => p.player_id !== participantId)); // Use player_id
        } catch (err) {
            console.error('Error removing participant:', err.message);
        }
    };

    const handleDeletePod = async () => {
        if (!window.confirm('Are you sure you want to delete this pod?')) return;

        try {
            // Reverse stats for all participants
            await updateStats(participants, pod.league_id, true);

            // Delete the pod
            await deletePod(pod.id);

            // Refresh the pods list
            onDelete();

            // Close the modal
            onClose();
        } catch (err) {
            console.error('Error deleting pod:', err.message);
        }
    };

    const handleSave = async () => {
        const updates = {
            participants: participants.map((participant) => ({
                player_id: participant.player_id,
                result: isDraw ? 'draw' : participant.player_id === winnerId ? 'win' : 'loss',
                confirmed: 1, // Mark all participants as confirmed
            })),
            result: isDraw ? 'draw' : 'win',
            confirmation_status: 'complete', // Mark the pod as complete
        };

        try {
            // Reverse previous stats
            await updateStats(participants, pod.league_id, true);

            // Apply new stats
            await updateStats(updates.participants, pod.league_id);

            // Update the pod with the new result
            await updatePod(pod.id, updates);

            // Refresh the pods list
            onSave();
        } catch (err) {
            console.error('Error updating pod:', err.message);
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
                                        // Reverse previous stats
                                        await updateStats(participants, pod.league_id, true);

                                        // Update participants' results and confirmed status
                                        const updatedParticipants = participants.map((participant) => ({
                                            player_id: participant.player_id,
                                            result: participant.result || 'loss', // Default to "loss" if result is null
                                            confirmed: 1, // Ensure all participants are confirmed
                                        }));

                                        // Apply new stats
                                        await updateStats(updatedParticipants, pod.league_id);

                                        // Update the pod's confirmation_status to "complete"
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
        </div>
    );
};

export default EditPodModal;