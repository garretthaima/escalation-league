import React from 'react';
import './Toast.css';

const Toast = ({ show, message, type = 'success', onClose }) => {
    React.useEffect(() => {
        if (show) {
            const timer = setTimeout(() => {
                onClose();
            }, 4000); // Auto-dismiss after 4 seconds

            return () => clearTimeout(timer);
        }
    }, [show, onClose]);

    if (!show) return null;

    const getIcon = () => {
        switch (type) {
            case 'success':
                return '✓';
            case 'error':
                return '✕';
            case 'warning':
                return '⚠';
            case 'info':
                return 'ℹ';
            default:
                return '✓';
        }
    };

    const getTypeClass = () => {
        switch (type) {
            case 'success':
                return 'toast-success';
            case 'error':
                return 'toast-error';
            case 'warning':
                return 'toast-warning';
            case 'info':
                return 'toast-info';
            default:
                return 'toast-success';
        }
    };

    return (
        <div className={`custom-toast ${getTypeClass()} ${show ? 'toast-show' : ''}`}>
            <div className="toast-icon">{getIcon()}</div>
            <div className="toast-message">{message}</div>
            <button className="toast-close" onClick={onClose}>×</button>
        </div>
    );
};

export default Toast;
