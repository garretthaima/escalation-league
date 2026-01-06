import React, { useState } from 'react';
import { updateBudgetCard, removeCardFromBudget } from '../../api/budgetApi';

const BudgetCardList = ({ budgetId, cards, remainingBudget, onCardUpdated, onCardRemoved, removesLocked = false }) => {
    const [editingCard, setEditingCard] = useState(null);
    const [editQuantity, setEditQuantity] = useState(1);
    const [editNotes, setEditNotes] = useState('');
    const [updating, setUpdating] = useState(false);
    const [removing, setRemoving] = useState({});
    const [error, setError] = useState(null);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [cardToDelete, setCardToDelete] = useState(null);

    const handleStartEdit = (card) => {
        setEditingCard(card.id);
        setEditQuantity(card.quantity);
        setEditNotes(card.notes || '');
    };

    const handleCancelEdit = () => {
        setEditingCard(null);
        setEditQuantity(1);
        setEditNotes('');
    };

    const handleSaveEdit = async (card) => {
        try {
            setUpdating(true);

            const updates = {};
            if (editQuantity !== card.quantity) {
                updates.quantity = parseInt(editQuantity);
            }
            if (editNotes !== (card.notes || '')) {
                updates.notes = editNotes;
            }

            if (Object.keys(updates).length === 0) {
                handleCancelEdit();
                return;
            }

            // Check if quantity increase exceeds budget
            if (updates.quantity && updates.quantity > card.quantity) {
                const costDifference = (updates.quantity - card.quantity) * parseFloat(card.price_at_addition);
                if (costDifference > remainingBudget) {
                    setError(`Cannot increase quantity. Additional cost of $${costDifference.toFixed(2)} exceeds remaining budget of $${remainingBudget.toFixed(2)}.`);
                    return;
                }
            }

            await updateBudgetCard(budgetId, card.id, updates);
            onCardUpdated();
            handleCancelEdit();
        } catch (err) {
            console.error('Error updating card:', err);
            setError(err.response?.data?.error || 'Failed to update card.');
        } finally {
            setUpdating(false);
        }
    };

    const handleRemoveCard = (card) => {
        setCardToDelete(card);
        setShowDeleteModal(true);
    };

    const confirmRemoveCard = async () => {
        if (!cardToDelete) return;

        try {
            setRemoving({ ...removing, [cardToDelete.id]: true });
            await removeCardFromBudget(budgetId, cardToDelete.id);
            setShowDeleteModal(false);
            setCardToDelete(null);
            onCardRemoved();
        } catch (err) {
            console.error('Error removing card:', err);
            setError(err.response?.data?.error || 'Failed to remove card.');
        } finally {
            setRemoving({ ...removing, [cardToDelete.id]: false });
        }
    };

    if (cards.length === 0) {
        return (
            <div className="card">
                <div className="card-body text-center text-muted py-5">
                    <i className="fas fa-box-open fa-3x mb-3"></i>
                    <p>No cards in your budget yet. Search and add cards above to get started!</p>
                </div>
            </div>
        );
    }

    const totalCost = cards.reduce((sum, card) => sum + (parseFloat(card.price_at_addition) * card.quantity), 0);

    return (
        <div className="card">
            <div className="card-body">
                <h5 className="card-title">
                    <i className="fas fa-list me-2"></i>
                    Your Cards ({cards.length})
                </h5>

                {error && (
                    <div className="alert alert-danger alert-dismissible fade show" role="alert">
                        {error}
                        <button
                            type="button"
                            className="btn-close"
                            onClick={() => setError(null)}
                            aria-label="Close"
                        ></button>
                    </div>
                )}

                {removesLocked && (
                    <div className="alert alert-warning">
                        <i className="fas fa-lock me-2"></i>
                        <strong>Removes Locked:</strong> Card removals are disabled after Thursday 6pm EST each week.
                    </div>
                )}

                <p className="text-muted small mb-3">
                    Total Value: ${totalCost.toFixed(2)}
                </p>

                <div className="table-responsive">
                    <table className="table table-hover">
                        <thead>
                            <tr>
                                <th>Card</th>
                                <th>Set</th>
                                <th className="text-center">Qty</th>
                                <th className="text-end">Price</th>
                                <th className="text-end">Total</th>
                                <th className="text-center">Week</th>
                                <th className="text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {cards.map(card => {
                                const isEditing = editingCard === card.id;
                                const cardTotal = parseFloat(card.price_at_addition) * card.quantity;

                                return (
                                    <tr key={card.id}>
                                        <td>
                                            <div className="d-flex align-items-center">
                                                {card.image_uri && (
                                                    <img
                                                        src={card.image_uri}
                                                        alt={card.card_name}
                                                        className="me-2"
                                                        style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '4px' }}
                                                    />
                                                )}
                                                <div>
                                                    <strong>{card.card_name}</strong>
                                                    {card.notes && (
                                                        <div className="text-muted small">
                                                            <i className="fas fa-sticky-note me-1"></i>
                                                            {card.notes}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="text-muted small">{card.set_name}</td>
                                        <td className="text-center">
                                            {isEditing ? (
                                                <input
                                                    type="number"
                                                    className="form-control form-control-sm"
                                                    style={{ width: '70px' }}
                                                    min="1"
                                                    value={editQuantity}
                                                    onChange={(e) => setEditQuantity(e.target.value)}
                                                />
                                            ) : (
                                                <span className="badge bg-secondary">{card.quantity}</span>
                                            )}
                                        </td>
                                        <td className="text-end">${parseFloat(card.price_at_addition).toFixed(2)}</td>
                                        <td className="text-end">
                                            <strong>${cardTotal.toFixed(2)}</strong>
                                        </td>
                                        <td className="text-center">
                                            <span className="badge bg-info">{card.week_added}</span>
                                        </td>
                                        <td className="text-center">
                                            {isEditing ? (
                                                <div className="btn-group btn-group-sm">
                                                    <button
                                                        className="btn btn-success"
                                                        onClick={() => handleSaveEdit(card)}
                                                        disabled={updating}
                                                    >
                                                        <i className="fas fa-check"></i>
                                                    </button>
                                                    <button
                                                        className="btn btn-secondary"
                                                        onClick={handleCancelEdit}
                                                        disabled={updating}
                                                    >
                                                        <i className="fas fa-times"></i>
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className="btn-group btn-group-sm">
                                                    <button
                                                        className="btn btn-outline-primary"
                                                        onClick={() => handleStartEdit(card)}
                                                        title="Edit"
                                                    >
                                                        <i className="fas fa-edit"></i>
                                                    </button>
                                                    <button
                                                        className="btn btn-outline-danger"
                                                        onClick={() => handleRemoveCard(card)}
                                                        disabled={removing[card.id] || removesLocked}
                                                        title={removesLocked ? "Card removes locked after Thursday 6pm EST" : "Remove"}
                                                        style={removesLocked ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
                                                    >
                                                        {removing[card.id] ? (
                                                            <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                                                        ) : (
                                                            <i className="fas fa-trash"></i>
                                                        )}
                                                    </button>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                {editingCard && (
                    <div className="mt-3">
                        <label className="form-label small">Notes (optional):</label>
                        <textarea
                            className="form-control form-control-sm"
                            rows="2"
                            placeholder="Add notes about this card..."
                            value={editNotes}
                            onChange={(e) => setEditNotes(e.target.value)}
                        />
                    </div>
                )}
            </div>

            {/* Delete Confirmation Modal */}
            {showDeleteModal && (
                <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
                    <div className="modal-dialog modal-dialog-centered">
                        <div className="modal-content">
                            <div className="modal-header">
                                <h5 className="modal-title">
                                    <i className="fas fa-exclamation-triangle text-warning me-2"></i>
                                    Confirm Removal
                                </h5>
                                <button
                                    type="button"
                                    className="btn-close"
                                    onClick={() => setShowDeleteModal(false)}
                                    aria-label="Close"
                                ></button>
                            </div>
                            <div className="modal-body">
                                <p>Are you sure you want to remove <strong>{cardToDelete?.card_name}</strong> from your budget?</p>
                                <p className="text-muted small mb-0">
                                    This will refund ${(parseFloat(cardToDelete?.price_at_addition || 0) * (cardToDelete?.quantity || 1)).toFixed(2)} to your budget.
                                </p>
                            </div>
                            <div className="modal-footer">
                                <button
                                    type="button"
                                    className="btn btn-secondary"
                                    onClick={() => setShowDeleteModal(false)}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    className="btn btn-danger"
                                    onClick={confirmRemoveCard}
                                    disabled={removing[cardToDelete?.id]}
                                >
                                    {removing[cardToDelete?.id] ? (
                                        <>
                                            <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                                            Removing...
                                        </>
                                    ) : (
                                        <>
                                            <i className="fas fa-trash me-2"></i>
                                            Remove Card
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default BudgetCardList;
