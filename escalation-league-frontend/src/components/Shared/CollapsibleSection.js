import React, { useState } from 'react';
import PropTypes from 'prop-types';

const CollapsibleSection = ({
    title,
    icon,
    children,
    defaultOpen = true,
    badge = null,
    actions = null,
    id = null
}) => {
    const [isOpen, setIsOpen] = useState(defaultOpen);

    return (
        <div className="card mb-4" id={id}>
            <div
                className="card-header d-flex justify-content-between align-items-center"
                onClick={() => setIsOpen(!isOpen)}
                style={{ cursor: 'pointer' }}
            >
                <div className="d-flex align-items-center">
                    {icon && <i className={`${icon} me-2`}></i>}
                    <h5 className="mb-0">{title}</h5>
                    {badge != null && badge !== 0 && <span className="badge bg-secondary ms-2">{badge}</span>}
                </div>
                <div className="d-flex align-items-center">
                    {actions && (
                        <div className="me-3" onClick={(e) => e.stopPropagation()}>
                            {actions}
                        </div>
                    )}
                    <i className={`fas fa-chevron-${isOpen ? 'up' : 'down'} text-muted`}></i>
                </div>
            </div>
            {isOpen && (
                <div className="card-body">
                    {children}
                </div>
            )}
        </div>
    );
};

CollapsibleSection.propTypes = {
    title: PropTypes.string.isRequired,
    icon: PropTypes.string,
    children: PropTypes.node.isRequired,
    defaultOpen: PropTypes.bool,
    badge: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    actions: PropTypes.node,
    id: PropTypes.string
};

export default CollapsibleSection;
