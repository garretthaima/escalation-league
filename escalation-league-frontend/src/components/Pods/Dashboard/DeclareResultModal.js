import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import './DeclareResultModal.css';

/**
 * Modal for declaring game result (win or draw)
 */
const DeclareResultModal = ({ show, onHide, onDeclareWin, onDeclareDraw }) => {
    const [confirmingWin, setConfirmingWin] = useState(false);

    // Reset confirmation state when modal closes
    useEffect(() => {
        if (!show) {
            setConfirmingWin(false);
        }
    }, [show]);

    if (!show) return null;

    const handleBack = () => {
        setConfirmingWin(false);
    };

    const handleHide = () => {
        setConfirmingWin(false);
        onHide();
    };

    // Handle backdrop click to close modal
    const handleBackdropClick = (e) => {
        if (e.target === e.currentTarget) {
            handleHide();
        }
    };

    // Confirmation view for declaring win
    if (confirmingWin) {
        return (
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
                                <h5 className="modal-title">
                                    <i className="fas fa-trophy me-2 text-brand-gold"></i>
                                    Confirm Your Win
                                </h5>
                                <button
                                    type="button"
                                    className="btn-close"
                                    onClick={handleHide}
                                    aria-label="Close"
                                />
                            </div>
                            <div className="modal-body">
                                <p>Are you sure you want to declare yourself as the winner?</p>
                                <p className="text-muted small mb-0">
                                    All other players will be notified and asked to confirm the result.
                                </p>
                            </div>
                            <div className="modal-footer d-flex gap-2">
                                <button
                                    type="button"
                                    className="btn btn-secondary flex-fill"
                                    onClick={handleBack}
                                >
                                    Back
                                </button>
                                <button
                                    type="button"
                                    className="btn flex-fill declare-result-btn-gold"
                                    onClick={onDeclareWin}
                                >
                                    <i className="fas fa-check me-1"></i>
                                    Yes, I Won
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="modal-backdrop fade show" onClick={handleHide}></div>
            </>
        );
    }

    // Main result selection view
    return (
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
                            <h5 className="modal-title">
                                <i className="fas fa-flag-checkered me-2"></i>
                                Declare Game Result
                            </h5>
                            <button
                                type="button"
                                className="btn-close"
                                onClick={handleHide}
                                aria-label="Close"
                            />
                        </div>
                        <div className="modal-body">
                            <p>How did this game end? Other players will be notified to confirm the result.</p>
                        </div>
                        <div className="modal-footer flex-column">
                            <button
                                type="button"
                                className="btn w-100"
                                onClick={() => setConfirmingWin(true)}
                                style={{
                                    background: 'var(--brand-gold)',
                                    borderColor: 'var(--brand-gold)',
                                    color: '#1a1a2e',
                                    fontWeight: 600
                                }}
                            >
                                <i className="fas fa-trophy me-1"></i>
                                I Won!
                            </button>
                            <div className="d-flex gap-2 w-100">
                                <button
                                    type="button"
                                    className="btn btn-secondary flex-fill"
                                    onClick={handleHide}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    className="btn btn-outline-secondary flex-fill"
                                    onClick={onDeclareDraw}
                                >
                                    <i className="fas fa-handshake me-1"></i>
                                    Declare Draw
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div className="modal-backdrop fade show" onClick={handleHide}></div>
        </>
    );
};

DeclareResultModal.propTypes = {
    show: PropTypes.bool.isRequired,
    onHide: PropTypes.func.isRequired,
    onDeclareWin: PropTypes.func.isRequired,
    onDeclareDraw: PropTypes.func.isRequired
};

export default DeclareResultModal;
