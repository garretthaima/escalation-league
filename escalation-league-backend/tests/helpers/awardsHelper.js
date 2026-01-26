const db = require('./testDb');

async function createTestAward(overrides = {}) {
    const [awardId] = await db('awards').insert({
        name: overrides.name || `Award-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        description: overrides.description || 'Test award description',
        ...overrides
    });

    return awardId;
}

async function grantAwardToUser(userId, awardId, leagueId, overrides = {}) {
    const [id] = await db('user_awards').insert({
        user_id: userId,
        award_id: awardId,
        league_id: leagueId,
        ...overrides
    });

    return id;
}

async function getUserAwards(userId) {
    return await db('user_awards')
        .join('awards', 'user_awards.award_id', 'awards.id')
        .where('user_awards.user_id', userId)
        .select('awards.*', 'user_awards.awarded_at', 'user_awards.league_id');
}

async function revokeUserAward(userAwardId) {
    return await db('user_awards')
        .where({ id: userAwardId })
        .del();
}

module.exports = {
    createTestAward,
    grantAwardToUser,
    getUserAwards,
    revokeUserAward
};
