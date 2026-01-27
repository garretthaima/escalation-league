import axiosInstance from './axiosConfig';

// Validate and cache a deck from its URL
export const validateAndCacheDeck = async (userData) => {
    const response = await axiosInstance.post('/decks/validate', userData);
    return response.data;
};

// Price check a deck
export const priceCheckDeck = async (deckId) => {
    const response = await axiosInstance.post('/decks/price-check', { deckId });
    return response.data;
};

// Sync a deck from its platform (Moxfield/Archidekt)
export const syncDeck = async (deckId) => {
    const response = await axiosInstance.post(`/decks/${deckId}/sync`);
    return response.data;
};