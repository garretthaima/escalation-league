import React, { useState } from 'react';
import './TournamentPods.css';

const TournamentPods = ({ pods, currentUserId }) => {
    const [viewMode, setViewMode] = useState('card'); // 'card' or 'table'

    const getStatusBadge = (status) => {
        switch (status) {
            case 'complete':
                return <span className="badge bg-success">Complete</span>;
            case 'pending':
                return <span className="badge bg-warning text-dark">Pending</span>;
            case 'active':
                return <span className="badge bg-primary">Active</span>;
            default:
                return <span className="badge bg-secondary">{status}</span>;
        }
    };

    const getResultBadge = (result) => {
        if (!result) return null;
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

    if (!pods || pods.length === 0) {
        return (
            <div className="alert alert-info">
                <i className="fas fa-info-circle me-2"></i>
                No tournament pods have been published yet.
            </div>
        );
    }

    // Separate championship pod from qualifying pods
    const championshipPod = pods.find(p => p.is_championship_game);
    const qualifyingPods = pods.filter(p => !p.is_championship_game);

    return (
        <div>
            {/* View Toggle */}
            <div className="d-flex justify-content-between align-items-center mb-3">
                <div className="text-muted">
                    {pods.length} pod{pods.length !== 1 ? 's' : ''} total
                    {championshipPod && <span className="ms-2">• 1 Championship</span>}
                </div>
                <div className="btn-group btn-group-sm">
                    <button
                        className={`btn ${viewMode === 'card' ? 'btn-secondary' : 'btn-outline-secondary'}`}
                        onClick={() => setViewMode('card')}
                        title="Card View"
                    >
                        <i className="fas fa-th-large"></i>
                    </button>
                    <button
                        className={`btn ${viewMode === 'table' ? 'btn-secondary' : 'btn-outline-secondary'}`}
                        onClick={() => setViewMode('table')}
                        title="Table View"
                    >
                        <i className="fas fa-list"></i>
                    </button>
                </div>
            </div>

            {/* Championship Pod (if exists) */}
            {championshipPod && viewMode === 'card' && (
                <div className="mb-4">
                    <h6 className="text-warning mb-3">
                        <i className="fas fa-crown me-2"></i>
                        Championship Game
                    </h6>
                    <div className="row">
                        <div className="col-md-6">
                            <PodCard
                                pod={championshipPod}
                                currentUserId={currentUserId}
                                getStatusBadge={getStatusBadge}
                                getResultBadge={getResultBadge}
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* Qualifying Pods */}
            {qualifyingPods.length > 0 && (
                <>
                    {championshipPod && viewMode === 'card' && (
                        <h6 className="text-muted mb-3">
                            <i className="fas fa-users me-2"></i>
                            Qualifying Games ({qualifyingPods.length})
                        </h6>
                    )}

                    {viewMode === 'card' ? (
                        <div className="tournament-pods-grid">
                            {qualifyingPods.map(pod => (
                                <PodCard
                                    key={pod.id}
                                    pod={pod}
                                    currentUserId={currentUserId}
                                    getStatusBadge={getStatusBadge}
                                    getResultBadge={getResultBadge}
                                />
                            ))}
                        </div>
                    ) : (
                        <div className="table-responsive">
                            <table className="table table-sm table-hover tournament-pods-table">
                                <thead>
                                    <tr>
                                        <th>Pod</th>
                                        <th>Status</th>
                                        <th>Player 1</th>
                                        <th>Player 2</th>
                                        <th>Player 3</th>
                                        <th>Player 4</th>
                                        <th>Winner</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {championshipPod && (
                                        <PodTableRow
                                            pod={championshipPod}
                                            currentUserId={currentUserId}
                                            getStatusBadge={getStatusBadge}
                                        />
                                    )}
                                    {qualifyingPods.map(pod => (
                                        <PodTableRow
                                            key={pod.id}
                                            pod={pod}
                                            currentUserId={currentUserId}
                                            getStatusBadge={getStatusBadge}
                                        />
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

// Card view component for a single pod
const PodCard = ({ pod, currentUserId, getStatusBadge, getResultBadge }) => {
    const isUserInPod = pod.participants?.some(p => p.player_id === currentUserId);
    const winner = pod.participants?.find(p => p.result === 'win');
    const isDraw = pod.participants?.every(p => p.result === 'draw');

    return (
        <div className={`tournament-pod-card ${isUserInPod ? 'user-in-pod' : ''} ${pod.is_championship_game ? 'championship' : ''}`}>
            <div className="tournament-pod-header">
                <div>
                    {pod.is_championship_game ? (
                        <span className="fw-bold text-warning">
                            <i className="fas fa-crown me-1"></i>
                            Championship
                        </span>
                    ) : (
                        <span className="pod-number">Pod #{pod.id}</span>
                    )}
                </div>
                {getStatusBadge(pod.confirmation_status)}
            </div>
            <ul className="tournament-pod-players">
                {pod.participants?.map((participant, index) => {
                    const isCurrentUser = participant.player_id === currentUserId;
                    const isWinner = participant.result === 'win';

                    return (
                        <li
                            key={participant.player_id}
                            className={`tournament-pod-player ${isCurrentUser ? 'current-user' : ''} ${isWinner ? 'winner' : ''}`}
                        >
                            <span className="player-turn">{participant.turn_order || index + 1}</span>
                            <span className="player-name">
                                {participant.firstname} {participant.lastname}
                                {isCurrentUser && <span className="badge bg-primary ms-1">You</span>}
                            </span>
                            <span className="player-result">
                                {isWinner && <i className="fas fa-trophy text-warning me-1"></i>}
                                {getResultBadge(participant.result)}
                                {participant.confirmed === 1 && (
                                    <i className="fas fa-check-circle text-success ms-1" title="Confirmed"></i>
                                )}
                            </span>
                        </li>
                    );
                })}
            </ul>
            {pod.confirmation_status === 'complete' && (
                <div className="tournament-pod-footer">
                    {isDraw ? (
                        <span className="text-muted">
                            <i className="fas fa-handshake me-1"></i>
                            Draw
                        </span>
                    ) : winner ? (
                        <span className="text-success">
                            <i className="fas fa-trophy me-1"></i>
                            {winner.firstname} {winner.lastname}
                        </span>
                    ) : null}
                </div>
            )}
        </div>
    );
};

// Table row component for a single pod
const PodTableRow = ({ pod, currentUserId, getStatusBadge }) => {
    const isUserInPod = pod.participants?.some(p => p.player_id === currentUserId);
    const winner = pod.participants?.find(p => p.result === 'win');

    return (
        <tr className={`${isUserInPod ? 'table-primary' : ''} ${pod.is_championship_game ? 'table-warning' : ''}`}>
            <td>
                {pod.is_championship_game ? (
                    <span className="badge bg-warning text-dark">
                        <i className="fas fa-crown me-1"></i>
                        Championship
                    </span>
                ) : (
                    <strong>#{pod.id}</strong>
                )}
            </td>
            <td>{getStatusBadge(pod.confirmation_status)}</td>
            {pod.participants?.map(p => {
                const isCurrentUser = p.player_id === currentUserId;
                const isWinner = p.result === 'win';
                return (
                    <td key={p.player_id} className={isCurrentUser ? 'fw-bold' : ''}>
                        {p.firstname} {p.lastname}
                        {isCurrentUser && <span className="badge bg-primary ms-1">You</span>}
                        {isWinner && <i className="fas fa-trophy text-warning ms-1"></i>}
                    </td>
                );
            })}
            {/* Fill empty slots if less than 4 players */}
            {Array.from({ length: Math.max(0, 4 - (pod.participants?.length || 0)) }).map((_, i) => (
                <td key={`empty-${i}`} className="text-muted">-</td>
            ))}
            <td>
                {winner ? (
                    <span className="text-success">
                        {winner.firstname} {winner.lastname}
                    </span>
                ) : pod.confirmation_status === 'complete' ? (
                    <span className="text-muted">Draw</span>
                ) : (
                    <span className="text-muted">-</span>
                )}
            </td>
        </tr>
    );
};

export default TournamentPods;
