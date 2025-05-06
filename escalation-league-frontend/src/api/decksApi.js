import axiosInstance from './axiosConfig';

// Register a new user
export const validateAndCacheDeck = async (userData) => {
    const response = await axiosInstance.post('/decks/validate', userData);
    return response.data;
};
