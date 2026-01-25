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
import {
    getBudget,
    createBudget,
    updateBudget,
    getBudgetCards,
    addCardToBudget,
    updateBudgetCard,
    removeCardFromBudget,
    refreshCardPrices,
    getBudgetSummary,
} from '../budgetApi';

describe('budgetApi', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('getBudget', () => {
        it('should fetch budget for a league successfully', async () => {
            const leagueId = 1;
            const mockBudget = {
                id: 100,
                leagueId: 1,
                totalBudget: 100,
                remainingBudget: 75.5,
            };
            axiosInstance.get.mockResolvedValue({ data: mockBudget });

            const result = await getBudget(leagueId);

            expect(axiosInstance.get).toHaveBeenCalledWith('/budgets/league/1');
            expect(result).toEqual(mockBudget);
        });

        it('should propagate errors', async () => {
            const error = new Error('Budget not found');
            axiosInstance.get.mockRejectedValue(error);

            await expect(getBudget(999)).rejects.toThrow('Budget not found');
        });
    });

    describe('createBudget', () => {
        it('should create budget for a league successfully', async () => {
            const leagueId = 2;
            const mockBudget = {
                id: 101,
                leagueId: 2,
                totalBudget: 100,
                remainingBudget: 100,
            };
            axiosInstance.post.mockResolvedValue({ data: mockBudget });

            const result = await createBudget(leagueId);

            expect(axiosInstance.post).toHaveBeenCalledWith('/budgets/league/2');
            expect(result).toEqual(mockBudget);
        });

        it('should propagate errors', async () => {
            const error = new Error('Failed to create budget');
            axiosInstance.post.mockRejectedValue(error);

            await expect(createBudget(1)).rejects.toThrow('Failed to create budget');
        });
    });

    describe('updateBudget', () => {
        it('should update budget successfully', async () => {
            const budgetId = 100;
            const budgetData = { totalBudget: 150 };
            const mockResponse = {
                id: 100,
                totalBudget: 150,
                remainingBudget: 125,
            };
            axiosInstance.put.mockResolvedValue({ data: mockResponse });

            const result = await updateBudget(budgetId, budgetData);

            expect(axiosInstance.put).toHaveBeenCalledWith('/budgets/100', budgetData);
            expect(result).toEqual(mockResponse);
        });

        it('should propagate errors', async () => {
            const error = new Error('Failed to update budget');
            axiosInstance.put.mockRejectedValue(error);

            await expect(updateBudget(1, {})).rejects.toThrow('Failed to update budget');
        });
    });

    describe('getBudgetCards', () => {
        it('should fetch cards in budget successfully', async () => {
            const budgetId = 100;
            const mockCards = [
                { id: 1, name: 'Sol Ring', price: 2.5 },
                { id: 2, name: 'Command Tower', price: 0.5 },
            ];
            axiosInstance.get.mockResolvedValue({ data: mockCards });

            const result = await getBudgetCards(budgetId);

            expect(axiosInstance.get).toHaveBeenCalledWith('/budgets/100/cards');
            expect(result).toEqual(mockCards);
        });

        it('should propagate errors', async () => {
            const error = new Error('Failed to fetch cards');
            axiosInstance.get.mockRejectedValue(error);

            await expect(getBudgetCards(1)).rejects.toThrow('Failed to fetch cards');
        });
    });

    describe('addCardToBudget', () => {
        it('should add card to budget successfully', async () => {
            const budgetId = 100;
            const cardData = { name: 'Lightning Greaves', price: 5.0, quantity: 1 };
            const mockResponse = {
                id: 3,
                name: 'Lightning Greaves',
                price: 5.0,
                quantity: 1,
            };
            axiosInstance.post.mockResolvedValue({ data: mockResponse });

            const result = await addCardToBudget(budgetId, cardData);

            expect(axiosInstance.post).toHaveBeenCalledWith('/budgets/100/cards', cardData);
            expect(result).toEqual(mockResponse);
        });

        it('should propagate errors', async () => {
            const error = new Error('Failed to add card');
            axiosInstance.post.mockRejectedValue(error);

            await expect(addCardToBudget(1, {})).rejects.toThrow('Failed to add card');
        });
    });

    describe('updateBudgetCard', () => {
        it('should update card in budget successfully', async () => {
            const budgetId = 100;
            const cardId = 3;
            const cardData = { quantity: 2 };
            const mockResponse = {
                id: 3,
                name: 'Lightning Greaves',
                price: 5.0,
                quantity: 2,
            };
            axiosInstance.put.mockResolvedValue({ data: mockResponse });

            const result = await updateBudgetCard(budgetId, cardId, cardData);

            expect(axiosInstance.put).toHaveBeenCalledWith('/budgets/100/cards/3', cardData);
            expect(result).toEqual(mockResponse);
        });

        it('should propagate errors', async () => {
            const error = new Error('Failed to update card');
            axiosInstance.put.mockRejectedValue(error);

            await expect(updateBudgetCard(1, 1, {})).rejects.toThrow('Failed to update card');
        });
    });

    describe('removeCardFromBudget', () => {
        it('should remove card from budget successfully', async () => {
            const budgetId = 100;
            const cardId = 3;
            const mockResponse = { message: 'Card removed' };
            axiosInstance.delete.mockResolvedValue({ data: mockResponse });

            const result = await removeCardFromBudget(budgetId, cardId);

            expect(axiosInstance.delete).toHaveBeenCalledWith('/budgets/100/cards/3');
            expect(result).toEqual(mockResponse);
        });

        it('should propagate errors', async () => {
            const error = new Error('Failed to remove card');
            axiosInstance.delete.mockRejectedValue(error);

            await expect(removeCardFromBudget(1, 1)).rejects.toThrow('Failed to remove card');
        });
    });

    describe('refreshCardPrices', () => {
        it('should refresh card prices successfully', async () => {
            const budgetId = 100;
            const mockResponse = {
                message: 'Prices refreshed',
                updatedCards: 5,
            };
            axiosInstance.post.mockResolvedValue({ data: mockResponse });

            const result = await refreshCardPrices(budgetId);

            expect(axiosInstance.post).toHaveBeenCalledWith('/budgets/100/refresh-prices');
            expect(result).toEqual(mockResponse);
        });

        it('should propagate errors', async () => {
            const error = new Error('Failed to refresh prices');
            axiosInstance.post.mockRejectedValue(error);

            await expect(refreshCardPrices(1)).rejects.toThrow('Failed to refresh prices');
        });
    });

    describe('getBudgetSummary', () => {
        it('should fetch budget summary successfully', async () => {
            const budgetId = 100;
            const mockSummary = {
                totalSpent: 24.5,
                remainingBudget: 75.5,
                cardCount: 10,
                weeklyChanges: [
                    { week: 1, spent: 10 },
                    { week: 2, spent: 14.5 },
                ],
            };
            axiosInstance.get.mockResolvedValue({ data: mockSummary });

            const result = await getBudgetSummary(budgetId);

            expect(axiosInstance.get).toHaveBeenCalledWith('/budgets/100/summary');
            expect(result).toEqual(mockSummary);
        });

        it('should propagate errors', async () => {
            const error = new Error('Failed to fetch summary');
            axiosInstance.get.mockRejectedValue(error);

            await expect(getBudgetSummary(1)).rejects.toThrow('Failed to fetch summary');
        });
    });
});
