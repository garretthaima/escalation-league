import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getLeagues } from '../../api/leaguesApi';
import { getUserPendingSignupRequests, requestSignupForLeague } from '../../api/userLeaguesApi';
import { validateAndCacheDeck } from '../../api/decksApi'; // Import the function
import ScryfallApi from '../../api/scryfallApi';
import { usePermissions } from '../context/PermissionsProvider';

const SignUp = () => {
    const { activeLeague: contextActiveLeague, loading: permissionsLoading } = usePermissions();

    const [leagues, setLeagues] = useState([]);
    const [selectedLeague, setSelectedLeague] = useState('');
    const [pendingRequest, setPendingRequest] = useState(false);
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [commander, setCommander] = useState('');
    const [commanderScryfallId, setCommanderScryfallId] = useState('');
    const [commanderPartner, setCommanderPartner] = useState('');
    const [partnerScryfallId, setPartnerScryfallId] = useState('');
    const [commanderSuggestions, setCommanderSuggestions] = useState([]);
    const [partnerSuggestions, setPartnerSuggestions] = useState([]);
    const [hasPartnerAbility, setHasPartnerAbility] = useState(false);
    const [commanderAbilityType, setCommanderAbilityType] = useState(null); // 'partner' or 'background'
    const [decklistUrl, setDecklistUrl] = useState('');
    const [deckValidationError, setDeckValidationError] = useState(''); // Validation error state
    const navigate = useNavigate();

    // Use activeLeague from context
    const activeLeague = contextActiveLeague;

    useEffect(() => {
        if (permissionsLoading) return;

        const fetchLeagues = async () => {
            try {
                const leaguesData = await getLeagues();
                setLeagues(leaguesData.filter((league) => league.is_active));
            } catch (error) {
                console.error('Error fetching leagues:', error);
            }
        };

        const checkPendingRequests = async () => {
            try {
                const pendingRequests = await getUserPendingSignupRequests();
                if (pendingRequests.length > 0) {
                    setPendingRequest(true);
                } else {
                    setPendingRequest(false);
                }
            } catch (error) {
                console.error('Error checking pending signup requests:', error);
            }
        };

        const initialize = async () => {
            setLoading(true);
            await Promise.all([fetchLeagues(), checkPendingRequests()]);
            setLoading(false);
        };

        initialize();
    }, [permissionsLoading]);

    const handleDeckValidation = async () => {
        try {
            const response = await validateAndCacheDeck({ decklistUrl }); // Call the backend
            setDeckValidationError(''); // Clear any previous errors
            return response.deck.id; // Return the deck_id from the backend response
        } catch (error) {
            console.error('Error validating deck:', error);
            setDeckValidationError('Invalid decklist URL. Please provide a valid decklist.');
            return null; // Validation failed
        }
    };

    const handleSignUp = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        setMessage('');
        setDeckValidationError('');

        // Validate the decklist URL and get the deck_id
        const deckId = await handleDeckValidation();
        if (!deckId) {
            setIsSubmitting(false);
            return; // Stop the signup process if validation fails
        }

        try {
            // Send the signup request to the backend
            const response = await requestSignupForLeague({
                league_id: parseInt(selectedLeague, 10),
                deck_id: deckId, // Keep as string - deck IDs are alphanumeric
                current_commander: commanderScryfallId,
                commander_partner: hasPartnerAbility ? partnerScryfallId : null,
            });

            setMessage(response.message || 'Successfully signed up for the league!');
            setPendingRequest(true);
        } catch (error) {
            setMessage('Error signing up for the league.');
            console.error('Error signing up for the league:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

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
            // Store the Scryfall ID
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
            // Store the Scryfall ID
            setPartnerScryfallId(card.id || '');
        } catch (error) {
            console.error('Error fetching partner details:', error);
            setPartnerScryfallId('');
        }
    };

    useEffect(() => {
        if (activeLeague) {
            navigate('/leagues');
        }
    }, [activeLeague, navigate]);

    if (loading) {
        return <div>Loading...</div>;
    }

    if (pendingRequest) {
        return (
            <div className="container mt-4">
                <h2 className="mb-4">Sign Up for a League</h2>
                <p className="text-warning">
                    You already have a pending signup request. Please wait for it to be approved.
                </p>
            </div>
        );
    }

    return (
        <div className="container mt-4">
            <h2 className="mb-4">Sign Up for a League</h2>
            <form onSubmit={handleSignUp}>
                <div className="mb-3">
                    <label htmlFor="league" className="form-label">Select a League</label>
                    <select
                        id="league"
                        className="form-select"
                        value={selectedLeague}
                        onChange={(e) => setSelectedLeague(e.target.value)}
                        required
                        disabled={isSubmitting}
                    >
                        <option value="">Choose a league</option>
                        {leagues.map((league) => (
                            <option key={league.id} value={league.id}>
                                {league.name}
                            </option>
                        ))}
                    </select>
                </div>
                <div className="mb-3">
                    <label htmlFor="commander" className="form-label">Commander</label>
                    <input
                        id="commander"
                        className="form-control"
                        value={commander}
                        onChange={handleCommanderChange}
                        placeholder="Search for a commander"
                        required
                    />
                    {commanderSuggestions.length > 0 && (
                        <ul className="list-group mt-2">
                            {commanderSuggestions.map((suggestion) => (
                                <li
                                    key={suggestion.name}
                                    className="list-group-item list-group-item-action d-flex align-items-center"
                                    onClick={() => handleCommanderSelection(suggestion.name)}
                                >
                                    {suggestion.image && (
                                        <img
                                            src={suggestion.image}
                                            alt={suggestion.name}
                                            className="me-2"
                                            style={{ width: '40px', height: 'auto' }}
                                        />
                                    )}
                                    {suggestion.name}
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
                {hasPartnerAbility && (
                    <div className="mb-3">
                        <label htmlFor="commanderPartner" className="form-label">Commander Partner</label>
                        <input
                            id="commanderPartner"
                            className="form-control"
                            value={commanderPartner}
                            onChange={handlePartnerChange}
                            placeholder="Search for a commander partner"
                        />
                        {partnerSuggestions.length > 0 && (
                            <ul className="list-group mt-2">
                                {partnerSuggestions.map((suggestion) => (
                                    <li
                                        key={suggestion.name}
                                        className="list-group-item list-group-item-action d-flex align-items-center"
                                        onClick={() => handlePartnerSelection(suggestion.name)}
                                    >
                                        {suggestion.image && (
                                            <img
                                                src={suggestion.image}
                                                alt={suggestion.name}
                                                className="me-2"
                                                style={{ width: '40px', height: 'auto' }}
                                            />
                                        )}
                                        {suggestion.name}
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                )}
                <div className="mb-3">
                    <label htmlFor="decklistUrl" className="form-label">Decklist URL</label>
                    <input
                        id="decklistUrl"
                        className="form-control"
                        value={decklistUrl}
                        onChange={(e) => setDecklistUrl(e.target.value)}
                        placeholder="https://archidekt.com/decks/123456"
                        required
                    />
                    {deckValidationError && <p className="text-danger">{deckValidationError}</p>}
                </div>
                <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={isSubmitting || !selectedLeague}
                >
                    {isSubmitting ? 'Signing Up...' : 'Sign Up'}
                </button>
            </form>
            {message && <p className="mt-3">{message}</p>}
        </div>
    );
};

export default SignUp;