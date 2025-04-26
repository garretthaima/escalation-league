import React, { useEffect, useState } from 'react';
import { getLeaderboard } from '../api/api';

const Leaderboard = () => {
    const [leaderboard, setLeaderboard] = useState([]);

    useEffect(() => {
        const fetchLeaderboard = async () => {
            const data = await getLeaderboard();
            console.log('Fetched leaderboard data:', data); // Debug log
            const transformedData = data.map(player => ({
                username: player.username,
                wins: player.wins || 0,
                losses: player.losses || 0,
                win_rate: player.win_rate || 0,
            }));
            setLeaderboard(transformedData);
        };
        fetchLeaderboard();
    }, []);

    return (
        <div className="container mt-4">
            <h1 className="mb-4">Leaderboard</h1>
            {leaderboard.length === 0 ? (
                <p className="text-muted">No leaderboard data available.</p>
            ) : (
                <table className="table table-striped">
                    <thead className="table-dark">
                        <tr>
                            <th>Player</th>
                            <th>Wins</th>
                            <th>Losses</th>
                            <th>Win Rate</th>
                        </tr>
                    </thead>
                    <tbody>
                        {leaderboard.map((player) => (
                            <tr key={player.username}>
                                <td>{player.username}</td>
                                <td>{player.wins}</td>
                                <td>{player.losses}</td>
                                <td>{player.win_rate}%</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </div>
    );
};

export default Leaderboard;