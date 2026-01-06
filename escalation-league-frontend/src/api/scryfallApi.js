import axiosInstance from './axiosConfig';

const ScryfallApi = {
    async autocomplete(query) {
        if (!query) return [];
        try {
            const response = await axiosInstance.get('/scryfall/autocomplete', {
                params: { q: query },
            });
            return response.data; // Array of card names
        } catch (error) {
            console.error('Error fetching autocomplete suggestions from backend proxy:', error);
            throw new Error('Failed to fetch autocomplete suggestions.');
        }
    },

    async autocompleteWithPrices(query) {
        if (!query) return [];
        try {
            const response = await axiosInstance.get('/scryfall/autocomplete-with-prices', {
                params: { q: query },
            });
            return response.data; // Array of { name, price }
        } catch (error) {
            console.error('Error fetching autocomplete with prices from backend proxy:', error);
            throw new Error('Failed to fetch autocomplete suggestions.');
        }
    },

    async getCardByName(name) {
        try {
            const response = await axiosInstance.get('/scryfall/cards/named', {
                params: { exact: name },
            });
            return response.data; // Full card details
        } catch (error) {
            console.error('Error fetching card details from backend proxy:', error);
            throw new Error('Failed to fetch card details.');
        }
    },

    async getCardById(id) {
        try {
            const response = await axiosInstance.get(`/scryfall/cards/${id}`);
            return response.data; // Full card details including image_uris
        } catch (error) {
            console.error('Error fetching card by ID from backend proxy:', error);
            throw new Error('Failed to fetch card by ID.');
        }
    },

    async getCheapestPrinting(name) {
        try {
            const response = await axiosInstance.get('/scryfall/cards/cheapest', {
                params: { name },
            });
            return response.data; // Cheapest printing with price
        } catch (error) {
            console.error('Error fetching cheapest printing:', error);
            throw new Error('Failed to fetch cheapest printing.');
        }
    },
};

export default ScryfallApi;