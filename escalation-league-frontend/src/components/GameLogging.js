import React, { useState } from 'react';
import { logGame } from '../api/api';

const GameLogging = () => {
    const [opponents, setOpponents] = useState('');
    const [result, setResult] = useState('');
    const [winCondition, setWinCondition] = useState('');
    const [message, setMessage] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        const opponentList = opponents.split(',').map((opponent) => opponent.trim());
        try {
            const response = await logGame({
                opponents: opponentList,
                result,
                winCondition,
                date: new Date().toISOString().split('T')[0], // Current date
            });
            setMessage(response.message || 'Game logged successfully!');
        } catch (error) {
            setMessage('Error logging game. Please try again.');
        }
    };

    return (
        <div className="container mt-4">
            <h2 className="mb-4">Log a Game</h2>
            <form onSubmit={handleSubmit} className="needs-validation">
                <div className="mb-3">
                    <label htmlFor="opponents" className="form-label">Opponents (comma-separated):</label>
                    <input
                        type="text"
                        id="opponents"
                        className="form-control"
                        placeholder="Enter opponents"
                        value={opponents}
                        onChange={(e) => setOpponents(e.target.value)}
                        required
                    />
                </div>
                <div className="mb-3">
                    <label htmlFor="result" className="form-label">Result:</label>
                    <select
                        id="result"
                        className="form-select"
                        value={result}
                        onChange={(e) => setResult(e.target.value)}
                        required
                    >
                        <option value="">Select Result</option>
                        <option value="win">Win</option>
                        <option value="loss">Loss</option>
                    </select>
                </div>
                <div className="mb-3">
                    <label htmlFor="winCondition" className="form-label">Win Condition:</label>
                    <select
                        id="winCondition"
                        className="form-select"
                        value={winCondition}
                        onChange={(e) => setWinCondition(e.target.value)}
                        required
                    >
                        <option value="">Select Win Condition</option>
                        <option value="checkmate">Checkmate</option>
                        <option value="timeout">Timeout</option>
                        <option value="resignation">Resignation</option>
                    </select>
                </div>
                <button type="submit" className="btn btn-primary">Log Game</button>
            </form>
            {message && <div className="alert alert-info mt-3">{message}</div>}
        </div>
    );
};

export default GameLogging;