import React, { useState, useEffect } from 'react';
import { getPods } from '../../api/podsApi'; // Use unified getPods

const CompletedGamesTab = () => {
    const [completedGames, setCompletedGames] = useState([]);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchCompletedGames = async () => {
            try {
                // Fetch completed pods using getPods with a filter
                const games = await getPods({ confirmation_status: 'complete' });
                setCompletedGames(games);
            } catch (err) {
                console.error('Error fetching completed games:', err);
                setError('Failed to fetch completed games.');
            }
        };

        fetchCompletedGames();
    }, []);

    return (
        <div>
            {error && <div className="alert alert-danger">{error}</div>}
            <div className="row">
                {completedGames.map((game) => (
                    <div key={game.id} className="col-md-6 mb-4">
                        <div className="card">
                            <div className="card-body">
                                <h5 className="card-title">Pod #{game.id}</h5>
                                <p><strong>League:</strong> {game.league_id}</p>
                                <p><strong>Result:</strong> {game.result}</p>
                                <p><strong>Created At:</strong> {new Date(game.created_at).toLocaleString()}</p>

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
                ))}
            </div>
        </div>
    );
};

export default CompletedGamesTab;