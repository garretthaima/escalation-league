import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { getLeagueDetails, getLeagueLeaderboard } from '../api/api';

const LeagueDetails = () => {
    const { leagueId } = useParams();
    const [league, setLeague] = useState(null);
    const [leaderboard, setLeaderboard] = useState([]);
    const [winner, setWinner] = useState(null);

    useEffect(() => {
        const fetchLeagueDetails = async () => {
            try {
                const data = await getLeagueDetails(leagueId);
                setLeague(data);
                setWinner(data.winner); // Assuming the backend provides the winner
            } catch (error) {
                console.error('Error fetching league details:', error);
            }
        };

        const fetchLeaderboard = async () => {
            try {
                const data = await getLeagueLeaderboard(leagueId);
                setLeaderboard(data);
            } catch (error) {
                console.error('Error fetching leaderboard:', error);
            }
        };

        fetchLeagueDetails();
        fetchLeaderboard();
    }, [leagueId]);

    return (
        <div className="container mt-4">
            {league ? (
                <div className="mb-4">
                    <h1 className="mb-3">{league.name}</h1>
                    <p><strong>Start Date:</strong> {league.start_date}</p>
                    <p><strong>End Date:</strong> {league.end_date}</p>
                    <p><strong>Winner:</strong> {winner || 'TBD'}</p>
                </div>
            ) : (
                <p className="text-muted">Loading league details...</p>
            )}

            <h2 className="mb-4">Final Leaderboard</h2>
            {leaderboard.length > 0 ? (
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
            ) : (
                <p className="text-muted">No leaderboard data available.</p>
            )}
        </div>
    );
};

export default LeagueDetails;