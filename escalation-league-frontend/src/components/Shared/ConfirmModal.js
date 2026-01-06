import React from 'react';
import './ConfirmModal.css';

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

    return (
        <>
            <div className="confirm-modal-backdrop" onClick={onCancel}></div>
            <div className="confirm-modal">
                <div className="confirm-modal-header">
                    <h5>{title}</h5>
                    <button className="confirm-modal-close" onClick={onCancel}>×</button>
                </div>
                <div className="confirm-modal-body">
                    <p>{message}</p>
                </div>
                <div className="confirm-modal-footer">
                    <button className="btn btn-secondary" onClick={onCancel}>
                        {cancelText}
                    </button>
                    <button className={`btn ${getButtonClass()}`} onClick={onConfirm}>
                        {confirmText}
                    </button>
                </div>
            </div>
        </>
    );
};

export default ConfirmModal;
