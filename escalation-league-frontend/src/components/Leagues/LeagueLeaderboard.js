import React, { useEffect, useState } from 'react';
import { getLeagueStats, isUserInLeague } from '../../api/leaguesApi';
import { usePermissions } from '../context/PermissionsProvider';

const LeagueLeaderboard = () => {
    const { permissions, loading: loadingPermissions } = usePermissions(); // Use PermissionsProvider
    const [leagueId, setLeagueId] = useState(null);
    const [leaderboard, setLeaderboard] = useState([]);
    const [stats, setStats] = useState(null);
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(true);
    const [sortConfig, setSortConfig] = useState({ key: 'win_rate', direction: 'desc' });

    useEffect(() => {
        const fetchUserLeague = async () => {
            try {
                console.log('Fetching user league...');
                const { inLeague, league } = await isUserInLeague();
                console.log('User league response:', { inLeague, league });
                if (!inLeague) {
                    setError('You are not part of any league.');
                    return;
                }
                setLeagueId(league.league_id);
            } catch (err) {
                console.error('Error checking league membership:', err);
                setError('Failed to fetch league information.');
            } finally {
                setLoading(false);
            }
        };

        if (!loadingPermissions) {
            fetchUserLeague();
        }
    }, [loadingPermissions]);

    useEffect(() => {
        if (leagueId) {
            const fetchLeagueStats = async () => {
                try {
                    console.log('Fetching league stats for leagueId:', leagueId);
                    const { leaderboard, stats } = await getLeagueStats(leagueId);
                    console.log('League stats response:', { leaderboard, stats });

                    // Filter out players with no games played
                    const filteredLeaderboard = leaderboard.filter((player) => player.total_games > 0);

                    setLeaderboard(filteredLeaderboard);
                    setStats(stats);
                } catch (err) {
                    console.error('Error fetching league stats:', err);
                    setError('Failed to fetch league stats.');
                }
            };

            fetchLeagueStats();
        }
    }, [leagueId]);

    const sortLeaderboard = (key) => {
        let direction = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });

        const sortedLeaderboard = [...leaderboard].sort((a, b) => {
            const aValue = key === 'win_rate' ? parseFloat(a[key]) || 0 : a[key] || 0; // Convert win_rate to number, default to 0
            const bValue = key === 'win_rate' ? parseFloat(b[key]) || 0 : b[key] || 0; // Convert win_rate to number, default to 0

            if (direction === 'asc') {
                return aValue - bValue;
            } else {
                return bValue - aValue;
            }
        });

        setLeaderboard(sortedLeaderboard);
    };

    if (loadingPermissions || loading) {
        return <div className="text-center mt-5">Loading...</div>; // Centered loading indicator
    }

    if (error) {
        return <div className="alert alert-danger text-center">{error}</div>; // Bootstrap alert for errors
    }

    if (!leaderboard.length) {
        return <div className="alert alert-warning text-center">No leaderboard data available.</div>; // Bootstrap alert for no data
    }

    return (
        <div className="container mt-5">
            <h1 className="text-center mb-4">League Leaderboard</h1>
            {stats && (
                <div className="text-center mb-3">
                    <p className="lead">Total Players: {stats.total_players}</p>
                </div>
            )}
            <table className="table table-striped table-hover">
                <thead className="thead-dark">
                    <tr>
                        <th onClick={() => sortLeaderboard('email')} style={{ cursor: 'pointer' }}>Player Email</th>
                        <th onClick={() => sortLeaderboard('wins')} style={{ cursor: 'pointer' }}>Wins</th>
                        <th onClick={() => sortLeaderboard('losses')} style={{ cursor: 'pointer' }}>Losses</th>
                        <th onClick={() => sortLeaderboard('draws')} style={{ cursor: 'pointer' }}>Draws</th>
                        <th onClick={() => sortLeaderboard('total_games')} style={{ cursor: 'pointer' }}>Total Games</th>
                        <th onClick={() => sortLeaderboard('win_rate')} style={{ cursor: 'pointer' }}>Win Rate</th>
                    </tr>
                </thead>
                <tbody>
                    {leaderboard.map((player) => (
                        <tr key={player.player_id}>
                            <td>{player.email}</td>
                            <td>{player.wins}</td>
                            <td>{player.losses}</td>
                            <td>{player.draws}</td>
                            <td>{player.total_games}</td>
                            <td>{player.win_rate ? `${player.win_rate}%` : '0%'}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default LeagueLeaderboard;