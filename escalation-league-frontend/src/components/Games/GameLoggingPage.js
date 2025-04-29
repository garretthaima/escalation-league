import React, { useState, useEffect } from 'react';
import { logPodResult } from '../../api/podsApi';
import { getGameHistory } from '../../api/gamesApi';

const GameLoggingPage = () => {
    const [gameHistory, setGameHistory] = useState([]);
    const [selectedPodId, setSelectedPodId] = useState('');
    const [result, setResult] = useState('');
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchGameHistory = async () => {
            try {
                const history = await getGameHistory();
                setGameHistory(history);
            } catch (err) {
                console.error('Error fetching game history:', err);
                setError('Failed to fetch game history.');
            }
        };

        fetchGameHistory();
    }, []);

    const handleLogResult = async () => {
        try {
            await logPodResult(selectedPodId, { result });
            alert('Game result logged successfully!');
            setSelectedPodId('');
            setResult('');
        } catch (err) {
            console.error('Error logging game result:', err);
            setError('Failed to log game result.');
        }
    };

    return (
        <div>
            <h1>Game Logging</h1>
            {error && <p style={{ color: 'red' }}>{error}</p>}

            <div>
                <h2>Log Game Result</h2>
                <input
                    type="text"
                    placeholder="Pod ID"
                    value={selectedPodId}
                    onChange={(e) => setSelectedPodId(e.target.value)}
                />
                <input
                    type="text"
                    placeholder="Result (Winner ID or 'draw')"
                    value={result}
                    onChange={(e) => setResult(e.target.value)}
                />
                <button onClick={handleLogResult}>Log Result</button>
            </div>

            <div>
                <h2>Game History</h2>
                <ul>
                    {gameHistory.map((game) => (
                        <li key={game.game_id}>
                            Game #{game.game_id} - Result: {game.result} - Date: {game.created_at}
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
};

export default GameLoggingPage;