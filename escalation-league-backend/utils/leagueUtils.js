/**
 * Get the Thursday 6pm cutoff time for a given week start date
 * @param {Date} weekStart - The start of the week (league start day)
 * @param {number} leagueStartDay - Day of week the league started (0=Sun, 1=Mon, etc.)
 * @returns {Date} Thursday 6pm of that week
 */
function getThursdayCutoff(weekStart, leagueStartDay) {
    // Calculate days from week start to Thursday
    let thursdayOffset = (4 - leagueStartDay + 7) % 7;

    // If league starts on Friday/Saturday/Sunday, Thursday is later in the week
    if (leagueStartDay === 0) thursdayOffset = 4; // Sunday -> Thursday is 4 days
    else if (leagueStartDay === 5) thursdayOffset = 6; // Friday -> Thursday is 6 days
    else if (leagueStartDay === 6) thursdayOffset = 5; // Saturday -> Thursday is 5 days

    const thursday6pm = new Date(weekStart);
    thursday6pm.setDate(weekStart.getDate() + thursdayOffset);
    thursday6pm.setHours(18, 0, 0, 0);

    return thursday6pm;
}

/**
 * Calculate the current week of a league based on start_date
 * Week advances on Thursday at 6pm, not on the calendar week boundary
 * @param {Date|string} startDate - League start date
 * @param {Date|string} endDate - League end date (optional, for bounds checking)
 * @returns {number} Current week number (1-based)
 */
function calculateCurrentWeek(startDate, endDate = null) {
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    const now = new Date();

    // If league hasn't started yet, return week 1
    if (now < start) {
        return 1;
    }

    const leagueStartDay = start.getDay();

    // Find which week we're in by checking Thursday 6pm boundaries
    // Week 1 ends at the first Thursday 6pm after start
    // Week 2 ends at the second Thursday 6pm, etc.

    let week = 1;
    let weekStart = new Date(start);

    while (true) {
        const thursdayCutoff = getThursdayCutoff(weekStart, leagueStartDay);

        if (now < thursdayCutoff) {
            // We're before this week's Thursday 6pm cutoff
            break;
        }

        // Move to next week
        week++;
        weekStart.setDate(weekStart.getDate() + 7);

        // Safety: don't loop forever (max 52 weeks)
        if (week > 52) break;
    }

    // Cap at max week if league has ended
    if (endDate) {
        const maxWeek = calculateMaxWeek(startDate, endDate);
        return Math.min(week, maxWeek);
    }

    return week;
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
 * With the Thursday 6pm week boundary, adds are NEVER locked
 * (the week simply advances when Thursday 6pm arrives)
 * @param {Date|string} startDate - League start date
 * @param {Date|string} endDate - League end date
 * @returns {boolean} Always returns false - adds are never locked
 */
function areAddsLocked(startDate, endDate) {
    // With Thursday 6pm as the week boundary, adds are never locked
    // The week simply advances and new budget becomes available
    return false;
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

/**
 * Get the Thursday game night date for the current week of a league
 * @param {Date|string} startDate - League start date
 * @returns {Date} The Thursday date for the current game week
 */
function getCurrentThursday(startDate) {
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    const now = new Date();

    const leagueStartDay = start.getDay();

    // If league hasn't started, return the first Thursday
    if (now < start) {
        const firstThursday = getThursdayCutoff(start, leagueStartDay);
        firstThursday.setHours(0, 0, 0, 0);
        return firstThursday;
    }

    // Find the current week's Thursday
    let weekStart = new Date(start);
    let currentThursday = getThursdayCutoff(weekStart, leagueStartDay);

    while (true) {
        const nextWeekStart = new Date(weekStart);
        nextWeekStart.setDate(nextWeekStart.getDate() + 7);
        const nextThursday = getThursdayCutoff(nextWeekStart, leagueStartDay);

        // If we're past this Thursday's cutoff but before next Thursday's cutoff
        // then next Thursday is our game night
        if (now >= currentThursday && now < nextThursday) {
            // Return the upcoming Thursday if we're past this week's game time
            // Otherwise return this week's Thursday
            const todayDate = now.toISOString().split('T')[0];
            const currentThursdayDate = currentThursday.toISOString().split('T')[0];

            if (todayDate === currentThursdayDate || now < currentThursday) {
                currentThursday.setHours(0, 0, 0, 0);
                return currentThursday;
            } else {
                nextThursday.setHours(0, 0, 0, 0);
                return nextThursday;
            }
        }

        weekStart = nextWeekStart;
        currentThursday = nextThursday;

        // Safety: don't loop forever
        if (weekStart > new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000)) break;
    }

    currentThursday.setHours(0, 0, 0, 0);
    return currentThursday;
}

/**
 * Get the session date for a league (the Thursday of the current game week)
 * Returns today's date if it's Thursday, otherwise the next Thursday
 * @param {Date|string} startDate - League start date
 * @returns {string} Date string in YYYY-MM-DD format
 */
function getGameNightDate(startDate) {
    const now = new Date();
    const today = now.getDay(); // 0=Sun, 4=Thu

    // If today is Thursday, use today
    if (today === 4) {
        return now.toISOString().split('T')[0];
    }

    // Otherwise use the league's calculated Thursday
    const thursday = getCurrentThursday(startDate);
    return thursday.toISOString().split('T')[0];
}

module.exports = {
    calculateCurrentWeek,
    calculateMaxWeek,
    areAddsLocked,
    addCalculatedWeek,
    getCurrentThursday,
    getGameNightDate
};
