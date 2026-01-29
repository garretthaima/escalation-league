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
import { validateAndCacheDeck, priceCheckDeck } from '../decksApi';

describe('decksApi', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('validateAndCacheDeck', () => {
        it('should validate and cache deck successfully', async () => {
            const userData = {
                deckUrl: 'https://moxfield.com/decks/abc123',
                format: 'commander',
            };
            const mockResponse = {
                valid: true,
                deckId: 'abc123',
                commander: 'Kenrith, the Returned King',
                cardCount: 100,
            };
            axiosInstance.post.mockResolvedValue({ data: mockResponse });

            const result = await validateAndCacheDeck(userData);

            expect(axiosInstance.post).toHaveBeenCalledWith('/decks/validate', userData);
            expect(result).toEqual(mockResponse);
        });

        it('should return validation errors for invalid deck', async () => {
            const userData = {
                deckUrl: 'https://moxfield.com/decks/invalid',
                format: 'commander',
            };
            const mockResponse = {
                valid: false,
                errors: ['Deck must contain exactly 100 cards'],
            };
            axiosInstance.post.mockResolvedValue({ data: mockResponse });

            const result = await validateAndCacheDeck(userData);

            expect(axiosInstance.post).toHaveBeenCalledWith('/decks/validate', userData);
            expect(result).toEqual(mockResponse);
        });

        it('should propagate errors', async () => {
            const error = new Error('Failed to validate deck');
            axiosInstance.post.mockRejectedValue(error);

            await expect(validateAndCacheDeck({})).rejects.toThrow('Failed to validate deck');
        });
    });

    describe('priceCheckDeck', () => {
        it('should price check a deck successfully', async () => {
            const deckId = 'abc123';
            const mockResponse = {
                deckId: 'abc123',
                totalPrice: 125.5,
                cards: [
                    { name: 'Sol Ring', price: 2.5 },
                    { name: 'Command Tower', price: 0.5 },
                ],
            };
            axiosInstance.post.mockResolvedValue({ data: mockResponse });

            const result = await priceCheckDeck(deckId);

            expect(axiosInstance.post).toHaveBeenCalledWith('/decks/price-check', {
                deckId: 'abc123',
            });
            expect(result).toEqual(mockResponse);
        });

        it('should propagate errors', async () => {
            const error = new Error('Deck not found');
            axiosInstance.post.mockRejectedValue(error);

            await expect(priceCheckDeck('invalid')).rejects.toThrow('Deck not found');
        });
    });
});
