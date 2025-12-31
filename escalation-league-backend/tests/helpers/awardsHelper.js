const { db } = require('./testDb');

async function createTestAward(overrides = {}) {
    const [awardId] = await db('awards').insert({
        name: overrides.name || `Award-${Date.now()}`,
        description: overrides.description || 'Test award description',
        icon_url: overrides.iconUrl || 'https://example.com/icon.png',
        criteria: overrides.criteria || 'Test criteria',
        created_at: overrides.createdAt || db.fn.now(),
        ...overrides
    });

    return awardId;
}

async function grantAwardToUser(userId, awardId, overrides = {}) {
    const [id] = await db('user_awards').insert({
        user_id: userId,
        award_id: awardId,
        awarded_at: overrides.awardedAt || db.fn.now(),
        reason: overrides.reason || null,
        ...overrides
    });

    return id;
}

async function getUserAwards(userId) {
    return await db('user_awards')
        .join('awards', 'user_awards.award_id', 'awards.id')
        .where('user_awards.user_id', userId)
        .select('awards.*', 'user_awards.awarded_at', 'user_awards.reason');
}

async function revokeUserAward(userId, awardId) {
    return await db('user_awards')
        .where({ user_id: userId, award_id: awardId })
        .del();
}

module.exports = {
    createTestAward,
    grantAwardToUser,
    getUserAwards,
    revokeUserAward
};