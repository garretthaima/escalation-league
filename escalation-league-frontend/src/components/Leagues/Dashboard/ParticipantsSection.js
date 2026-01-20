import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';

const ParticipantsSection = ({ participants, leagueId }) => {
    const [searchTerm, setSearchTerm] = useState('');

    if (!participants || participants.length === 0) {
        return <p className="text-muted">No participants in this league yet.</p>;
    }

    const filteredParticipants = participants.filter(p =>
        `${p.firstname} ${p.lastname}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.current_commander && p.current_commander.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    return (
        <div>
            {/* Search */}
            {participants.length > 10 && (
                <div className="mb-3">
                    <input
                        type="text"
                        className="form-control form-control-sm"
                        placeholder="Search by name or commander..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            )}

            {/* Participants Grid */}
            <div className="row g-2">
                {filteredParticipants.map((participant) => (
                    <div key={participant.user_id} className="col-md-6 col-lg-4">
                        <Link
                            to={`/leagues/${leagueId}/profile/${participant.user_id}`}
                            className="text-decoration-none"
                        >
                            <div className="d-flex align-items-center p-2 rounded hover-bg-dark">
                                {/* Avatar placeholder */}
                                <div
                                    className="rounded-circle bg-secondary d-flex align-items-center justify-content-center me-2"
                                    style={{ width: '36px', height: '36px', minWidth: '36px' }}
                                >
                                    <span className="text-white small">
                                        {participant.firstname?.[0]}{participant.lastname?.[0]}
                                    </span>
                                </div>

                                {/* Info */}
                                <div className="flex-grow-1 overflow-hidden">
                                    <div className="fw-medium text-truncate">
                                        {participant.firstname} {participant.lastname}
                                    </div>
                                    <small className="text-muted text-truncate d-block">
                                        {participant.current_commander || 'No commander'}
                                    </small>
                                </div>

                                {/* Stats */}
                                <div className="text-end ms-2">
                                    <span className="badge bg-primary">{participant.total_points || 0}</span>
                                    <div className="small text-muted">
                                        {participant.league_wins || 0}W-{participant.league_losses || 0}L
                                    </div>
                                </div>
                            </div>
                        </Link>
                    </div>
                ))}
            </div>

            {filteredParticipants.length === 0 && searchTerm && (
                <p className="text-muted text-center mt-3">
                    No participants match "{searchTerm}"
                </p>
            )}
        </div>
    );
};

ParticipantsSection.propTypes = {
    participants: PropTypes.arrayOf(PropTypes.shape({
        user_id: PropTypes.number.isRequired,
        firstname: PropTypes.string,
        lastname: PropTypes.string,
        current_commander: PropTypes.string,
        total_points: PropTypes.number,
        league_wins: PropTypes.number,
        league_losses: PropTypes.number
    })),
    leagueId: PropTypes.number
};

export default ParticipantsSection;
