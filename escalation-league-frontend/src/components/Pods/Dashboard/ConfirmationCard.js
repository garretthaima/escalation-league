import React from 'react';
import PropTypes from 'prop-types';
import { getResultBadge, getConfirmationBadge } from '../../../utils/badgeHelpers';

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

    return (
        <div className="card h-100 border-warning">
            <div className="card-header bg-warning bg-opacity-25 d-flex justify-content-between align-items-center">
                <span>
                    <i className="fas fa-clock me-2"></i>
                    Pod #{pod.id}
                </span>
                <span className="badge bg-secondary">
                    {confirmedCount}/{totalCount} confirmed
                </span>
            </div>
            <div className="card-body">
                {/* Result Declaration */}
                <div className="alert alert-info py-2 mb-3">
                    <strong>
                        {declarer ? (
                            <>
                                {declarer.firstname} {declarer.lastname}
                                {' '}declared{' '}
                                {isDraw ? (
                                    <span className="badge bg-secondary">DRAW</span>
                                ) : isWin ? (
                                    <span className="badge bg-success">WINNER</span>
                                ) : (
                                    <span className="badge bg-secondary">{declarer.result}</span>
                                )}
                            </>
                        ) : (
                            'Result pending...'
                        )}
                    </strong>
                </div>

                {/* Participants List */}
                <div className="mb-3">
                    {participants.map((participant) => {
                        const isCurrentUser = String(participant.player_id) === String(userId);
                        const isConfirmed = participant.confirmed === 1;

                        return (
                            <div
                                key={participant.player_id}
                                className={`d-flex justify-content-between align-items-center py-2 px-2 rounded mb-1 ${isConfirmed ? 'bg-light' : ''
                                    }`}
                            >
                                <span>
                                    {participant.firstname} {participant.lastname}
                                    {isCurrentUser && (
                                        <span className="badge bg-info ms-2">You</span>
                                    )}
                                </span>
                                <div className="d-flex align-items-center gap-2">
                                    {participant.result && getResultBadge(participant.result)}
                                    {getConfirmationBadge(participant.confirmed)}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Confirm Button */}
                {needsConfirmation && (
                    <button
                        className="btn btn-success w-100"
                        onClick={() => onConfirm(pod.id)}
                    >
                        <i className="fas fa-check-circle me-2"></i>
                        Confirm Result
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
