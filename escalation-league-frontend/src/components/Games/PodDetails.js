import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getPodDetails, deletePod, overrideWinner } from '../../api/podsApi';

const PodDetails = ({ podId, isAdmin, onClose }) => {
    const [pod, setPod] = useState(null);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchPodDetails = async () => {
            try {
                const podDetails = await getPodDetails(podId);
                setPod(podDetails);
            } catch (err) {
                console.error('Error fetching pod details:', err);
                setError('Failed to fetch pod details.');
            }
        };

        fetchPodDetails();
    }, [podId]);

    const handleDelete = async () => {
        try {
            await deletePod(podId);
            alert('Pod deleted successfully!');
            onClose(); // Close the modal or navigate back
        } catch (err) {
            console.error('Error deleting pod:', err);
            setError('Failed to delete pod.');
        }
    };

    const handleOverrideWinner = async (winnerId) => {
        try {
            await overrideWinner(podId, winnerId);
            const updatedPod = await getPodDetails(podId); // Refresh pod details
            setPod(updatedPod);
        } catch (err) {
            console.error('Error overriding winner:', err);
            setError('Failed to override winner.');
        }
    };

    if (error) {
        return <div className="alert alert-danger">{error}</div>;
    }

    if (!pod) {
        return <div>Loading...</div>;
    }

    return (
        <div>
            <h3>Pod #{pod.id}</h3>
            <p><strong>League:</strong> {pod.league_id}</p>
            <p><strong>Result:</strong> {pod.result}</p>
            <p><strong>Created At:</strong> {new Date(pod.created_at).toLocaleString()}</p>

            {pod.win_condition && (
                <div>
                    <h6>Win Condition:</h6>
                    <p><strong>Name:</strong> {pod.win_condition.name}</p>
                    <p><strong>Description:</strong> {pod.win_condition.description}</p>
                    <p><strong>Category:</strong> {pod.win_condition.category}</p>
                </div>
            )}

            <h6>Participants:</h6>
            <ul>
                {pod.participants.map((participant) => (
                    <li key={participant.player_id}>
                        {participant.firstname} {participant.lastname} - {participant.result}
                    </li>
                ))}
            </ul>

            {/* Admin Actions */}
            {isAdmin && (
                <div className="admin-actions">
                    <button className="btn btn-danger" onClick={handleDelete}>
                        Delete Pod
                    </button>
                    <button
                        className="btn btn-warning"
                        onClick={() => handleOverrideWinner(prompt('Enter new winner ID:'))}
                    >
                        Override Winner
                    </button>
                </div>
            )}

            {/* Close Button */}
            <button className="btn btn-secondary mt-3" onClick={onClose}>
                Close
            </button>
        </div>
    );
};

export default PodDetails;