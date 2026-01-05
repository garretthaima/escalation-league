import React, { useState, useEffect } from 'react';
import { getPods, logPodResult } from '../../api/podsApi'; // Use unified getPods
import { getUserProfile, updateUserStats } from '../../api/usersApi';
import { updateLeagueStats } from '../../api/userLeaguesApi';

const ConfirmGamesTab = () => {
    const [gamesWaitingConfirmation, setGamesWaitingConfirmation] = useState([]);
    const [userId, setUserId] = useState(null);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchGamesWaitingConfirmation = async () => {
            try {
                const userProfile = await getUserProfile();
                setUserId(userProfile.user.id);

                // Fetch pending pods using getPods with a filter
                const pods = await getPods({ confirmation_status: 'pending' });
                setGamesWaitingConfirmation(pods);
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

            alert('Game successfully confirmed!');

            // Refresh the list of games waiting confirmation
            const pods = await getPods({ confirmation_status: 'pending' });
            setGamesWaitingConfirmation(pods);
        } catch (err) {
            console.error('Error confirming game:', err.message);
            setError('Failed to confirm game.');
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
        <div>
            {error && <div className="alert alert-danger">{error}</div>}
            <div className="row">
                {gamesWaitingConfirmation.map((pod) => (
                    <div key={pod.id} className="col-md-6 mb-4">
                        <div className="card">
                            <div className="card-body">
                                <h5 className="card-title">Pod #{pod.id}</h5>
                                <div className="table-responsive">
                                    <table className="table table-bordered">
                                        <tbody>
                                            {Array.from({ length: 2 }).map((_, rowIndex) => (
                                                <tr key={rowIndex}>
                                                    {Array.from({ length: 2 }).map((_, colIndex) => {
                                                        const participantIndex = rowIndex * 2 + colIndex;
                                                        const participant = pod.participants?.[participantIndex];
                                                        return (
                                                            <td
                                                                key={colIndex}
                                                                className={
                                                                    participant
                                                                        ? getParticipantClass(participant)
                                                                        : ''
                                                                }
                                                            >
                                                                {participant
                                                                    ? `${participant.firstname} ${participant.lastname}`
                                                                    : 'Empty'}
                                                            </td>
                                                        );
                                                    })}
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
                                            className="btn btn-primary mt-3"
                                            onClick={() => handleConfirm(pod.id, pod.league_id)}
                                        >
                                            Confirm Game
                                        </button>
                                    )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default ConfirmGamesTab;