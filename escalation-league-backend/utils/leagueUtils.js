/**
 * Calculate the current week of a league based on start_date
 * @param {Date|string} startDate - League start date
 * @param {Date|string} endDate - League end date (optional, for bounds checking)
 * @returns {number} Current week number (1-based)
 */
function calculateCurrentWeek(startDate, endDate = null) {
    const start = new Date(startDate);
    const today = new Date();

    // If league hasn't started yet, return week 1
    if (today < start) {
        return 1;
    }

    // Calculate days since start
    const daysDiff = Math.floor((today - start) / (1000 * 60 * 60 * 24));
    const week = Math.floor(daysDiff / 7) + 1;

    // If end_date provided and league has ended, cap at final week
    if (endDate) {
        const end = new Date(endDate);
        if (today > end) {
            const totalDays = Math.floor((end - start) / (1000 * 60 * 60 * 24));
            const maxWeek = Math.floor(totalDays / 7) + 1;
            return Math.max(1, maxWeek);
        }
    }

    return Math.max(1, week);
}

/**
 * Calculate the maximum week number for a league
 * @param {Date|string} startDate - League start date
 * @param {Date|string} endDate - League end date
 * @returns {number} Maximum week number
 */
function calculateMaxWeek(startDate, endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const totalDays = Math.floor((end - start) / (1000 * 60 * 60 * 24));
    return Math.max(1, Math.floor(totalDays / 7) + 1);
}

/**
 * Check if card adds are currently locked for the league
 * Adds are locked after Thursday 6pm each week, except during the final week
 * @param {Date|string} startDate - League start date
 * @param {Date|string} endDate - League end date
 * @returns {boolean} True if adds are locked
 */
function areAddsLocked(startDate, endDate) {
    const start = new Date(startDate);

    // Get current time in EST (UTC-5)
    const now = new Date();
    const estOffset = -5 * 60; // EST is UTC-5 in minutes
    const nowEST = new Date(now.getTime() + (now.getTimezoneOffset() + estOffset) * 60000);

    // Calculate current week and max week
    const currentWeek = calculateCurrentWeek(startDate, endDate);
    const maxWeek = calculateMaxWeek(startDate, endDate);

    // Final week: adds never locked
    if (currentWeek >= maxWeek) {
        return false;
    }

    // Calculate the start of the current week
    const daysSinceStart = Math.floor((nowEST - start) / (1000 * 60 * 60 * 24));
    const daysIntoCurrentWeek = daysSinceStart % 7;
    const currentWeekStart = new Date(start);
    currentWeekStart.setDate(start.getDate() + (daysSinceStart - daysIntoCurrentWeek));

    // Calculate Thursday 6pm EST of current week
    const leagueStartDay = start.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const thursdayOffset = (4 - leagueStartDay + 7) % 7; // Days until Thursday from league start day

    const thursday6pmEST = new Date(currentWeekStart);
    thursday6pmEST.setDate(currentWeekStart.getDate() + thursdayOffset);
    thursday6pmEST.setHours(18, 0, 0, 0); // 6pm EST

    // Adds are locked if we're past Thursday 6pm EST
    return nowEST >= thursday6pmEST;
}

/**
 * Add calculated current_week to league object
 * @param {Object} league - League object from database
 * @returns {Object} League object with current_week calculated
 */
function addCalculatedWeek(league) {
    if (!league) return league;

    return {
        ...league,
        current_week: calculateCurrentWeek(league.start_date, league.end_date)
    };
}

module.exports = {
    calculateCurrentWeek,
    calculateMaxWeek,
    areAddsLocked,
    addCalculatedWeek
};
