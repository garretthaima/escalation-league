import React from 'react';
import PropTypes from 'prop-types';

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
                            className="btn btn-sm"
                            onClick={() => onDeclareResult(pod.id)}
                            style={{
                                background: 'var(--brand-gold)',
                                border: 'none',
                                color: '#1a1a2e',
                                fontWeight: 600
                            }}
                        >
                            <i className="fas fa-trophy me-1"></i>
                            Declare
                        </button>
                    )}
                </div>

                {/* 2x2 Pod Grid */}
                <div
                    style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: '8px'
                    }}
                >
                    {gridOrder.map((idx) => {
                        const participant = paddedParticipants[idx];
                        if (!participant) {
                            return (
                                <div
                                    key={`empty-${idx}`}
                                    style={{
                                        padding: '8px 12px',
                                        borderRadius: '8px',
                                        background: 'var(--bg-secondary)',
                                        opacity: 0.3,
                                        textAlign: 'center',
                                        fontSize: '0.8rem',
                                        color: 'var(--text-muted)'
                                    }}
                                >
                                    —
                                </div>
                            );
                        }

                        const isYou = String(participant.player_id) === String(userId);
                        const isFirst = idx === 0 && participant.turn_order;

                        return (
                            <div
                                key={participant.player_id}
                                style={{
                                    padding: '8px 12px',
                                    borderRadius: '8px',
                                    background: isYou ? 'rgba(74, 47, 112, 0.2)' : 'var(--bg-secondary)',
                                    border: isYou ? '2px solid var(--brand-purple)' : '2px solid transparent',
                                    textAlign: 'center'
                                }}
                                title={`${participant.firstname} ${participant.lastname}`}
                            >
                                <div
                                    style={{
                                        fontWeight: isYou || isFirst ? '600' : '500',
                                        fontSize: '0.85rem',
                                        color: isFirst ? 'var(--brand-gold)' : 'inherit'
                                    }}
                                >
                                    {participant.turn_order && (
                                        <span
                                            style={{
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                width: '18px',
                                                height: '18px',
                                                borderRadius: '50%',
                                                background: isFirst ? 'var(--brand-gold)' : 'var(--brand-purple)',
                                                color: '#fff',
                                                fontSize: '0.7rem',
                                                marginRight: '6px'
                                            }}
                                        >
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
