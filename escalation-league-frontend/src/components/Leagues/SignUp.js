import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getLeagues } from '../../api/leaguesApi';
import { getUserPendingSignupRequests, requestSignupForLeague, isUserInLeague } from '../../api/userLeaguesApi';
import { validateAndCacheDeck } from '../../api/decksApi'; // Import the function
import axios from 'axios';

const SignUp = () => {
    const [leagues, setLeagues] = useState([]);
    const [selectedLeague, setSelectedLeague] = useState('');
    const [activeLeague, setActiveLeague] = useState(null);
    const [pendingRequest, setPendingRequest] = useState(false);
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [commander, setCommander] = useState('');
    const [commanderPartner, setCommanderPartner] = useState('');
    const [commanderSuggestions, setCommanderSuggestions] = useState([]);
    const [partnerSuggestions, setPartnerSuggestions] = useState([]);
    const [hasPartnerAbility, setHasPartnerAbility] = useState(false);
    const [decklistUrl, setDecklistUrl] = useState('');
    const [deckValidationError, setDeckValidationError] = useState(''); // Validation error state
    const navigate = useNavigate();

    useEffect(() => {
        const fetchLeagues = async () => {
            try {
                const leaguesData = await getLeagues();
                setLeagues(leaguesData.filter((league) => league.is_active));
            } catch (error) {
                console.error('Error fetching leagues:', error);
            }
        };

        const checkUserInLeague = async () => {
            try {
                const { inLeague, league } = await isUserInLeague();
                if (inLeague) {
                    setActiveLeague(league);
                }
            } catch (error) {
                if (error.response && error.response.status === 404) {
                    console.warn('User is not part of any league.');
                    setActiveLeague(null);
                } else {
                    console.error('Error checking league membership:', error);
                }
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
            await Promise.all([fetchLeagues(), checkUserInLeague(), checkPendingRequests()]);
            setLoading(false);
        };

        initialize();
    }, []);

    const handleDeckValidation = async () => {
        try {
            const response = await validateAndCacheDeck({ decklistUrl });
            console.log('Deck validation response:', response);
            setDeckValidationError(''); // Clear any previous errors
            return true; // Validation successful
        } catch (error) {
            console.error('Error validating deck:', error);
            setDeckValidationError('Invalid decklist URL. Please provide a valid decklist.');
            return false; // Validation failed
        }
    };

    const handleSignUp = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        setMessage('');
        setDeckValidationError('');

        // Validate the decklist URL before proceeding
        const isDeckValid = await handleDeckValidation();
        if (!isDeckValid) {
            setIsSubmitting(false);
            return; // Stop the signup process if validation fails
        }

        try {
            const response = await requestSignupForLeague(selectedLeague, {
                commander,
                commanderPartner: hasPartnerAbility ? commanderPartner : null,
                decklistUrl,
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

    const fetchCommanderSuggestions = async (query, setSuggestions) => {
        if (!query) {
            setSuggestions([]);
            return;
        }

        try {
            const response = await axios.get(`https://api.scryfall.com/cards/autocomplete?q=${query}`);
            const suggestions = response.data.data;

            const detailedSuggestions = await Promise.all(
                suggestions.map(async (name) => {
                    try {
                        const cardResponse = await axios.get(`https://api.scryfall.com/cards/named?exact=${encodeURIComponent(name)}`);
                        return {
                            name,
                            image: cardResponse.data.image_uris?.small || null,
                        };
                    } catch {
                        return { name, image: null };
                    }
                })
            );

            setSuggestions(detailedSuggestions);
        } catch (error) {
            console.error('Error fetching commander suggestions:', error);
        }
    };

    const handleCommanderChange = async (e) => {
        const value = e.target.value;
        setCommander(value);
        fetchCommanderSuggestions(value, setCommanderSuggestions);

        try {
            const response = await axios.get(`https://api.scryfall.com/cards/named?exact=${encodeURIComponent(value)}`);
            const oracleText = response.data.oracle_text || '';
            setHasPartnerAbility(oracleText.toLowerCase().includes('partner'));
        } catch (error) {
            console.error('Error fetching commander details:', error);
            setHasPartnerAbility(false);
        }
    };

    const handlePartnerChange = (e) => {
        const value = e.target.value;
        setCommanderPartner(value);
        fetchCommanderSuggestions(value, setPartnerSuggestions);
    };

    const handleCommanderSelection = async (name) => {
        setCommander(name);
        setCommanderSuggestions([]);

        try {
            const response = await axios.get(`https://api.scryfall.com/cards/named?exact=${encodeURIComponent(name)}`);
            const oracleText = response.data.oracle_text || '';
            setHasPartnerAbility(oracleText.toLowerCase().includes('partner'));
        } catch (error) {
            console.error('Error fetching commander details:', error);
            setHasPartnerAbility(false);
        }
    };

    const handlePartnerSelection = async (name) => {
        setCommanderPartner(name);
        setPartnerSuggestions([]);
    };

    useEffect(() => {
        if (activeLeague) {
            navigate('/current-league');
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