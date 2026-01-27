import React from 'react';
import ReactDOM from 'react-dom';
import PropTypes from 'prop-types';

const ConfirmModal = ({ show, title, message, onConfirm, onCancel, confirmText = 'Confirm', cancelText = 'Cancel', type = 'danger' }) => {
    if (!show) return null;

    const getButtonClass = () => {
        switch (type) {
            case 'danger':
                return 'btn-danger';
            case 'warning':
                return 'btn-warning';
            case 'primary':
                return 'btn-primary';
            default:
                return 'btn-danger';
        }
    };

    // Handle backdrop click to close modal
    const handleBackdropClick = (e) => {
        if (e.target === e.currentTarget) {
            onCancel();
        }
    };

    // Use portal to render at document body level for proper z-index stacking
    return ReactDOM.createPortal(
        <>
            <div
                className="modal fade show"
                style={{ display: 'block' }}
                tabIndex="-1"
                onClick={handleBackdropClick}
            >
                <div className="modal-dialog">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h5 className="modal-title">{title}</h5>
                            <button
                                type="button"
                                className="btn-close"
                                onClick={onCancel}
                                aria-label="Close"
                            />
                        </div>
                        <div className="modal-body">
                            <p>{message}</p>
                        </div>
                        <div className="modal-footer d-flex gap-2">
                            <button
                                type="button"
                                className="btn btn-secondary flex-fill"
                                onClick={onCancel}
                            >
                                {cancelText}
                            </button>
                            <button
                                type="button"
                                className={`btn ${getButtonClass()} flex-fill`}
                                onClick={onConfirm}
                            >
                                {confirmText}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
            <div className="modal-backdrop fade show" onClick={onCancel}></div>
        </>,
        document.body
    );
};

ConfirmModal.propTypes = {
    show: PropTypes.bool.isRequired,
    title: PropTypes.string.isRequired,
    message: PropTypes.string.isRequired,
    onConfirm: PropTypes.func.isRequired,
    onCancel: PropTypes.func.isRequired,
    confirmText: PropTypes.string,
    cancelText: PropTypes.string,
    type: PropTypes.oneOf(['danger', 'warning', 'primary'])
};

export default ConfirmModal;
