import React, { useState } from 'react';
import { Modal, Button, Form } from 'react-bootstrap';
import ScryfallApi from '../../api/scryfallApi';
import { updateUserLeagueData } from '../../api/userLeaguesApi';
import { validateAndCacheDeck } from '../../api/decksApi';
import { useToast } from '../context/ToastContext';

const UpdateCommanderModal = ({ show, onHide, leagueId, currentCommander, currentPartner, currentDeckUrl }) => {
    const [commander, setCommander] = useState('');
    const [commanderScryfallId, setCommanderScryfallId] = useState('');
    const [commanderPartner, setCommanderPartner] = useState('');
    const [partnerScryfallId, setPartnerScryfallId] = useState('');
    const [commanderSuggestions, setCommanderSuggestions] = useState([]);
    const [partnerSuggestions, setPartnerSuggestions] = useState([]);
    const [hasPartnerAbility, setHasPartnerAbility] = useState(false);
    const [commanderAbilityType, setCommanderAbilityType] = useState(null); // 'partner' or 'background'
    const [decklistUrl, setDecklistUrl] = useState('');
    const [deckValidationError, setDeckValidationError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { showToast } = useToast();

    const fetchCommanderSuggestions = async (query, setSuggestions, filter = null) => {
        if (!query) {
            setSuggestions([]);
            return;
        }

        try {
            // Autocomplete now returns { name, image } objects directly
            const suggestions = await ScryfallApi.autocomplete(query, filter);
            setSuggestions(suggestions);
        } catch (error) {
            console.error('Error fetching commander suggestions:', error);
        }
    };

    const handleCommanderChange = (e) => {
        const value = e.target.value;
        setCommander(value);
        fetchCommanderSuggestions(value, setCommanderSuggestions);

        // Don't fetch card details on every keystroke - only when a card is selected
        // Reset partner ability if the user is typing a new commander name
        if (!value) {
            setHasPartnerAbility(false);
            setCommanderAbilityType(null);
        }
    };

    const handlePartnerChange = (e) => {
        const value = e.target.value;
        setCommanderPartner(value);
        // Apply filter based on commander ability type
        fetchCommanderSuggestions(value, setPartnerSuggestions, commanderAbilityType);
    };

    const handleCommanderSelection = async (name) => {
        setCommander(name);
        setCommanderSuggestions([]);

        try {
            const card = await ScryfallApi.getCardByName(name);
            const oracleText = (card.oracle_text || '').toLowerCase();
            const keywords = card.keywords || [];

            // Check for Partner or Choose a Background
            const hasPartner = oracleText.includes('partner');
            const hasBackground = keywords.some(kw => kw.toLowerCase().includes('choose a background'));

            setHasPartnerAbility(hasPartner || hasBackground);
            setCommanderAbilityType(hasBackground ? 'background' : hasPartner ? 'partner' : null);
            setCommanderScryfallId(card.id || '');
        } catch (error) {
            console.error('Error fetching commander details:', error);
            setHasPartnerAbility(false);
            setCommanderAbilityType(null);
            setCommanderScryfallId('');
        }
    };

    const handlePartnerSelection = async (name) => {
        setCommanderPartner(name);
        setPartnerSuggestions([]);

        try {
            const card = await ScryfallApi.getCardByName(name);
            setPartnerScryfallId(card.id || '');
        } catch (error) {
            console.error('Error fetching partner details:', error);
            setPartnerScryfallId('');
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        setDeckValidationError('');

        try {
            const updates = {};

            // Validate and update decklist if changed
            if (decklistUrl && decklistUrl !== currentDeckUrl) {
                try {
                    const response = await validateAndCacheDeck({ decklistUrl });
                    updates.deck_id = response.deck.id; // Keep as string, don't parseInt
                } catch (error) {
                    setDeckValidationError('Invalid decklist URL. Please provide a valid decklist.');
                    setIsSubmitting(false);
                    return;
                }
            }

            // Update commander if changed
            if (commanderScryfallId) {
                updates.current_commander = commanderScryfallId;
                updates.commander_partner = hasPartnerAbility ? partnerScryfallId : null;
            }

            // Only proceed if there are updates
            if (Object.keys(updates).length === 0) {
                showToast('No changes to update.', 'info');
                setIsSubmitting(false);
                return;
            }

            console.log('Frontend sending updates:', updates);
            await updateUserLeagueData(leagueId, updates);

            showToast('League data updated successfully!', 'success');
            onHide();
            window.location.reload(); // Refresh to show updated data
        } catch (error) {
            console.error('Error updating league data:', error);
            showToast('Failed to update league data.', 'danger');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleClose = () => {
        setCommander('');
        setCommanderScryfallId('');
        setCommanderPartner('');
        setPartnerScryfallId('');
        setCommanderSuggestions([]);
        setPartnerSuggestions([]);
        setHasPartnerAbility(false);
        setDecklistUrl('');
        setDeckValidationError('');
        onHide();
    };

    return (
        <Modal show={show} onHide={handleClose} size="lg">
            <Modal.Header closeButton>
                <Modal.Title>Update League Info</Modal.Title>
            </Modal.Header>
            <Form onSubmit={handleSubmit}>
                <Modal.Body>
                    {(currentCommander || currentDeckUrl) && (
                        <div className="alert alert-info">
                            {currentCommander && (
                                <div>
                                    <strong>Current Commander:</strong> {currentCommander}
                                    {currentPartner && <> & {currentPartner}</>}
                                </div>
                            )}
                            {currentDeckUrl && (
                                <div>
                                    <strong>Current Decklist:</strong> <a href={currentDeckUrl} target="_blank" rel="noopener noreferrer">View Deck</a>
                                </div>
                            )}
                        </div>
                    )}

                    <Form.Group className="mb-3">
                        <Form.Label>Decklist URL</Form.Label>
                        <Form.Control
                            type="url"
                            value={decklistUrl}
                            onChange={(e) => setDecklistUrl(e.target.value)}
                            placeholder="https://moxfield.com/decks/... or https://archidekt.com/decks/..."
                        />
                        <Form.Text className="text-muted">
                            Leave blank to keep current decklist
                        </Form.Text>
                        {deckValidationError && (
                            <div className="text-danger mt-2">{deckValidationError}</div>
                        )}
                    </Form.Group>

                    <hr />

                    <Form.Group className="mb-3">
                        <Form.Label>Commander</Form.Label>
                        <Form.Control
                            type="text"
                            value={commander}
                            onChange={handleCommanderChange}
                            placeholder="Search for a commander (leave blank to keep current)"
                        />
                        {commanderSuggestions.length > 0 && (
                            <ul className="list-group mt-2">
                                {commanderSuggestions.map((suggestion) => (
                                    <li
                                        key={suggestion.name}
                                        className="list-group-item list-group-item-action d-flex align-items-center"
                                        onClick={() => handleCommanderSelection(suggestion.name)}
                                        style={{ cursor: 'pointer' }}
                                    >
                                        {suggestion.image && (
                                            <img
                                                src={suggestion.image}
                                                alt={suggestion.name}
                                                style={{ width: '40px', marginRight: '10px' }}
                                            />
                                        )}
                                        {suggestion.name}
                                    </li>
                                ))}
                            </ul>
                        )}
                    </Form.Group>

                    {hasPartnerAbility && (
                        <Form.Group className="mb-3">
                            <Form.Label>Partner Commander</Form.Label>
                            <Form.Control
                                type="text"
                                value={commanderPartner}
                                onChange={handlePartnerChange}
                                placeholder="Search for a partner"
                            />
                            {partnerSuggestions.length > 0 && (
                                <ul className="list-group mt-2">
                                    {partnerSuggestions.map((suggestion) => (
                                        <li
                                            key={suggestion.name}
                                            className="list-group-item list-group-item-action d-flex align-items-center"
                                            onClick={() => handlePartnerSelection(suggestion.name)}
                                            style={{ cursor: 'pointer' }}
                                        >
                                            {suggestion.image && (
                                                <img
                                                    src={suggestion.image}
                                                    alt={suggestion.name}
                                                    style={{ width: '40px', marginRight: '10px' }}
                                                />
                                            )}
                                            {suggestion.name}
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </Form.Group>
                    )}
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={handleClose} disabled={isSubmitting}>
                        Cancel
                    </Button>
                    <Button
                        variant="primary"
                        type="submit"
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? 'Updating...' : 'Update'}
                    </Button>
                </Modal.Footer>
            </Form>
        </Modal>
    );
};

export default UpdateCommanderModal;
