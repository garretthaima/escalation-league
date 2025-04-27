import React, { useEffect, useState } from 'react';
import { getActivePods, joinPod } from '../../api/podsApi';

const PodList = () => {
    const [pods, setPods] = useState([]);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchPods = async () => {
            try {
                const activePods = await getActivePods();
                setPods(activePods);
            } catch (err) {
                console.error('Error fetching pods:', err);
                setError('Failed to fetch pods.');
            }
        };

        fetchPods();
    }, []);

    const handleJoin = async (podId) => {
        try {
            await joinPod(podId);
            alert('Joined pod successfully!');
        } catch (err) {
            console.error('Error joining pod:', err);
            setError('Failed to join pod.');
        }
    };

    return (
        <div>
            <h2>Active Pods</h2>
            {error && <p style={{ color: 'red' }}>{error}</p>}
            <ul>
                {pods.map((pod) => (
                    <li key={pod.id}>
                        Pod #{pod.id} (League ID: {pod.league_id}) - Status: {pod.status}
                        <button onClick={() => handleJoin(pod.id)}>Join</button>
                    </li>
                ))}
            </ul>
        </div>
    );
};

export default PodList;