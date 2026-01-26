/**
 * Budget calculation utilities for the Escalation League
 *
 * Budget rules:
 * - Week 1 is like week 0 (no budget accumulated yet)
 * - Budget accumulates each week starting from week 2
 */

/**
 * Calculate number of weeks from start and end dates
 * @param {string} startDate - League start date
 * @param {string} endDate - League end date
 * @returns {number} Number of weeks in the league
 */
export const calculateWeeksFromDates = (startDate, endDate) => {
    if (!startDate || !endDate) return 8; // Default fallback
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffMs = end - start;
    const diffDays = diffMs / (1000 * 60 * 60 * 24);
    return Math.ceil(diffDays / 7);
};

/**
 * Calculate the budget accumulated by the current week
 * @param {number} currentWeek - The current week number (1-indexed)
 * @param {number} weeklyBudget - The budget added each week
 * @returns {number} Budget accumulated so far
 */
export const calculateBudgetAccumulated = (currentWeek, weeklyBudget) => {
    const week = currentWeek || 1;
    const budget = weeklyBudget || 0;
    // Week 1 = 0 budget, Week 2 = 1 * budget, Week 3 = 2 * budget, etc.
    return (week - 1) * budget;
};

/**
 * Calculate the total season budget (max budget available for the entire season)
 * @param {number} totalWeeks - Total number of weeks in the season
 * @param {number} weeklyBudget - The budget added each week
 * @returns {number} Total season budget
 */
export const calculateTotalSeasonBudget = (totalWeeks, weeklyBudget) => {
    const weeks = totalWeeks || 8;
    const budget = weeklyBudget || 0;
    // Total = (weeks - 1) * budget (since week 1 has no budget)
    return (weeks - 1) * budget;
};

/**
 * Calculate remaining budget from accumulated
 * @param {number} budgetAccumulated - Total budget accumulated so far
 * @param {number} budgetUsed - Budget already spent
 * @returns {number} Remaining budget
 */
export const calculateRemainingBudget = (budgetAccumulated, budgetUsed) => {
    return (budgetAccumulated || 0) - (budgetUsed || 0);
};

/**
 * Get all budget values for a league
 * @param {Object} league - League object with current_week, weekly_budget, and either number_of_weeks or start_date/end_date
 * @param {number} budgetUsed - Budget already spent (optional)
 * @returns {Object} Object containing all calculated budget values
 */
export const getBudgetSummary = (league, budgetUsed = 0) => {
    const currentWeek = league?.current_week || 1;
    const weeklyBudget = league?.weekly_budget || 0;
    // Use number_of_weeks if available, otherwise calculate from dates
    const totalWeeks = league?.number_of_weeks || calculateWeeksFromDates(league?.start_date, league?.end_date);

    const budgetAccumulated = calculateBudgetAccumulated(currentWeek, weeklyBudget);
    const totalSeasonBudget = calculateTotalSeasonBudget(totalWeeks, weeklyBudget);
    const remaining = calculateRemainingBudget(budgetAccumulated, budgetUsed);

    return {
        currentWeek,
        weeklyBudget,
        totalWeeks,
        budgetAccumulated,
        totalSeasonBudget,
        budgetUsed,
        remaining,
    };
};
