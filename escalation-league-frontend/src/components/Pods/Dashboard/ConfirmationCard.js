import React from 'react';
import PropTypes from 'prop-types';

/**
 * Card component for games pending confirmation
 * Shows who declared the result and confirmation status of each player
 */
const ConfirmationCard = ({ pod, userId, onConfirm }) => {
    const participants = Array.isArray(pod.participants) ? pod.participants : [];

    // Find who declared the result (the one who has confirmed and has a result)
    const declarer = participants.find(p => p.confirmed === 1 && p.result);
    const isDraw = declarer?.result === 'draw';
    const isWin = declarer?.result === 'win';

    // Check if current user needs to confirm
    const userParticipant = participants.find(p => String(p.player_id) === String(userId));
    const needsConfirmation = userParticipant && userParticipant.confirmed === 0;

    // Count confirmations
    const confirmedCount = participants.filter(p => p.confirmed === 1).length;
    const totalCount = participants.length;

    // 2x2 grid layout for participants
    const sortedParticipants = [...participants].sort((a, b) =>
        (a.turn_order || 999) - (b.turn_order || 999)
    );
    const paddedParticipants = [...sortedParticipants];
    while (paddedParticipants.length < 4) {
        paddedParticipants.push(null);
    }
    const gridOrder = [0, 1, 3, 2]; // Clockwise

    return (
        <div className="card h-100">
            <div className="card-body py-3">
                {/* Header row with declaration */}
                <div className="d-flex justify-content-between align-items-center mb-2">
                    <h6 className="card-title mb-0">
                        <i className="fas fa-clock me-2" style={{ color: 'var(--brand-gold)' }}></i>
                        Pod #{pod.id}
                    </h6>
                    <span
                        style={{
                            fontSize: '0.7rem',
                            padding: '3px 8px',
                            borderRadius: '10px',
                            background: 'var(--bg-secondary)',
                            color: 'var(--text-secondary)'
                        }}
                    >
                        {confirmedCount}/{totalCount}
                    </span>
                </div>

                {/* Compact declaration line */}
                <div
                    style={{
                        padding: '6px 10px',
                        borderRadius: '6px',
                        background: 'var(--brand-purple)',
                        marginBottom: '10px',
                        fontSize: '0.8rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                    }}
                >
                    {declarer ? (
                        <>
                            <span style={{ color: '#fff' }}>
                                {declarer.firstname} declared
                            </span>
                            <span
                                style={{
                                    background: isWin ? 'var(--brand-gold)' : 'rgba(255,255,255,0.2)',
                                    color: isWin ? '#1a1a2e' : '#fff',
                                    padding: '1px 8px',
                                    borderRadius: '4px',
                                    fontSize: '0.7rem',
                                    fontWeight: 600
                                }}
                            >
                                {isDraw ? 'DRAW' : 'WIN'}
                            </span>
                        </>
                    ) : (
                        <span style={{ color: 'rgba(255,255,255,0.8)' }}>Pending...</span>
                    )}
                </div>

                {/* 2x2 Grid */}
                <div
                    style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: '6px',
                        marginBottom: needsConfirmation ? '10px' : 0
                    }}
                >
                    {gridOrder.map((idx) => {
                        const participant = paddedParticipants[idx];
                        if (!participant) {
                            return (
                                <div
                                    key={`empty-${idx}`}
                                    style={{
                                        padding: '6px 8px',
                                        borderRadius: '6px',
                                        background: 'var(--bg-secondary)',
                                        opacity: 0.3,
                                        textAlign: 'center',
                                        fontSize: '0.75rem'
                                    }}
                                >
                                    —
                                </div>
                            );
                        }

                        const isCurrentUser = String(participant.player_id) === String(userId);
                        const isConfirmed = participant.confirmed === 1;
                        const hasWin = participant.result === 'win';

                        return (
                            <div
                                key={participant.player_id}
                                style={{
                                    padding: '6px 8px',
                                    borderRadius: '6px',
                                    background: isCurrentUser ? 'rgba(74, 47, 112, 0.2)' : 'var(--bg-secondary)',
                                    border: isCurrentUser ? '2px solid var(--brand-purple)' : '2px solid transparent',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    fontSize: '0.8rem'
                                }}
                            >
                                <span style={{ fontWeight: isCurrentUser ? 600 : 400 }}>
                                    {hasWin && <i className="fas fa-trophy me-1" style={{ color: 'var(--brand-gold)', fontSize: '0.7rem' }}></i>}
                                    {participant.firstname}
                                </span>
                                <i
                                    className={`fas ${isConfirmed ? 'fa-check' : 'fa-clock'}`}
                                    style={{
                                        fontSize: '0.65rem',
                                        color: isConfirmed ? '#28a745' : 'var(--text-muted)'
                                    }}
                                ></i>
                            </div>
                        );
                    })}
                </div>

                {/* Confirm Button */}
                {needsConfirmation && (
                    <button
                        className="btn btn-success w-100"
                        onClick={() => onConfirm(pod.id)}
                        style={{ fontSize: '0.85rem' }}
                    >
                        <i className="fas fa-check-circle me-2"></i>
                        Confirm
                    </button>
                )}
            </div>
        </div>
    );
};

ConfirmationCard.propTypes = {
    pod: PropTypes.shape({
        id: PropTypes.number.isRequired,
        participants: PropTypes.array
    }).isRequired,
    userId: PropTypes.number,
    onConfirm: PropTypes.func.isRequired
};

export default ConfirmationCard;
