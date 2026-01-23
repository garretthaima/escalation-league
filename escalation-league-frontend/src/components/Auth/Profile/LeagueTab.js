import React from 'react';

const LeagueTab = ({ currentLeague }) => {
    if (!currentLeague) {
        return <p>You are not currently participating in any league.</p>;
    }

    const status = currentLeague.is_active ? 'Active' : 'Inactive';

    return (
        <div>
            <h4>Current League</h4>
            <div className="mb-3">
                <strong>Name:</strong> {currentLeague.name}
            </div>
            <div className="mb-3">
                <strong>Start Date:</strong> {new Date(currentLeague.start_date).toLocaleDateString()}
            </div>
            <div className="mb-3">
                <strong>End Date:</strong> {new Date(currentLeague.end_date).toLocaleDateString()}
            </div>
            <div className="mb-3">
                <strong>Status:</strong> {status}
            </div>
            <div className="mb-3">
                <strong>Record:</strong> {currentLeague.league_wins}W - {currentLeague.league_losses}L - {currentLeague.league_draws}D
            </div>
            <div className="mb-3">
                <strong>Total Points:</strong> {currentLeague.total_points}
            </div>
            {currentLeague.elo_rating && (
                <div className="mb-3">
                    <strong>League ELO:</strong> {currentLeague.elo_rating}
                </div>
            )}
            {currentLeague.rank && (
                <div className="mb-3">
                    <strong>Rank:</strong> {currentLeague.rank}
                </div>
            )}
            {currentLeague.current_commander && (
                <div className="mb-3">
                    <strong>Commander:</strong> {currentLeague.current_commander}
                    {currentLeague.commander_partner && ` // ${currentLeague.commander_partner}`}
                </div>
            )}
            {currentLeague.decklistUrl && (
                <div className="mb-3">
                    <strong>Decklist:</strong> <a href={currentLeague.decklistUrl} target="_blank" rel="noopener noreferrer">View Deck</a>
                </div>
            )}
        </div>
    );
};

export default LeagueTab;