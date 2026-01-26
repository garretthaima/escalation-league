import React from 'react';
import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import ConfirmationCard from '../Pods/Dashboard/ConfirmationCard';
import GameCard from '../Pods/Dashboard/GameCard';
import './ActionItemsSection.css';

/**
 * Displays pending action items requiring user attention:
 * - Games awaiting confirmation
 * - Active games the user is participating in
 */
const ActionItemsSection = ({
    pendingPods,
    activePods,
    userId,
    onConfirm,
    onDeclareResult
}) => {
    const hasPending = pendingPods && pendingPods.length > 0;
    const hasActive = activePods && activePods.length > 0;

    // Don't render if nothing needs attention
    if (!hasPending && !hasActive) {
        return null;
    }

    return (
        <div className="action-items-section mb-4">
            <div className="action-items-header mb-3">
                <h5 className="mb-0">
                    <i className="fas fa-exclamation-circle me-2 text-warning"></i>
                    Action Needed
                </h5>
                <Link to="/pods" className="btn btn-sm btn-outline-secondary">
                    <i className="fas fa-gamepad me-1"></i>
                    All Games
                </Link>
            </div>

            <div className="row g-3">
                {/* Pending Confirmations - show first as they're more urgent */}
                {hasPending && pendingPods.map(pod => (
                    <div key={`pending-${pod.id}`} className="col-12 col-md-6 col-lg-4">
                        <ConfirmationCard
                            pod={pod}
                            userId={userId}
                            onConfirm={onConfirm}
                        />
                    </div>
                ))}

                {/* Active Games */}
                {hasActive && activePods.map(pod => (
                    <div key={`active-${pod.id}`} className="col-12 col-md-6 col-lg-4">
                        <GameCard
                            pod={pod}
                            userId={userId}
                            onDeclareResult={onDeclareResult}
                            showActions={true}
                        />
                    </div>
                ))}
            </div>
        </div>
    );
};

ActionItemsSection.propTypes = {
    pendingPods: PropTypes.arrayOf(
        PropTypes.shape({
            id: PropTypes.number.isRequired,
            participants: PropTypes.array
        })
    ),
    activePods: PropTypes.arrayOf(
        PropTypes.shape({
            id: PropTypes.number.isRequired,
            participants: PropTypes.array
        })
    ),
    userId: PropTypes.number,
    onConfirm: PropTypes.func.isRequired,
    onDeclareResult: PropTypes.func.isRequired
};

ActionItemsSection.defaultProps = {
    pendingPods: [],
    activePods: []
};

export default ActionItemsSection;
