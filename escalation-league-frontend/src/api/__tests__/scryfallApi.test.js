// Mock axiosInstance BEFORE importing modules that use it
jest.mock('../axiosConfig', () => ({
    __esModule: true,
    default: {
        get: jest.fn(),
        post: jest.fn(),
        put: jest.fn(),
        delete: jest.fn(),
    },
}));

import axiosInstance from '../axiosConfig';
import ScryfallApi from '../scryfallApi';

describe('scryfallApi', () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    beforeEach(() => {
        jest.clearAllMocks();
    });

    afterAll(() => {
        consoleErrorSpy.mockRestore();
    });

    describe('autocomplete', () => {
        it('should fetch autocomplete suggestions successfully', async () => {
            const query = 'sol r';
            const mockResponse = ['Sol Ring', 'Sol Talisman', 'Solar Blaze'];
            axiosInstance.get.mockResolvedValue({ data: mockResponse });

            const result = await ScryfallApi.autocomplete(query);

            expect(axiosInstance.get).toHaveBeenCalledWith('/scryfall/autocomplete', {
                params: { q: 'sol r' },
            });
            expect(result).toEqual(mockResponse);
        });

        it('should fetch autocomplete with filter', async () => {
            const query = 'lightning';
            const filter = 'type:creature';
            const mockResponse = ['Lightning Greaves', 'Lightning Bolt'];
            axiosInstance.get.mockResolvedValue({ data: mockResponse });

            const result = await ScryfallApi.autocomplete(query, filter);

            expect(axiosInstance.get).toHaveBeenCalledWith('/scryfall/autocomplete', {
                params: { q: 'lightning', filter: 'type:creature' },
            });
            expect(result).toEqual(mockResponse);
        });

        it('should return empty array for empty query', async () => {
            const result = await ScryfallApi.autocomplete('');

            expect(axiosInstance.get).not.toHaveBeenCalled();
            expect(result).toEqual([]);
        });

        it('should return empty array for null query', async () => {
            const result = await ScryfallApi.autocomplete(null);

            expect(axiosInstance.get).not.toHaveBeenCalled();
            expect(result).toEqual([]);
        });

        it('should return empty array for undefined query', async () => {
            const result = await ScryfallApi.autocomplete(undefined);

            expect(axiosInstance.get).not.toHaveBeenCalled();
            expect(result).toEqual([]);
        });

        it('should log error and throw on failure', async () => {
            const error = new Error('Network error');
            axiosInstance.get.mockRejectedValue(error);

            await expect(ScryfallApi.autocomplete('test')).rejects.toThrow(
                'Failed to fetch autocomplete suggestions.'
            );
            expect(consoleErrorSpy).toHaveBeenCalledWith(
                'Error fetching autocomplete suggestions from backend proxy:',
                error
            );
        });
    });

    describe('autocompleteWithPrices', () => {
        it('should fetch autocomplete with prices successfully', async () => {
            const query = 'sol r';
            const mockResponse = [
                { name: 'Sol Ring', price: 2.5 },
                { name: 'Sol Talisman', price: 0.25 },
            ];
            axiosInstance.get.mockResolvedValue({ data: mockResponse });

            const result = await ScryfallApi.autocompleteWithPrices(query);

            expect(axiosInstance.get).toHaveBeenCalledWith('/scryfall/autocomplete-with-prices', {
                params: { q: 'sol r' },
            });
            expect(result).toEqual(mockResponse);
        });

        it('should return empty array for empty query', async () => {
            const result = await ScryfallApi.autocompleteWithPrices('');

            expect(axiosInstance.get).not.toHaveBeenCalled();
            expect(result).toEqual([]);
        });

        it('should return empty array for null query', async () => {
            const result = await ScryfallApi.autocompleteWithPrices(null);

            expect(axiosInstance.get).not.toHaveBeenCalled();
            expect(result).toEqual([]);
        });

        it('should return empty array for undefined query', async () => {
            const result = await ScryfallApi.autocompleteWithPrices(undefined);

            expect(axiosInstance.get).not.toHaveBeenCalled();
            expect(result).toEqual([]);
        });

        it('should log error and throw on failure', async () => {
            const error = new Error('Network error');
            axiosInstance.get.mockRejectedValue(error);

            await expect(ScryfallApi.autocompleteWithPrices('test')).rejects.toThrow(
                'Failed to fetch autocomplete suggestions.'
            );
            expect(consoleErrorSpy).toHaveBeenCalledWith(
                'Error fetching autocomplete with prices from backend proxy:',
                error
            );
        });
    });

    describe('getCardByName', () => {
        it('should fetch card by name successfully', async () => {
            const cardName = 'Sol Ring';
            const mockCard = {
                name: 'Sol Ring',
                mana_cost: '{1}',
                type_line: 'Artifact',
                oracle_text: '{T}: Add {C}{C}.',
                prices: { usd: '2.50' },
            };
            axiosInstance.get.mockResolvedValue({ data: mockCard });

            const result = await ScryfallApi.getCardByName(cardName);

            expect(axiosInstance.get).toHaveBeenCalledWith('/scryfall/cards/named', {
                params: { exact: 'Sol Ring' },
            });
            expect(result).toEqual(mockCard);
        });

        it('should fetch card with special characters in name', async () => {
            const cardName = "Sensei's Divining Top";
            const mockCard = {
                name: "Sensei's Divining Top",
                type_line: 'Artifact',
            };
            axiosInstance.get.mockResolvedValue({ data: mockCard });

            const result = await ScryfallApi.getCardByName(cardName);

            expect(axiosInstance.get).toHaveBeenCalledWith('/scryfall/cards/named', {
                params: { exact: "Sensei's Divining Top" },
            });
            expect(result).toEqual(mockCard);
        });

        it('should log error and throw on failure', async () => {
            const error = new Error('Card not found');
            axiosInstance.get.mockRejectedValue(error);

            await expect(ScryfallApi.getCardByName('InvalidCard')).rejects.toThrow(
                'Failed to fetch card details.'
            );
            expect(consoleErrorSpy).toHaveBeenCalledWith(
                'Error fetching card details from backend proxy:',
                error
            );
        });
    });

    describe('getCardById', () => {
        it('should fetch card by ID successfully', async () => {
            const cardId = 'abc123-def456';
            const mockCard = {
                id: 'abc123-def456',
                name: 'Sol Ring',
                image_uris: {
                    small: 'https://example.com/small.jpg',
                    normal: 'https://example.com/normal.jpg',
                    large: 'https://example.com/large.jpg',
                },
            };
            axiosInstance.get.mockResolvedValue({ data: mockCard });

            const result = await ScryfallApi.getCardById(cardId);

            expect(axiosInstance.get).toHaveBeenCalledWith('/scryfall/cards/abc123-def456');
            expect(result).toEqual(mockCard);
        });

        it('should log error and throw on failure', async () => {
            const error = new Error('Card not found');
            axiosInstance.get.mockRejectedValue(error);

            await expect(ScryfallApi.getCardById('invalid-id')).rejects.toThrow(
                'Failed to fetch card by ID.'
            );
            expect(consoleErrorSpy).toHaveBeenCalledWith(
                'Error fetching card by ID from backend proxy:',
                error
            );
        });
    });

    describe('getCheapestPrinting', () => {
        it('should fetch cheapest printing successfully', async () => {
            const cardName = 'Sol Ring';
            const mockPrinting = {
                name: 'Sol Ring',
                set: 'Commander 2020',
                price: 1.5,
                image_uris: {
                    normal: 'https://example.com/cheapest.jpg',
                },
            };
            axiosInstance.get.mockResolvedValue({ data: mockPrinting });

            const result = await ScryfallApi.getCheapestPrinting(cardName);

            expect(axiosInstance.get).toHaveBeenCalledWith('/scryfall/cards/cheapest', {
                params: { name: 'Sol Ring' },
            });
            expect(result).toEqual(mockPrinting);
        });

        it('should fetch cheapest printing for card with special characters', async () => {
            const cardName = "Sensei's Divining Top";
            const mockPrinting = {
                name: "Sensei's Divining Top",
                set: 'Champions of Kamigawa',
                price: 25.0,
            };
            axiosInstance.get.mockResolvedValue({ data: mockPrinting });

            const result = await ScryfallApi.getCheapestPrinting(cardName);

            expect(axiosInstance.get).toHaveBeenCalledWith('/scryfall/cards/cheapest', {
                params: { name: "Sensei's Divining Top" },
            });
            expect(result).toEqual(mockPrinting);
        });

        it('should log error and throw on failure', async () => {
            const error = new Error('Card not found');
            axiosInstance.get.mockRejectedValue(error);

            await expect(ScryfallApi.getCheapestPrinting('InvalidCard')).rejects.toThrow(
                'Failed to fetch cheapest printing.'
            );
            expect(consoleErrorSpy).toHaveBeenCalledWith(
                'Error fetching cheapest printing:',
                error
            );
        });
    });
});
