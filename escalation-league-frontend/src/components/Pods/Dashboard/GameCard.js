import React from 'react';
import PropTypes from 'prop-types';

/**
 * Reusable game card component for displaying pod information
 */
const GameCard = ({ pod, userId, onDeclareResult, showActions = true }) => {
    const participants = Array.isArray(pod.participants) ? pod.participants : [];
    const sortedParticipants = [...participants].sort((a, b) =>
        (a.turn_order || 999) - (b.turn_order || 999)
    );
    const hasTurnOrder = sortedParticipants.some(p => p.turn_order);
    const isParticipant = participants.some(p => String(p.player_id) === String(userId));

    return (
        <div className="card h-100">
            <div className="card-body d-flex flex-column">
                <div className="d-flex justify-content-between align-items-start mb-3">
                    <h6 className="card-title mb-0">Pod #{pod.id}</h6>
                    <span className="badge bg-primary">
                        {participants.length} players
                    </span>
                </div>

                <div className="flex-grow-1">
                    {hasTurnOrder ? (
                        <ol className="list-group list-group-numbered mb-0">
                            {sortedParticipants.map((participant, idx) => (
                                <li
                                    key={participant.player_id}
                                    className={`list-group-item py-2 d-flex justify-content-between align-items-center ${idx === 0 ? 'list-group-item-warning' : ''}`}
                                >
                                    <span>
                                        {participant.firstname} {participant.lastname}
                                        {String(participant.player_id) === String(userId) && (
                                            <span className="badge bg-info ms-2">You</span>
                                        )}
                                    </span>
                                    {idx === 0 && (
                                        <span className="badge bg-warning text-dark">
                                            <i className="fas fa-play-circle me-1"></i>
                                            First
                                        </span>
                                    )}
                                </li>
                            ))}
                        </ol>
                    ) : (
                        <ul className="list-group mb-0">
                            {participants.map((participant) => (
                                <li
                                    key={participant.player_id}
                                    className="list-group-item py-2"
                                >
                                    {participant.firstname} {participant.lastname}
                                    {String(participant.player_id) === String(userId) && (
                                        <span className="badge bg-info ms-2">You</span>
                                    )}
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                {showActions && isParticipant && onDeclareResult && (
                    <div className="mt-3 pt-3 border-top">
                        <button
                            className="btn btn-success w-100"
                            onClick={() => onDeclareResult(pod.id)}
                        >
                            <i className="fas fa-trophy me-2"></i>
                            Declare Result
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

GameCard.propTypes = {
    pod: PropTypes.shape({
        id: PropTypes.number.isRequired,
        participants: PropTypes.array
    }).isRequired,
    userId: PropTypes.number,
    onDeclareResult: PropTypes.func,
    showActions: PropTypes.bool
};

export default GameCard;
