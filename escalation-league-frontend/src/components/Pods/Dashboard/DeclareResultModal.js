import React from 'react';
import PropTypes from 'prop-types';

/**
 * Modal for declaring game result (win or draw)
 */
const DeclareResultModal = ({ show, onHide, onDeclareWin, onDeclareDraw }) => {
    if (!show) return null;

    return (
        <>
            <div className="modal fade show" style={{ display: 'block' }} tabIndex="-1">
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
                                onClick={onHide}
                                aria-label="Close"
                            />
                        </div>
                        <div className="modal-body">
                            <p>How did this game end? Other players will be notified to confirm the result.</p>
                        </div>
                        <div className="modal-footer flex-column">
                            <div className="d-flex gap-2 w-100">
                                <button
                                    type="button"
                                    className="btn btn-secondary flex-fill"
                                    onClick={onHide}
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
                            <button
                                type="button"
                                className="btn w-100"
                                onClick={onDeclareWin}
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
                        </div>
                    </div>
                </div>
            </div>
            <div className="modal-backdrop fade show"></div>
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
