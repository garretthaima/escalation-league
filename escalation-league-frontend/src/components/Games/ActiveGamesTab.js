import React, { useState, useEffect } from 'react';
import { getInProgressPods, getOpenPods, joinPod } from '../../api/podsApi';
import { usePermissions } from '../context/PermissionsProvider';
import { getUserProfile } from '../../api/usersApi';

const ActiveGamesTab = () => {
    const [openPods, setOpenPods] = useState([]);
    const [activePods, setActivePods] = useState([]);
    const [userId, setUserId] = useState(null);
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(true);

    const { permissions } = usePermissions();

    // Check permissions
    const canReadPods = permissions.some((perm) => perm.name === 'pod_read');
    const canCreatePods = permissions.some((perm) => perm.name === 'pod_create');
    const canUpdatePods = permissions.some((perm) => perm.name === 'pod_update');

    useEffect(() => {
        const fetchData = async () => {
            try {
                if (!canReadPods) {
                    setError('You do not have permission to view games.');
                    setLoading(false);
                    return;
                }

                const userProfile = await getUserProfile();
                setUserId(userProfile.user.id);

                const openPodsData = await getOpenPods();
                const inProgressPodsData = await getInProgressPods();

                setOpenPods(openPodsData);
                setActivePods(inProgressPodsData);
            } catch (err) {
                console.error('Error fetching pods:', err);
                setError('Failed to fetch pods.');
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [canReadPods]);

    const handleJoinPod = async (podId) => {
        try {
            await joinPod(podId);
            alert('Joined pod successfully!');
            const openPodsData = await getOpenPods();
            setOpenPods(openPodsData);
        } catch (err) {
            console.error('Error joining pod:', err.response?.data?.error || err.message);
            alert(err.response?.data?.error || 'Failed to join pod.');
        }
    };

    const handleOverridePod = async (podId) => {
        try {
            const response = await fetch(`/api/pods/${podId}/override`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${localStorage.getItem('token')}`,
                },
            });

            if (!response.ok) {
                throw new Error('Failed to override pod.');
            }

            alert('Pod successfully overridden to active!');
            const openPodsData = await getOpenPods();
            const inProgressPodsData = await getInProgressPods();
            setOpenPods(openPodsData);
            setActivePods(inProgressPodsData);
        } catch (err) {
            console.error('Error overriding pod:', err.message);
            alert(err.message || 'Failed to override pod.');
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
                                        {canUpdatePods && pod.participants.length >= 3 && (
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
                                                disabled={pod.participants.length >= 4}
                                            >
                                                {pod.participants.length >= 4 ? 'Pod Full' : 'Join Pod'}
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