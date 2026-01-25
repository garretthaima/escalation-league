import React from 'react';
import PropTypes from 'prop-types';

/**
 * Reusable modal wrapper component
 * Provides consistent Bootstrap modal structure across the app
 */
const Modal = ({
    show,
    onHide,
    title,
    size = 'lg',
    children,
    footer,
    className = '',
    headerIcon,
    closeOnBackdrop = true
}) => {
    if (!show) return null;

    const handleBackdropClick = (e) => {
        if (closeOnBackdrop && e.target === e.currentTarget) {
            onHide();
        }
    };

    return (
        <>
            <div
                className="modal fade show"
                style={{ display: 'block' }}
                tabIndex="-1"
                onClick={handleBackdropClick}
            >
                <div className={`modal-dialog modal-${size} ${className}`}>
                    <div className="modal-content">
                        <div className="modal-header">
                            <h5 className="modal-title">
                                {headerIcon && <i className={`${headerIcon} me-2`} />}
                                {title}
                            </h5>
                            <button
                                type="button"
                                className="btn-close"
                                onClick={onHide}
                                aria-label="Close"
                            />
                        </div>
                        <div className="modal-body">
                            {children}
                        </div>
                        {footer && (
                            <div className="modal-footer">
                                {footer}
                            </div>
                        )}
                    </div>
                </div>
            </div>
            <div className="modal-backdrop fade show" onClick={closeOnBackdrop ? onHide : undefined} />
        </>
    );
};

Modal.propTypes = {
    show: PropTypes.bool.isRequired,
    onHide: PropTypes.func.isRequired,
    title: PropTypes.node.isRequired,
    size: PropTypes.oneOf(['sm', 'md', 'lg', 'xl']),
    children: PropTypes.node,
    footer: PropTypes.node,
    className: PropTypes.string,
    headerIcon: PropTypes.string,
    closeOnBackdrop: PropTypes.bool
};

export default Modal;
