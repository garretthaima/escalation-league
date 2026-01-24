import React, { useState, useEffect } from 'react';
import { createPod, getActivePods, joinPod, getPodDetails } from '../../api/podsApi';
import { useToast } from '../../context/ToastContext';

const PodsPage = () => {
    const [pods, setPods] = useState([]);
    const [selectedPod, setSelectedPod] = useState(null);
    const [newPodLeagueId, setNewPodLeagueId] = useState('');
    const [error, setError] = useState(null);
    const { showToast } = useToast();

    useEffect(() => {
        const fetchPods = async () => {
            try {
                const activePods = await getActivePods();
                setPods(activePods);
            } catch (err) {
                console.error('Error fetching active pods:', err);
                setError('Failed to fetch active pods.');
            }
        };

        fetchPods();
    }, []);

    const handleCreatePod = async () => {
        try {
            const pod = await createPod({ leagueId: newPodLeagueId });
            setPods([...pods, pod]);
            setNewPodLeagueId('');
        } catch (err) {
            console.error('Error creating pod:', err);
            setError('Failed to create pod.');
        }
    };

    const handleJoinPod = async (podId) => {
        try {
            await joinPod(podId);
            showToast('Joined pod successfully!', 'success');
        } catch (err) {
            console.error('Error joining pod:', err);
            showToast('Failed to join pod.', 'error');
        }
    };

    const handleViewPodDetails = async (podId) => {
        try {
            const podDetails = await getPodDetails(podId);
            setSelectedPod(podDetails);
        } catch (err) {
            console.error('Error fetching pod details:', err);
            setError('Failed to fetch pod details.');
        }
    };

    return (
        <div>
            <h1>Pods Management</h1>
            {error && <p style={{ color: 'red' }}>{error}</p>}

            <div>
                <h2>Create a Pod</h2>
                <input
                    type="text"
                    placeholder="League ID"
                    value={newPodLeagueId}
                    onChange={(e) => setNewPodLeagueId(e.target.value)}
                />
                <button onClick={handleCreatePod}>Create Pod</button>
            </div>

            <div>
                <h2>Active Pods</h2>
                <ul>
                    {pods.map((pod) => (
                        <li key={pod.id}>
                            Pod #{pod.id} (League ID: {pod.league_id}) - Status: {pod.status}
                            <button onClick={() => handleJoinPod(pod.id)}>Join</button>
                            <button onClick={() => handleViewPodDetails(pod.id)}>View Details</button>
                        </li>
                    ))}
                </ul>
            </div>

            {selectedPod && (
                <div>
                    <h2>Pod Details</h2>
                    <p>Pod ID: {selectedPod.id}</p>
                    <p>League ID: {selectedPod.league_id}</p>
                    <p>Status: {selectedPod.status}</p>
                    <h3>Participants</h3>
                    <ul>
                        {selectedPod.participants.map((participant) => (
                            <li key={participant.player_id}>{participant.username}</li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
};

export default PodsPage;