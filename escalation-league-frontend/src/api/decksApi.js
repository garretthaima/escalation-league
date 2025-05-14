import axiosInstance from './axiosConfig';

// Register a new user
export const validateAndCacheDeck = async (userData) => {
    const response = await axiosInstance.post('/decks/validate', userData);
    return response.data;
};

// Price check a deck
export const priceCheckDeck = async (deckId) => {
    const response = await axiosInstance.post('/decks/price-check', { deckId });
    return response.data;
};