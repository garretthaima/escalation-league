import React, { useState, useEffect } from 'react';
import { priceCheckDeck } from '../../api/decksApi';
import { getLeagueParticipantsDetails } from '../../api/userLeaguesApi';
import { usePermissions } from '../context/PermissionsProvider';

const PriceCheckPage = () => {
    const { user } = usePermissions();
    const { activeLeague } = usePermissions();
    const [deckId, setDeckId] = useState(null);
    const [priceCheckResult, setPriceCheckResult] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [showFrontStates, setShowFrontStates] = useState({}); // State to track front/back for each card

    useEffect(() => {
        const fetchDeckId = async () => {
            if (!activeLeague?.league_id) {
                setError('No active league found.');
                return;
            }

            try {
                const participantDetails = await getLeagueParticipantsDetails(activeLeague.league_id, user?.id);
                if (participantDetails?.deck_id) {
                    setDeckId(participantDetails.deck_id);
                } else {
                    setError('No deck associated with the current league.');
                }
            } catch (err) {
                console.error('Error fetching deck ID:', err);
                setError('Failed to fetch deck ID for the current league.');
            }
        };

        fetchDeckId();
    }, [activeLeague]);

    const handlePriceCheck = async () => {
        if (!deckId) {
            setError('No deck associated with the current league.');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const result = await priceCheckDeck(deckId);
            setPriceCheckResult(result);
        } catch (err) {
            console.error('Error during price check:', err);
            setError('Failed to perform price check.');
        } finally {
            setLoading(false);
        }
    };

    const handleCardClick = (cardName) => {
        setShowFrontStates((prevState) => ({
            ...prevState,
            [cardName]: !prevState[cardName], // Toggle the front/back state for the card
        }));
    };

    const renderCard = (card) => {
        const showFront = showFrontStates[card.name] ?? true; // Default to showing the front
        const imageUri = card.image_uri || (showFront ? card.card_faces?.[0]?.image_uri : card.card_faces?.[1]?.image_uri);

        return (
            <div className="col-md-3 mb-3" key={card.name}>
                <div
                    className="card"
                    onClick={() => handleCardClick(card.name)}
                    style={{ cursor: card.card_faces ? 'pointer' : 'default' }}
                >
                    <img
                        src={imageUri || 'https://via.placeholder.com/150'}
                        alt={card.name}
                        className="card-img-top"
                    />
                    <div className="card-body">
                        <h5 className="card-title">{card.name}</h5>
                        <p className="card-text">
                            <strong>Set:</strong> {card.set_name || 'Unknown'}
                        </p>
                        <p className="card-text">
                            <strong>Price:</strong> {card.price ? `$${card.price.toFixed(2)}` : 'N/A'}
                        </p>
                        {card.commander && <span className="badge bg-primary">Commander</span>}
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="container mt-4">
            <h2>Deck Price Check <span className="badge bg-warning text-dark ms-2">BETA</span></h2>
            <button className="btn btn-primary mb-4" onClick={handlePriceCheck} disabled={loading || !deckId}>
                {loading ? 'Checking...' : 'Check Deck Price'}
            </button>
            {error && <div className="alert alert-danger">{error}</div>}
            {priceCheckResult && (
                <div>
                    <h4>Total Price: ${priceCheckResult.totalPrice.toFixed(2)}</h4>
                    <div className="row">
                        {/* Render commanders first */}
                        {priceCheckResult.cardPrices
                            .filter((card) => card.commander)
                            .map((card) => renderCard(card))}
                        {/* Render other cards */}
                        {priceCheckResult.cardPrices
                            .filter((card) => !card.commander)
                            .map((card) => renderCard(card))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default PriceCheckPage;