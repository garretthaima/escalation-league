const { db } = require('./testDb');

async function createWinCondition(overrides = {}) {
    const [id] = await db('win_conditions').insert({
        name: overrides.name || `Win Condition ${Date.now()}`,
        description: overrides.description || 'Test win condition',
        points: overrides.points || 3,
        created_at: overrides.createdAt || db.fn.now(),
        ...overrides
    });

    return id;
}

async function getWinConditionByName(name) {
    return await db('win_conditions')
        .where('name', name)
        .first();
}

async function getAllWinConditions() {
    return await db('win_conditions').select('*');
}

module.exports = {
    createWinCondition,
    getWinConditionByName,
    getAllWinConditions
};