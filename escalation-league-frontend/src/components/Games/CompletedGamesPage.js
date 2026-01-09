import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getPods } from '../../api/podsApi';
import { getUserProfile } from '../../api/usersApi';

const CompletedGamesTab = () => {
    const [completedGames, setCompletedGames] = useState([]);
    const [filteredGames, setFilteredGames] = useState([]);
    const [userId, setUserId] = useState(null);
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState('cards'); // 'cards' or 'table'

    // Filter states
    const [playerFilter, setPlayerFilter] = useState('');
    const [dateFilter, setDateFilter] = useState('');
    const [showMyGamesOnly, setShowMyGamesOnly] = useState(true);
    const [winConditionFilter, setWinConditionFilter] = useState('');

    useEffect(() => {
        const fetchCompletedGames = async () => {
            try {
                const userProfile = await getUserProfile();
                setUserId(userProfile.user.id);

                const games = await getPods({ confirmation_status: 'complete' });
                setCompletedGames(games);
                setFilteredGames(games.filter(game =>
                    game.participants?.some(p => p.player_id === userProfile.user.id)
                ));
            } catch (err) {
                console.error('Error fetching completed games:', err);
                setError('Failed to fetch completed games.');
            } finally {
                setLoading(false);
            }
        };

        fetchCompletedGames();
    }, []);

    // Apply filters whenever filter states change
    useEffect(() => {
        if (!userId) return;

        let filtered = Array.isArray(completedGames) ? [...completedGames] : [];

        // Filter by user participation
        if (showMyGamesOnly) {
            filtered = filtered.filter(game =>
                Array.isArray(game.participants) && game.participants.some(p => p.player_id === userId)
            );
        }

        // Filter by player name
        if (playerFilter.trim()) {
            filtered = filtered.filter(game =>
                Array.isArray(game.participants) && game.participants.some(p =>
                    `${p.firstname} ${p.lastname}`.toLowerCase().includes(playerFilter.toLowerCase())
                )
            );
        }

        // Filter by date
        if (dateFilter) {
            const filterDate = new Date(dateFilter).toDateString();
            filtered = filtered.filter(game =>
                new Date(game.created_at).toDateString() === filterDate
            );
        }

        // Filter by win condition
        if (winConditionFilter.trim()) {
            filtered = filtered.filter(game =>
                game.win_condition?.name?.toLowerCase().includes(winConditionFilter.toLowerCase())
            );
        }

        setFilteredGames(filtered);
    }, [completedGames, userId, showMyGamesOnly, playerFilter, dateFilter, winConditionFilter]);

    if (loading) return <div className="text-center mt-4">Loading completed games...</div>;

    const renderCardView = () => (
        <div className="row">
            {filteredGames.map((game) => {
                return (
                    <div key={game.id} className="col-md-6 mb-4">
                        <div className="card">
                            <div className="card-body">
                                <h5 className="card-title">
                                    Pod #{game.id}
                                    <span className="badge ms-2" style={{ backgroundColor: '#2d1b4e', color: 'white' }}>Complete</span>
                                </h5>
                                <p><strong>League:</strong> {game.league_name || `League #${game.league_id}`}</p>
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
                                <ul className="list-unstyled">
                                    {game.participants.map((participant) => (
                                        <li
                                            key={participant.player_id}
                                            className="mb-2"
                                        >
                                            {participant.result === 'win' && <i className="fas fa-trophy me-2 text-warning"></i>}
                                            <Link
                                                to={`/leagues/${game.league_id}/profile/${participant.player_id}`}
                                                className={`${participant.result === 'win' ? 'fw-bold text-success' : 'text-primary'}`}
                                                style={{ textDecoration: 'underline' }}
                                            >
                                                {participant.firstname} {participant.lastname}
                                                <i className="fas fa-chevron-right ms-2" style={{ fontSize: '0.8em' }}></i>
                                            </Link>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );

    const renderTableView = () => (
        <div className="table-responsive">
            <table className="table table-striped table-hover">
                <thead>
                    <tr>
                        <th>Pod #</th>
                        <th>Date</th>
                        <th>Your Result</th>
                        <th>Win Condition</th>
                        <th>Participants</th>
                    </tr>
                </thead>
                <tbody>
                    {filteredGames.map((game) => {
                        const userParticipant = game.participants.find(p => p.player_id === userId);
                        const userResult = userParticipant?.result || 'Not Played';
                        const isUserInGame = !!userParticipant;

                        return (
                            <tr key={game.id}>
                                <td>#{game.id}</td>
                                <td>{new Date(game.created_at).toLocaleDateString()}</td>
                                <td>
                                    {isUserInGame ? (
                                        <span className={`badge ${userResult === 'win' ? 'bg-success' : userResult === 'loss' ? 'bg-danger' : 'bg-secondary'}`}>
                                            {userResult}
                                        </span>
                                    ) : (
                                        <span className="badge bg-secondary text-muted">
                                            <i className="fas fa-eye me-1"></i>Spectator
                                        </span>
                                    )}
                                </td>
                                <td>{game.win_condition?.name || 'None'}</td>
                                <td>
                                    {game.participants.map((p, idx) => (
                                        <span key={p.player_id}>
                                            {p.firstname} {p.lastname}
                                            {idx < game.participants.length - 1 ? ', ' : ''}
                                        </span>
                                    ))}
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );

    return (
        <div className="container mt-4">
            <div className="d-flex justify-content-between align-items-center mb-3">
                <h3>Completed Games</h3>
                <div className="btn-group" role="group">
                    <button
                        type="button"
                        className={`btn ${viewMode === 'cards' ? 'btn-primary' : 'btn-outline-primary'}`}
                        onClick={() => setViewMode('cards')}
                    >
                        <i className="fas fa-th-large me-1"></i>
                        Cards
                    </button>
                    <button
                        type="button"
                        className={`btn ${viewMode === 'table' ? 'btn-primary' : 'btn-outline-primary'}`}
                        onClick={() => setViewMode('table')}
                    >
                        <i className="fas fa-table me-1"></i>
                        Table
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div className="card mb-4">
                <div className="card-body">
                    <div className="row g-3">
                        <div className="col-md-3">
                            <label className="form-label">Player Name</label>
                            <input
                                type="text"
                                className="form-control"
                                placeholder="Search by player..."
                                value={playerFilter}
                                onChange={(e) => setPlayerFilter(e.target.value)}
                            />
                        </div>
                        <div className="col-md-3">
                            <label className="form-label">Date</label>
                            <input
                                type="date"
                                className="form-control"
                                value={dateFilter}
                                onChange={(e) => setDateFilter(e.target.value)}
                            />
                        </div>
                        <div className="col-md-3">
                            <label className="form-label">Win Condition</label>
                            <input
                                type="text"
                                className="form-control"
                                placeholder="Search win condition..."
                                value={winConditionFilter}
                                onChange={(e) => setWinConditionFilter(e.target.value)}
                            />
                        </div>
                        <div className="col-md-3">
                            <label className="form-label d-block">Options</label>
                            <div className="form-check">
                                <input
                                    className="form-check-input"
                                    type="checkbox"
                                    id="myGamesOnly"
                                    checked={showMyGamesOnly}
                                    onChange={(e) => setShowMyGamesOnly(e.target.checked)}
                                />
                                <label className="form-check-label" htmlFor="myGamesOnly">
                                    My games only
                                </label>
                            </div>
                        </div>
                    </div>
                    {(playerFilter || dateFilter || winConditionFilter || !showMyGamesOnly) && (
                        <div className="mt-3">
                            <button
                                className="btn btn-sm btn-secondary"
                                onClick={() => {
                                    setPlayerFilter('');
                                    setDateFilter('');
                                    setWinConditionFilter('');
                                    setShowMyGamesOnly(true);
                                }}
                            >
                                <i className="fas fa-times me-1"></i>
                                Clear Filters
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {error && <div className="alert alert-danger">{error}</div>}

            {filteredGames.length === 0 ? (
                <div className="alert alert-info text-center">
                    <i className="fas fa-info-circle me-2"></i>
                    No completed games found matching your filters.
                </div>
            ) : (
                <>
                    <div className="mb-3 text-muted">
                        Showing {filteredGames.length} of {completedGames.length} games
                    </div>
                    {viewMode === 'cards' ? renderCardView() : renderTableView()}
                </>
            )}
        </div>
    );
};

export default CompletedGamesTab;