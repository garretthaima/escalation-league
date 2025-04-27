import React from 'react';

const LeagueTab = ({ currentLeague }) => {
    if (!currentLeague) {
        return <p>You are not currently participating in any league.</p>;
    }

    return (
        <div>
            <h4>Current League</h4>
            <div className="mb-3">
                <strong>Name:</strong> {currentLeague.name}
            </div>
            <div className="mb-3">
                <strong>Start Date:</strong> {new Date(currentLeague.startDate).toLocaleDateString()}
            </div>
            <div className="mb-3">
                <strong>End Date:</strong> {new Date(currentLeague.endDate).toLocaleDateString()}
            </div>
            <div className="mb-3">
                <strong>Status:</strong> {currentLeague.status}
            </div>
            <div className="mb-3">
                <strong>Rank:</strong> {currentLeague.rank} / {currentLeague.totalPlayers}
            </div>
        </div>
    );
};

export default LeagueTab;