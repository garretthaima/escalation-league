import axiosInstance from './axiosConfig';

// Get budget for user in a league
export const getBudget = async (leagueId) => {
    const response = await axiosInstance.get(`/budgets/league/${leagueId}`);
    return response.data;
};

// Create budget for user in a league
export const createBudget = async (leagueId) => {
    const response = await axiosInstance.post(`/budgets/league/${leagueId}`);
    return response.data;
};

// Update budget (admin only)
export const updateBudget = async (budgetId, budgetData) => {
    const response = await axiosInstance.put(`/budgets/${budgetId}`, budgetData);
    return response.data;
};

// Get all cards in budget
export const getBudgetCards = async (budgetId) => {
    const response = await axiosInstance.get(`/budgets/${budgetId}/cards`);
    return response.data;
};

// Add card to budget
export const addCardToBudget = async (budgetId, cardData) => {
    const response = await axiosInstance.post(`/budgets/${budgetId}/cards`, cardData);
    return response.data;
};

// Update card in budget
export const updateBudgetCard = async (budgetId, cardId, cardData) => {
    const response = await axiosInstance.put(`/budgets/${budgetId}/cards/${cardId}`, cardData);
    return response.data;
};

// Remove card from budget
export const removeCardFromBudget = async (budgetId, cardId) => {
    const response = await axiosInstance.delete(`/budgets/${budgetId}/cards/${cardId}`);
    return response.data;
};

// Refresh card prices
export const refreshCardPrices = async (budgetId) => {
    const response = await axiosInstance.post(`/budgets/${budgetId}/refresh-prices`);
    return response.data;
};

// Get weekly budget summary
export const getBudgetSummary = async (budgetId) => {
    const response = await axiosInstance.get(`/budgets/${budgetId}/summary`);
    return response.data;
};
