import React, { useState } from 'react';
import { logPodResult } from '../../api/podsApi';

const LogPodResult = ({ podId }) => {
    const [result, setResult] = useState('');
    const [error, setError] = useState(null);

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await logPodResult(podId, { result });
            alert('Game result logged successfully!');
            setResult(''); // Reset form
        } catch (err) {
            console.error('Error logging pod result:', err);
            setError('Failed to log pod result.');
        }
    };

    return (
        <form onSubmit={handleSubmit}>
            <h2>Log Pod Result</h2>
            {error && <p style={{ color: 'red' }}>{error}</p>}
            <label>
                Winner (Player ID or "draw"):
                <input
                    type="text"
                    value={result}
                    onChange={(e) => setResult(e.target.value)}
                    required
                />
            </label>
            <button type="submit">Log Result</button>
        </form>
    );
};

export default LogPodResult;