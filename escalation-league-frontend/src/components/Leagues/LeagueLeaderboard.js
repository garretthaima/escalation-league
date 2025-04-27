import React, { useEffect, useState } from 'react';
import { getActiveLeague, getLeagueLeaderboard } from '../../api/leaguesApi';

const LeagueLeaderboard = () => {
    const [leagueId, setLeagueId] = useState(null);
    const [leaderboard, setLeaderboard] = useState([]);
    const [error, setError] = useState(null);

    useEffect(() => {
        // Fetch the active league
        const fetchActiveLeague = async () => {
            try {
                const activeLeague = await getActiveLeague();
                setLeagueId(activeLeague.id); // Set the active league ID
            } catch (err) {
                console.error('Error fetching active league:', err);
                setError('Failed to fetch active league.');
            }
        };

        fetchActiveLeague();
    }, []);

    useEffect(() => {
        // Fetch the leaderboard when leagueId is available
        if (leagueId) {
            const fetchLeaderboard = async () => {
                try {
                    const leaderboardData = await getLeagueLeaderboard(leagueId);
                    setLeaderboard(leaderboardData);
                } catch (err) {
                    console.error('Error fetching leaderboard:', err);
                    setError('Failed to fetch leaderboard.');
                }
            };

            fetchLeaderboard();
        }
    }, [leagueId]);

    if (error) {
        return <div>{error}</div>;
    }

    if (!leagueId) {
        return <div>Loading active league...</div>;
    }

    return (
        <div>
            <h1>League Leaderboard</h1>
            <ul>
                {leaderboard.map((player) => (
                    <li key={player.player_id}>
                        {player.email}: {player.wins} wins, {player.losses} losses, {player.win_rate}% win rate
                    </li>
                ))}
            </ul>
        </div>
    );
};

export default LeagueLeaderboard;