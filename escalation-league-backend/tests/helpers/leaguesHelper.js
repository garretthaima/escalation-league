const db = require('./testDb');

async function createTestLeague(overrides = {}) {
    // Use current date as default so calculated week is realistic
    const today = new Date();
    const startDate = new Date(today);
    startDate.setDate(today.getDate() - 7); // Start 1 week ago (week 2)
    const endDate = new Date(today);
    endDate.setMonth(today.getMonth() + 6); // End in 6 months

    const [leagueId] = await db('leagues').insert({
        name: 'Test League',
        start_date: startDate.toISOString().split('T')[0],
        end_date: endDate.toISOString().split('T')[0],
        description: 'A test league',
        max_players: 20,
        weekly_budget: 100,
        is_active: false,
        current_week: 1, // This column is now ignored, week is calculated
        ...overrides
    });

    return leagueId;
}

async function addUserToLeague(userId, leagueId, overrides = {}) {
    const [id] = await db('user_leagues').insert({
        user_id: userId,
        league_id: leagueId,
        is_active: true,
        league_wins: 0,
        league_losses: 0,
        league_draws: 0,
        ...overrides
    });

    return id;
}

async function createSignupRequest(userId, leagueId, status = 'pending') {
    const [id] = await db('league_signup_requests').insert({
        user_id: userId,
        league_id: leagueId,
        status
    });

    return id;
}

module.exports = {
    createTestLeague,
    addUserToLeague,
    createSignupRequest
};