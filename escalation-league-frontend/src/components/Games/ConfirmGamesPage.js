import React, { useState, useEffect } from 'react';
import { getPods, logPodResult } from '../../api/podsApi';
import { getUserProfile } from '../../api/usersApi';
import { useToast } from '../context/ToastContext';
import { getResultBadge, getConfirmationBadge } from '../../utils/badgeHelpers';

const ConfirmGamesTab = () => {
    const [gamesWaitingConfirmation, setGamesWaitingConfirmation] = useState([]);
    const [userId, setUserId] = useState(null);
    const [error, setError] = useState(null);
    const { showToast } = useToast();

    useEffect(() => {
        const fetchGamesWaitingConfirmation = async () => {
            try {
                const userProfile = await getUserProfile();
                setUserId(userProfile.user.id);

                // Fetch pending pods using getPods with a filter
                const pods = await getPods({ confirmation_status: 'pending' });
                // Filter to only show pods where current user is a participant
                const userPods = pods.filter(pod =>
                    pod.participants?.some(p => p.player_id === userProfile.user.id)
                );
                setGamesWaitingConfirmation(userPods);
            } catch (err) {
                console.error('Error fetching games waiting confirmation:', err);
                setError('Failed to fetch games waiting confirmation.');
            }
        };

        fetchGamesWaitingConfirmation();
    }, []);

    const handleConfirm = async (podId, leagueId) => {
        try {
            // Confirm the game - backend will now handle stats updates automatically
            // Don't send result - just confirm with existing result
            await logPodResult(podId, {});

            showToast('Game successfully confirmed!', 'success');

            // Refresh the list of games waiting confirmation
            const pods = await getPods({ confirmation_status: 'pending' });
            // Filter to only show pods where current user is a participant
            const userPods = pods.filter(pod =>
                pod.participants?.some(p => p.player_id === userId)
            );
            setGamesWaitingConfirmation(userPods);
        } catch (err) {
            console.error('Error confirming game:', err.message);
            showToast('Failed to confirm game.', 'error');
        }
    };

    const getParticipantClass = (participant) => {
        if (participant.result === 'win') {
            return 'table-success'; // Green for winners
        }
        if (participant.result === 'draw' || participant.confirmed === 1) {
            return 'table-secondary'; // Grey for draws or confirmed participants
        }
        return ''; // Default for unconfirmed participants
    };

    return (
        <div className="container mt-4">
            {error && <div className="alert alert-danger">{error}</div>}

            {gamesWaitingConfirmation.length === 0 ? (
                <div className="alert alert-info text-center">
                    <i className="fas fa-info-circle me-2"></i>
                    No games waiting for confirmation.
                </div>
            ) : (
                <div className="row">
                    {gamesWaitingConfirmation.map((pod) => (
                        <div key={pod.id} className="col-md-6 mb-4">
                            <div className="card">
                                <div className="card-header" style={{ backgroundColor: '#6c757d', color: 'white' }}>
                                    <h5 className="mb-0">
                                        <i className="fas fa-clock me-2"></i>
                                        Pod #{pod.id} - Pending Confirmation
                                    </h5>
                                </div>
                                <div className="card-body">
                                    <div className="table-responsive">
                                        <table className="table table-bordered mb-0">
                                            <thead>
                                                <tr>
                                                    <th>Player</th>
                                                    <th>Result</th>
                                                    <th>Status</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {pod.participants?.map((participant) => (
                                                    <tr key={participant.player_id} className={getParticipantClass(participant)}>
                                                        <td>
                                                            <strong>{participant.firstname} {participant.lastname}</strong>
                                                            {participant.player_id === userId && (
                                                                <span className="badge ms-2" style={{ backgroundColor: '#495057', color: 'white' }}>You</span>
                                                            )}
                                                        </td>
                                                        <td>
                                                            {participant.result ? getResultBadge(participant.result) : '-'}
                                                        </td>
                                                        <td>
                                                            {getConfirmationBadge(participant.confirmed)}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                    {/* Show Confirm Button only for the logged-in user who hasn't confirmed */}
                                    {pod.participants.some(
                                        (participant) =>
                                            participant.player_id === userId &&
                                            participant.confirmed === 0
                                    ) && (
                                            <button
                                                className="btn btn-success mt-3 w-100"
                                                onClick={() => handleConfirm(pod.id, pod.league_id)}
                                            >
                                                <i className="fas fa-check-circle me-2"></i>
                                                Confirm Game Results
                                            </button>
                                        )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default ConfirmGamesTab;