import React, { useState } from 'react';

const TournamentPods = ({ pods, byRound, currentUserId }) => {
    const [selectedRound, setSelectedRound] = useState('all');

    // Get available rounds
    const rounds = Object.keys(byRound).sort((a, b) => {
        if (a === 'championship') return 1;
        if (b === 'championship') return -1;
        return parseInt(a.replace('round_', '')) - parseInt(b.replace('round_', ''));
    });

    // Filter pods based on selected round
    const filteredPods = selectedRound === 'all'
        ? pods
        : byRound[selectedRound] || [];

    const getStatusBadge = (status) => {
        switch (status) {
            case 'complete':
                return <span className="badge bg-success">Complete</span>;
            case 'pending':
                return <span className="badge bg-warning text-dark">Pending</span>;
            case 'active':
                return <span className="badge bg-info">Active</span>;
            default:
                return <span className="badge bg-secondary">{status}</span>;
        }
    };

    const getResultBadge = (result) => {
        if (!result) return <span className="text-muted">-</span>;
        switch (result) {
            case 'win':
                return <span className="badge bg-success">Win</span>;
            case 'loss':
                return <span className="badge bg-danger">Loss</span>;
            case 'draw':
                return <span className="badge bg-secondary">Draw</span>;
            case 'disqualified':
                return <span className="badge bg-dark">DQ</span>;
            default:
                return <span className="badge bg-secondary">{result}</span>;
        }
    };

    const getRoundLabel = (roundKey) => {
        if (roundKey === 'championship') return 'Championship';
        return `Round ${roundKey.replace('round_', '')}`;
    };

    if (!pods || pods.length === 0) {
        return (
            <div className="alert alert-info">
                <i className="fas fa-info-circle me-2"></i>
                No tournament pods have been generated yet.
            </div>
        );
    }

    return (
        <div>
            {/* Round Filter */}
            <div className="mb-4">
                <div className="btn-group" role="group">
                    <button
                        className={`btn ${selectedRound === 'all' ? 'btn-primary' : 'btn-outline-primary'}`}
                        onClick={() => setSelectedRound('all')}
                    >
                        All Pods
                    </button>
                    {rounds.map(round => (
                        <button
                            key={round}
                            className={`btn ${selectedRound === round ? 'btn-primary' : 'btn-outline-primary'}`}
                            onClick={() => setSelectedRound(round)}
                        >
                            {getRoundLabel(round)}
                            <span className="badge bg-light text-dark ms-1">
                                {byRound[round]?.length || 0}
                            </span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Pods Grid */}
            <div className="row g-3">
                {filteredPods.map((pod) => {
                    const isUserInPod = pod.participants?.some(p => p.player_id === currentUserId);
                    const winner = pod.participants?.find(p => p.result === 'win');
                    const isDraw = pod.participants?.every(p => p.result === 'draw');

                    return (
                        <div key={pod.id} className="col-md-6 col-lg-4">
                            <div className={`card h-100 ${isUserInPod ? 'border-primary' : ''} ${pod.is_championship_game ? 'border-warning border-2' : ''}`}>
                                <div className="card-header d-flex justify-content-between align-items-center">
                                    <div>
                                        {pod.is_championship_game ? (
                                            <span className="fw-bold text-warning">
                                                <i className="fas fa-crown me-1"></i>
                                                Championship
                                            </span>
                                        ) : (
                                            <span>
                                                <i className="fas fa-users me-1"></i>
                                                Pod #{pod.id}
                                            </span>
                                        )}
                                        {pod.tournament_round && !pod.is_championship_game && (
                                            <small className="text-muted ms-2">
                                                Round {pod.tournament_round}
                                            </small>
                                        )}
                                    </div>
                                    {getStatusBadge(pod.confirmation_status)}
                                </div>
                                <div className="card-body p-0">
                                    <ul className="list-group list-group-flush">
                                        {pod.participants?.map((participant, index) => {
                                            const isCurrentUser = participant.player_id === currentUserId;
                                            const isWinner = participant.result === 'win';

                                            return (
                                                <li
                                                    key={participant.player_id}
                                                    className={`list-group-item d-flex justify-content-between align-items-center ${isCurrentUser ? 'bg-light' : ''}`}
                                                >
                                                    <div>
                                                        <span className="badge bg-secondary me-2">
                                                            {participant.turn_order || index + 1}
                                                        </span>
                                                        <span className={isCurrentUser ? 'fw-bold' : ''}>
                                                            {participant.firstname} {participant.lastname}
                                                        </span>
                                                        {isCurrentUser && (
                                                            <span className="badge bg-primary ms-2">You</span>
                                                        )}
                                                        {isWinner && (
                                                            <i className="fas fa-trophy text-warning ms-2"></i>
                                                        )}
                                                    </div>
                                                    <div>
                                                        {getResultBadge(participant.result)}
                                                        {participant.confirmed === 1 && (
                                                            <i className="fas fa-check-circle text-success ms-1" title="Confirmed"></i>
                                                        )}
                                                    </div>
                                                </li>
                                            );
                                        })}
                                    </ul>
                                </div>
                                {pod.confirmation_status === 'complete' && (
                                    <div className="card-footer text-center">
                                        {isDraw ? (
                                            <span className="text-muted">
                                                <i className="fas fa-handshake me-1"></i>
                                                Draw
                                            </span>
                                        ) : winner ? (
                                            <span className="text-success">
                                                <i className="fas fa-trophy me-1"></i>
                                                Winner: {winner.firstname} {winner.lastname}
                                            </span>
                                        ) : (
                                            <span className="text-muted">No result</span>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {filteredPods.length === 0 && (
                <div className="alert alert-secondary text-center">
                    No pods found for the selected round.
                </div>
            )}
        </div>
    );
};

export default TournamentPods;
