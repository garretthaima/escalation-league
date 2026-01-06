import React, { useState } from 'react';
import ScryfallApi from '../../api/scryfallApi';
import { addCardToBudget } from '../../api/budgetApi';

const CardSearch = ({ budgetId, remainingBudget, onCardAdded }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [autocompleteResults, setAutocompleteResults] = useState([]);
    const [selectedCard, setSelectedCard] = useState(null);
    const [searching, setSearching] = useState(false);
    const [adding, setAdding] = useState(false);
    const [error, setError] = useState(null);

    const handleAutocomplete = async (query) => {
        if (!query.trim()) {
            setAutocompleteResults([]);
            return;
        }

        try {
            setSearching(true);
            const results = await ScryfallApi.autocomplete(query);
            setAutocompleteResults(results || []);
        } catch (err) {
            console.error('Autocomplete error:', err);
            setAutocompleteResults([]);
        } finally {
            setSearching(false);
        }
    };

    const handleSelectCard = async (cardName) => {
        try {
            setSearching(true);
            setError(null);
            const card = await ScryfallApi.getCardByName(cardName);
            setSelectedCard(card);
            setAutocompleteResults([]);
            setSearchQuery(cardName);
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
            setError(err.response?.data?.error || 'Failed to add card to budget.');
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
                        type="text"
                        className="form-control"
                        placeholder="Search for Magic cards..."
                        value={searchQuery}
                        onChange={(e) => {
                            setSearchQuery(e.target.value);
                            handleAutocomplete(e.target.value);
                        }}
                        disabled={searching || adding}
                    />
                    {autocompleteResults.length > 0 && (
                        <ul className="list-group position-absolute w-100" style={{ zIndex: 1000, maxHeight: '300px', overflowY: 'auto' }}>
                            {autocompleteResults.map((cardName, index) => (
                                <li 
                                    key={index}
                                    className="list-group-item list-group-item-action" 
                                    style={{ cursor: 'pointer' }}
                                    onClick={() => handleSelectCard(cardName)}
                                >
                                    {cardName}
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
