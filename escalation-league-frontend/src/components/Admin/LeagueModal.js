import React, { useState } from 'react';
import EditPodModal from './EditPodModal';

const LeagueModal = ({ league, onClose }) => {
    const [selectedPod, setSelectedPod] = useState(null);

    const handleEditPod = (pod) => {
        setSelectedPod(pod); // Set the selected pod for editing
    };

    const handleCloseEditModal = () => {
        setSelectedPod(null); // Clear the selected pod
    };

    return (
        <div className="modal show d-block" tabIndex="-1" role="dialog" style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}>
            <div className="modal-dialog modal-lg" role="document">
                <div className="modal-content">
                    <div className="modal-header">
                        <h5 className="modal-title">League #{league.leagueId} Pods</h5>
                        <button type="button" className="btn-close" aria-label="Close" onClick={onClose}></button>
                    </div>
                    <div className="modal-body">
                        <table className="table table-striped">
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>Status</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {league.pods.map((pod) => (
                                    <tr key={pod.id}>
                                        <td>{pod.id}</td>
                                        <td>{pod.confirmation_status.charAt(0).toUpperCase() + pod.confirmation_status.slice(1)}</td>
                                        <td>
                                            <button
                                                className="btn btn-primary btn-sm me-2"
                                                onClick={() => handleEditPod(pod)}
                                            >
                                                Edit
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Render the EditPodModal if a pod is selected */}
            {selectedPod && (
                <EditPodModal
                    pod={selectedPod}
                    onClose={handleCloseEditModal}
                    onSave={onClose} // Refresh league modal after saving
                    onDelete={onClose} // Refresh league modal after deletion
                />
            )}
        </div>
    );
};

export default LeagueModal;