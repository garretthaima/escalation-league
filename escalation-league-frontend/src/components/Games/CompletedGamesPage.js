import React, { useState, useEffect } from 'react';
import { getPods } from '../../api/podsApi';
import { getUserProfile } from '../../api/usersApi';

const CompletedGamesTab = () => {
    const [completedGames, setCompletedGames] = useState([]);
    const [userId, setUserId] = useState(null);
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchCompletedGames = async () => {
            try {
                const userProfile = await getUserProfile();
                setUserId(userProfile.user.id);

                const games = await getPods({ confirmation_status: 'complete' });

                // Filter to only show games the user participated in
                const userGames = games.filter(game =>
                    game.participants?.some(p => p.player_id === userProfile.user.id)
                );

                setCompletedGames(userGames);
            } catch (err) {
                console.error('Error fetching completed games:', err);
                setError('Failed to fetch completed games.');
            } finally {
                setLoading(false);
            }
        };

        fetchCompletedGames();
    }, []);

    if (loading) return <div className="text-center mt-4">Loading completed games...</div>;

    return (
        <div className="container mt-4">
            {error && <div className="alert alert-danger">{error}</div>}

            {completedGames.length === 0 ? (
                <div className="alert alert-info text-center">
                    <i className="fas fa-info-circle me-2"></i>
                    No completed games found.
                </div>
            ) : (
                <div className="row">
                    {completedGames.map((game) => {
                        // Find the user's result in this game
                        const userParticipant = game.participants.find(p => p.player_id === userId);
                        const userResult = userParticipant?.result || 'Unknown';

                        return (
                            <div key={game.id} className="col-md-6 mb-4">
                                <div className="card">
                                    <div className="card-body">
                                        <h5 className="card-title">
                                            Pod #{game.id}
                                            <span className="badge ms-2" style={{ backgroundColor: '#343a40', color: 'white' }}>Complete</span>
                                        </h5>
                                        <p><strong>League:</strong> {game.league_name || `League #${game.league_id}`}</p>
                                        <p><strong>Your Result:</strong> <span className={`badge ${userResult === 'win' ? 'bg-success' : userResult === 'loss' ? 'bg-danger' : 'bg-secondary'}`}>{userResult}</span></p>
                                        <p><strong>Completed:</strong> {new Date(game.created_at).toLocaleString()}</p>

                                        {/* Display win condition if available */}
                                        {game.win_condition ? (
                                            <div>
                                                <h6>Win Condition:</h6>
                                                <p><strong>Name:</strong> {game.win_condition.name}</p>
                                                <p><strong>Description:</strong> {game.win_condition.description}</p>
                                                <p><strong>Category:</strong> {game.win_condition.category}</p>
                                            </div>
                                        ) : (
                                            <p><strong>Win Condition:</strong> None</p>
                                        )}

                                        <h6>Participants:</h6>
                                        <ul>
                                            {game.participants.map((participant) => (
                                                <li key={participant.player_id}>
                                                    {participant.firstname} {participant.lastname} - {participant.result}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default CompletedGamesTab;