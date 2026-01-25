import React from 'react';
import PropTypes from 'prop-types';
import './GameCard.css';

/**
 * Commander pod-style game card - 2x2 grid layout like a real table
 */
const GameCard = ({ pod, userId, onDeclareResult, showActions = true }) => {
    const participants = Array.isArray(pod.participants) ? pod.participants : [];
    const sortedParticipants = [...participants].sort((a, b) =>
        (a.turn_order || 999) - (b.turn_order || 999)
    );
    const isParticipant = participants.some(p => String(p.player_id) === String(userId));

    // Pad to 4 players for consistent grid
    const paddedParticipants = [...sortedParticipants];
    while (paddedParticipants.length < 4) {
        paddedParticipants.push(null);
    }

    // Arrange in pod seating clockwise: [0]=top-left, [1]=top-right, [3]=bottom-left, [2]=bottom-right
    // So turn order goes: 1 → 2 → 3 → 4 clockwise around the table
    const gridOrder = [0, 1, 3, 2];

    return (
        <div className="card h-100">
            <div className="card-body py-3">
                {/* Header row */}
                <div className="d-flex justify-content-between align-items-center mb-3">
                    <h6 className="card-title mb-0">Pod #{pod.id}</h6>
                    {showActions && isParticipant && onDeclareResult && (
                        <button
                            className="btn btn-sm btn-declare"
                            onClick={() => onDeclareResult(pod.id)}
                        >
                            <i className="fas fa-trophy me-1"></i>
                            Declare
                        </button>
                    )}
                </div>

                {/* 2x2 Pod Grid */}
                <div className="pod-grid">
                    {gridOrder.map((idx) => {
                        const participant = paddedParticipants[idx];
                        if (!participant) {
                            return (
                                <div
                                    key={`empty-${idx}`}
                                    className="pod-slot-empty"
                                >
                                    —
                                </div>
                            );
                        }

                        const isYou = String(participant.player_id) === String(userId);
                        const isFirst = idx === 0 && participant.turn_order;

                        const slotClasses = [
                            'pod-slot',
                            isYou ? 'pod-slot-current-user' : ''
                        ].filter(Boolean).join(' ');

                        const nameClasses = [
                            'pod-participant-name',
                            (isYou || isFirst) ? 'pod-participant-name-highlighted' : '',
                            isFirst ? 'pod-participant-name-first' : ''
                        ].filter(Boolean).join(' ');

                        const badgeClasses = [
                            'pod-turn-badge',
                            isFirst ? 'pod-turn-badge-first' : 'pod-turn-badge-default'
                        ].join(' ');

                        return (
                            <div
                                key={participant.player_id}
                                className={slotClasses}
                                title={`${participant.firstname} ${participant.lastname}`}
                            >
                                <div className={nameClasses}>
                                    {participant.turn_order && (
                                        <span className={badgeClasses}>
                                            {idx + 1}
                                        </span>
                                    )}
                                    {participant.firstname}
                                </div>
                            </div>
                        );
                    })}
                </div>
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
