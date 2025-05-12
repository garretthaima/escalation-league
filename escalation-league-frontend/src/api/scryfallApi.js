import axios from 'axios';

const BACKEND_BASE_URL = process.env.REACT_APP_BACKEND_URL;

const ScryfallApi = {
    async autocomplete(query) {
        if (!query) return [];
        try {
            const response = await axios.get(`${BACKEND_BASE_URL}/scryfall/autocomplete`, {
                params: { q: query },
            });
            return response.data; // Array of card names
        } catch (error) {
            console.error('Error fetching autocomplete suggestions from backend proxy:', error);
            throw new Error('Failed to fetch autocomplete suggestions.');
        }
    },

    async getCardByName(name) {
        try {
            const response = await axios.get(`${BACKEND_BASE_URL}/scryfall/cards/named`, {
                params: { exact: name },
            });
            return response.data; // Full card details
        } catch (error) {
            console.error('Error fetching card details from backend proxy:', error);
            throw new Error('Failed to fetch card details.');
        }
    },
};

export default ScryfallApi;