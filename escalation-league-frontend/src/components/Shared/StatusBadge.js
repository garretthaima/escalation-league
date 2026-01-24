import React from 'react';
import PropTypes from 'prop-types';

/**
 * Status badge variants mapping
 */
const STATUS_VARIANTS = {
    // Pod/Game statuses
    open: 'success',
    active: 'warning',
    pending: 'info',
    complete: 'secondary',
    completed: 'secondary',

    // Player results
    win: 'success',
    loss: 'danger',
    draw: 'warning',
    disqualified: 'danger',

    // Generic statuses
    success: 'success',
    error: 'danger',
    warning: 'warning',
    info: 'info',
    default: 'secondary'
};

/**
 * Reusable status badge component
 * Automatically applies appropriate Bootstrap variant based on status
 */
const StatusBadge = ({
    status,
    variant,
    className = '',
    children,
    style
}) => {
    const statusLower = status?.toLowerCase() || '';
    const badgeVariant = variant || STATUS_VARIANTS[statusLower] || STATUS_VARIANTS.default;
    const displayText = children || status;

    return (
        <span
            className={`badge bg-${badgeVariant} ${className}`}
            style={style}
        >
            {displayText}
        </span>
    );
};

StatusBadge.propTypes = {
    status: PropTypes.string,
    variant: PropTypes.oneOf(['primary', 'secondary', 'success', 'danger', 'warning', 'info', 'light', 'dark']),
    className: PropTypes.string,
    children: PropTypes.node,
    style: PropTypes.object
};

export default StatusBadge;
