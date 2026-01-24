import React from 'react';
import PropTypes from 'prop-types';
import '../../Shared/Shared.css';
import './ConfirmationCard.css';

/**
 * Card component for games pending confirmation
 * Shows who declared the result and confirmation status of each player
 */
const ConfirmationCard = ({ pod, userId, onConfirm }) => {
    const participants = Array.isArray(pod.participants) ? pod.participants : [];

    // Find the winner (they declared the win) or fall back to earliest confirmer for draws
    const winner = participants.find(p => p.result === 'win');
    const declarer = winner || participants
        .filter(p => p.confirmed === 1 && p.confirmation_time)
        .sort((a, b) => new Date(a.confirmation_time) - new Date(b.confirmation_time))[0];
    const isDraw = !winner && declarer?.result === 'draw';
    const isWin = !!winner;

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
                        <i className="fas fa-clock me-2 text-brand-gold"></i>
                        Pod #{pod.id}
                    </h6>
                    <span className="text-xs confirmation-card-counter">
                        {confirmedCount}/{totalCount}
                    </span>
                </div>

                {/* Compact declaration line */}
                <div className="text-sm confirmation-card-declaration">
                    {declarer ? (
                        <>
                            <span className="confirmation-card-declarer-text">
                                {declarer.firstname} declared
                            </span>
                            <span className={`text-xs confirmation-card-result-badge ${isWin ? 'confirmation-card-result-badge-win' : 'confirmation-card-result-badge-draw'}`}>
                                {isDraw ? 'DRAW' : 'WIN'}
                            </span>
                        </>
                    ) : (
                        <span className="confirmation-card-pending-text">Pending...</span>
                    )}
                </div>

                {/* 2x2 Grid */}
                <div className={`confirmation-card-grid${needsConfirmation ? ' confirmation-card-grid-with-button' : ''}`}>
                    {gridOrder.map((idx) => {
                        const participant = paddedParticipants[idx];
                        if (!participant) {
                            return (
                                <div
                                    key={`empty-${idx}`}
                                    className="text-xs confirmation-card-slot-empty"
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
                                className={`text-sm confirmation-card-slot${isCurrentUser ? ' confirmation-card-slot-current-user' : ''}`}
                            >
                                <span className={isCurrentUser ? 'confirmation-card-name-current-user' : 'confirmation-card-name'}>
                                    {hasWin && <i className="fas fa-trophy me-1 text-brand-gold confirmation-card-trophy"></i>}
                                    {participant.firstname}
                                </span>
                                <i
                                    className={`fas ${isConfirmed ? 'fa-check' : 'fa-clock'} confirmation-card-status-icon ${isConfirmed ? 'confirmation-card-status-confirmed' : 'confirmation-card-status-pending'}`}
                                ></i>
                            </div>
                        );
                    })}
                </div>

                {/* Confirm Button */}
                {needsConfirmation && (
                    <button
                        className="btn btn-success w-100 text-sm"
                        onClick={() => onConfirm(pod.id)}
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
