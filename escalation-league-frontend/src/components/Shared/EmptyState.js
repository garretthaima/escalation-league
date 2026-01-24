import React from 'react';
import PropTypes from 'prop-types';

/**
 * Reusable empty state component for when there's no data to display
 * Provides consistent styling across the app
 */
const EmptyState = ({
    icon,
    title,
    description,
    action,
    className = ''
}) => {
    return (
        <div className={`text-center py-5 ${className}`}>
            {icon && (
                <i
                    className={`${icon} fa-3x mb-3`}
                    style={{ color: 'var(--text-muted)' }}
                />
            )}
            {title && (
                <h5 className="text-muted mb-2">{title}</h5>
            )}
            {description && (
                <p className="text-muted mb-3">{description}</p>
            )}
            {action}
        </div>
    );
};

EmptyState.propTypes = {
    icon: PropTypes.string,
    title: PropTypes.string,
    description: PropTypes.string,
    action: PropTypes.node,
    className: PropTypes.string
};

export default EmptyState;
