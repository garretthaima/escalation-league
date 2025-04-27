import React, { useState } from 'react';
import { createPod } from '../../api/podsApi';

const CreatePod = ({ onPodCreated }) => {
    const [leagueId, setLeagueId] = useState('');
    const [error, setError] = useState(null);

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const pod = await createPod({ leagueId });
            onPodCreated(pod); // Notify parent component
            setLeagueId(''); // Reset form
        } catch (err) {
            console.error('Error creating pod:', err);
            setError('Failed to create pod.');
        }
    };

    return (
        <form onSubmit={handleSubmit}>
            <h2>Create a Pod</h2>
            {error && <p style={{ color: 'red' }}>{error}</p>}
            <label>
                League ID:
                <input
                    type="text"
                    value={leagueId}
                    onChange={(e) => setLeagueId(e.target.value)}
                    required
                />
            </label>
            <button type="submit">Create Pod</button>
        </form>
    );
};

export default CreatePod;