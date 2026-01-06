import React, { useState, useEffect } from 'react';
import { getPods, joinPod, createPod, overridePod, logPodResult } from '../../api/podsApi'; // Use unified getPods
import { isUserInLeague } from '../../api/userLeaguesApi';
import { usePermissions } from '../context/PermissionsProvider';
import { getUserProfile } from '../../api/usersApi';
import { useToast } from '../context/ToastContext';

const ActiveGamesTab = () => {
    const [openPods, setOpenPods] = useState([]);
    const [activePods, setActivePods] = useState([]);
    const [userId, setUserId] = useState(null);
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(true);

    const { permissions } = usePermissions();
    const { showToast } = useToast();

    // Check permissions
    const canReadPods = permissions.some((perm) => perm.name === 'pod_read');
    const canCreatePods = permissions.some((perm) => perm.name === 'pod_create');
    const canUpdatePods = permissions.some((perm) => perm.name === 'pod_update');

    useEffect(() => {
        const fetchPods = async () => {
            try {
                if (!canReadPods) {
                    setError('You do not have permission to view games.');
                    setLoading(false);
                    return;
                }

                const userProfile = await getUserProfile();
                setUserId(userProfile.user.id);

                // Fetch open and active pods using getPods with filters
                const [openPodsData, activePodsData] = await Promise.all([
                    getPods({ confirmation_status: 'open' }), // Open pods
                    getPods({ confirmation_status: 'active' }), // Active pods
                ]);

                // Only filter active pods - keep open pods visible to everyone so they can join
                const userActivePods = activePodsData.filter(pod =>
                    pod.participants?.some(p => p.player_id === userProfile.user.id)
                );

                setOpenPods(openPodsData || []);
                setActivePods(userActivePods || []);
            } catch (err) {
                console.error('Error fetching pods:', err);
                setError('Failed to fetch pods.');
            } finally {
                setLoading(false);
            }
        };

        fetchPods();
    }, [canReadPods]);

    const handleJoinPod = async (podId) => {
        try {
            await joinPod(podId);
            showToast('Joined pod successfully!', 'success');
            const openPodsData = await getPods({ confirmation_status: 'open' }); // Refresh open pods
            setOpenPods(openPodsData || []);
        } catch (err) {
            console.error('Error joining pod:', err.response?.data?.error || err.message);
            showToast(err.response?.data?.error || 'Failed to join pod.', 'error');
        }
    };

    const handleCreatePod = async () => {
        try {
            const response = await isUserInLeague();
            if (!response.inLeague || !response.league) {
                showToast('You are not part of any league.', 'warning');
                return;
            }

            const leagueId = response.league.league_id;
            await createPod({ leagueId });

            // Refresh open pods to get full pod data with participants
            const openPodsData = await getPods({ confirmation_status: 'open' });
            setOpenPods(openPodsData || []);

            showToast(`New pod created successfully in league: ${response.league.league_name}!`, 'success');
        } catch (err) {
            console.error('Error creating pod:', err.response?.data?.error || err.message);
            showToast(err.response?.data?.error || 'Failed to create pod.', 'error');
        }
    };

    const handleOverridePod = async (podId) => {
        try {
            await overridePod(podId);
            showToast('Pod successfully overridden to active!', 'success');
            const [openPodsData, activePodsData] = await Promise.all([
                getPods({ confirmation_status: 'open' }),
                getPods({ confirmation_status: 'active' }),
            ]);
            const userActivePods = activePodsData.filter(pod =>
                pod.participants?.some(p => p.player_id === userId)
            );
            setOpenPods(openPodsData || []);
            setActivePods(userActivePods || []);
        } catch (err) {
            console.error('Error overriding pod:', err.response?.data?.error || err.message);
            showToast(err.response?.data?.error || 'Failed to override pod.', 'error');
        }
    };
    const handleDeclareWinner = async (podId) => {
        try {
            await logPodResult(podId, { result: 'win' });
            showToast('Winner declared! Waiting for other players to confirm.', 'success');
            const activePodsData = await getPods({ confirmation_status: 'active' });
            const userActivePods = activePodsData.filter(pod =>
                pod.participants?.some(p => p.player_id === userId)
            );
            setActivePods(userActivePods || []);
        } catch (err) {
            console.error('Error declaring winner:', err.response?.data?.error || err.message);
            showToast(err.response?.data?.error || 'Failed to declare winner.', 'error');
        }
    };

    if (loading) {
        return <div className="text-center mt-4">Loading pods...</div>;
    }

    if (error) {
        return <div className="alert alert-danger">{error}</div>;
    }

    return (
        <div>
            {/* Open Pods Section */}
            <div className="mb-4">
                <h3>Open Games</h3>
                {canCreatePods && (
                    <button
                        className="btn btn-primary mb-3"
                        onClick={handleCreatePod}
                    >
                        Create New Game
                    </button>
                )}
                <div className="row">
                    {openPods.length > 0 ? (
                        openPods.map((pod) => (
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
                                                                    <td key={colIndex}>
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
                                        {canUpdatePods && pod.participants?.length >= 3 && (
                                            <button
                                                className="btn btn-warning mt-3"
                                                onClick={() => handleOverridePod(pod.id)}
                                            >
                                                Override to Active
                                            </button>
                                        )}
                                        {canCreatePods && (
                                            <button
                                                className="btn btn-secondary mt-3"
                                                onClick={() => handleJoinPod(pod.id)}
                                                disabled={
                                                    pod.participants?.some((p) => p.player_id === userId) || // Check if user is already in the pod
                                                    pod.participants.length >= 4 // Check if pod is full
                                                }
                                            >
                                                {pod.participants?.some((p) => p.player_id === userId)
                                                    ? 'Already Joined'
                                                    : pod.participants.length >= 4
                                                        ? 'Pod Full'
                                                        : 'Join Pod'}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))
                    ) : (
                        <p className="text-center">No open games available.</p>
                    )}
                </div>
            </div>

            {/* Active Pods Section */}
            <div>
                <h3>Active Games</h3>
                <div className="row">
                    {activePods.length > 0 ? (
                        activePods.map((pod) => (
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
                                                                    <td key={colIndex}>
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
                                        {/* Declare Winner Button */}
                                        {canUpdatePods && pod.participants.some((p) => p.player_id === userId) && (
                                            <button
                                                className="btn btn-success mt-3"
                                                onClick={() => handleDeclareWinner(pod.id)}
                                            >
                                                I Won!
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))
                    ) : (
                        <p className="text-center">No active games available.</p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ActiveGamesTab;