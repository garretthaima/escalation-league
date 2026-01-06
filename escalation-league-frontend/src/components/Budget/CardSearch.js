import React, { useState, useRef, useEffect, useCallback } from 'react';
import ScryfallApi from '../../api/scryfallApi';
import { addCardToBudget } from '../../api/budgetApi';

const CardSearch = ({ budgetId, remainingBudget, onCardAdded, addsLocked = false }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [autocompleteResults, setAutocompleteResults] = useState([]);
    const [selectedCard, setSelectedCard] = useState(null);
    const [searching, setSearching] = useState(false);
    const [adding, setAdding] = useState(false);
    const [error, setError] = useState(null);
    const inputRef = useRef(null);
    const debounceTimer = useRef(null);

    const handleAutocomplete = useCallback(async (query) => {
        if (!query.trim()) {
            setAutocompleteResults([]);
            return;
        }

        try {
            setSearching(true);
            const results = await ScryfallApi.autocompleteWithPrices(query);
            setAutocompleteResults(results || []);
        } catch (err) {
            console.error('Autocomplete error:', err);
            setAutocompleteResults([]);
        } finally {
            setSearching(false);
        }
    }, []);

    const debouncedAutocomplete = useCallback((query) => {
        if (debounceTimer.current) {
            clearTimeout(debounceTimer.current);
        }
        debounceTimer.current = setTimeout(() => {
            handleAutocomplete(query);
        }, 600); // 600ms debounce - wait longer before searching
    }, [handleAutocomplete]);

    useEffect(() => {
        return () => {
            if (debounceTimer.current) {
                clearTimeout(debounceTimer.current);
            }
        };
    }, []);

    // Show lock message if adds are locked
    if (addsLocked) {
        return (
            <div className="card">
                <div className="card-body">
                    <h5 className="card-title">
                        <i className="fas fa-lock me-2"></i>
                        Card Adds Locked
                    </h5>
                    <div className="alert alert-warning mb-0">
                        <i className="fas fa-info-circle me-2"></i>
                        Card adds are locked after Thursday 6pm each week. You'll be able to add cards again when the next week starts.
                        <br />
                        <small className="text-muted">Note: Final week adds are always allowed.</small>
                    </div>
                </div>
            </div>
        );
    }

    const handleSelectCard = async (cardName) => {
        try {
            setSearching(true);
            setError(null);
            const card = await ScryfallApi.getCheapestPrinting(cardName);
            setSelectedCard(card);
            setAutocompleteResults([]);
            setSearchQuery(cardName);
            // Keep focus on input
            setTimeout(() => inputRef.current?.focus(), 0);
        } catch (err) {
            console.error('Error fetching card:', err);
            setError('Failed to load card details. Please try again.');
        } finally {
            setSearching(false);
        }
    };

    const handleAddCard = async () => {
        if (!selectedCard) return;

        try {
            setAdding(true);
            setError(null);

            // Get cheapest price
            const price = selectedCard.prices?.usd ||
                selectedCard.prices?.usd_foil ||
                0;

            if (parseFloat(price) > remainingBudget) {
                setError(`Insufficient budget. This card costs $${parseFloat(price).toFixed(2)} but you only have $${remainingBudget.toFixed(2)} remaining.`);
                return;
            }

            const cardData = {
                card_name: selectedCard.name,
                scryfall_id: selectedCard.id,
                quantity: 1,
                price_at_addition: parseFloat(price),
                set_name: selectedCard.set_name || 'Unknown',
                image_uri: selectedCard.image_uris?.normal || null,
                card_faces: selectedCard.card_faces ? JSON.stringify(selectedCard.card_faces) : null
            };

            await addCardToBudget(budgetId, cardData);
            onCardAdded();

            // Reset form
            setSelectedCard(null);
            setSearchQuery('');

        } catch (err) {
            console.error('Error adding card:', err);
            const errorMsg = err.response?.data?.error || 'Failed to add card to budget.';

            // If adds are locked, show specific message
            if (err.response?.data?.locked) {
                setError('Card adds are currently locked. Please try again when the next week starts.');
            } else {
                setError(errorMsg);
            }
        } finally {
            setAdding(false);
        }
    };

    return (
        <div className="card">
            <div className="card-body">
                <h5 className="card-title">
                    <i className="fas fa-search me-2"></i>
                    Search & Add Cards
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

                <div className="mb-3 position-relative">
                    <input
                        ref={inputRef}
                        type="text"
                        className="form-control"
                        placeholder="Search for Magic cards..."
                        value={searchQuery}
                        onChange={(e) => {
                            setSearchQuery(e.target.value);
                            debouncedAutocomplete(e.target.value);
                        }}
                        disabled={adding}
                        autoComplete="off"
                    />
                    {autocompleteResults.length > 0 && (
                        <ul className="list-group position-absolute w-100" style={{ zIndex: 1000, maxHeight: '300px', overflowY: 'auto' }}>
                            {autocompleteResults.map((result, index) => (
                                <li
                                    key={index}
                                    className="list-group-item list-group-item-action d-flex justify-content-between align-items-center"
                                    style={{ cursor: 'pointer' }}
                                    onMouseDown={(e) => {
                                        e.preventDefault(); // Prevent input blur
                                        handleSelectCard(result.name);
                                    }}
                                >
                                    <span>{result.name}</span>
                                    {result.price && (
                                        <span className="badge bg-success">${result.price}</span>
                                    )}
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                {selectedCard && (
                    <div className="card mb-3">
                        <div className="row g-0">
                            {selectedCard.image_uris?.normal && (
                                <div className="col-md-4">
                                    <img
                                        src={selectedCard.image_uris.normal}
                                        className="img-fluid rounded-start"
                                        alt={selectedCard.name}
                                        style={{ maxHeight: '400px', objectFit: 'contain' }}
                                    />
                                </div>
                            )}
                            <div className={selectedCard.image_uris?.normal ? 'col-md-8' : 'col-12'}>
                                <div className="card-body">
                                    <h5 className="card-title">{selectedCard.name}</h5>
                                    <p className="card-text text-muted">{selectedCard.set_name}</p>

                                    <div className="mb-3">
                                        <strong>Price: </strong>
                                        <span className="badge bg-success fs-6">
                                            ${parseFloat(selectedCard.prices?.usd || selectedCard.prices?.usd_foil || 0).toFixed(2)}
                                        </span>
                                    </div>

                                    {parseFloat(selectedCard.prices?.usd || selectedCard.prices?.usd_foil || 0) > remainingBudget && (
                                        <div className="alert alert-warning">
                                            <i className="fas fa-exclamation-triangle me-2"></i>
                                            This card exceeds your remaining budget!
                                        </div>
                                    )}

                                    <div className="d-flex gap-2">
                                        <button
                                            className="btn btn-primary"
                                            onClick={handleAddCard}
                                            disabled={adding || parseFloat(selectedCard.prices?.usd || selectedCard.prices?.usd_foil || 0) > remainingBudget}
                                        >
                                            {adding ? (
                                                <>
                                                    <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                                                    Adding...
                                                </>
                                            ) : (
                                                <>
                                                    <i className="fas fa-plus me-2"></i>
                                                    Add to Budget
                                                </>
                                            )}
                                        </button>
                                        <button
                                            className="btn btn-secondary"
                                            onClick={() => {
                                                setSelectedCard(null);
                                                setSearchQuery('');
                                            }}
                                            disabled={adding}
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default CardSearch;
