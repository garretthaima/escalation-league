const db = require('./testDb');

async function createTestLeague(overrides = {}) {
    const [leagueId] = await db('leagues').insert({
        name: 'Test League',
        start_date: '2025-01-01',
        end_date: '2025-12-31',
        description: 'A test league',
        max_players: 20,
        weekly_budget: 100,
        is_active: false,
        current_week: 1,
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