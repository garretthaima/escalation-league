const db = require('./testDb');

async function createTestPod(leagueId, creatorId, overrides = {}) {
    const [podId] = await db('game_pods').insert({
        league_id: leagueId,
        creator_id: creatorId,
        status: overrides.status || 'active',
        confirmation_status: overrides.confirmation_status || 'open',
        result: overrides.result || null,
        win_condition_id: overrides.win_condition_id || null,
        deleted_at: overrides.deleted_at || null,
        created_at: overrides.created_at || db.fn.now(),
        ...overrides
    });

    return podId;
}

async function addPlayerToPod(podId, playerId, overrides = {}) {
    const [id] = await db('game_players').insert({
        pod_id: podId,
        player_id: playerId,
        confirmed: overrides.confirmed || 0,
        turn_order: overrides.turnOrder || null,
        result: overrides.result || null,
        confirmation_time: overrides.confirmationTime || null,
        ...overrides
    });

    return id;
}

async function removePlayerFromPod(podId, playerId) {
    return await db('game_players')
        .where({ pod_id: podId, player_id: playerId })
        .del();
}

async function confirmPodResult(podId, playerId) {
    return await db('game_players')
        .where({ pod_id: podId, player_id: playerId })
        .update({
            confirmed: 1,
            confirmation_time: db.fn.now()
        });
}

async function setPodWinner(podId, winnerId, winConditionId) {
    await db('game_pods')
        .where('id', podId)
        .update({
            result: 'completed',
            win_condition_id: winConditionId
        });

    // Mark winner in game_players
    await db('game_players')
        .where({ pod_id: podId, player_id: winnerId })
        .update({ result: 'winner' });

    // Mark others as losers
    await db('game_players')
        .where('pod_id', podId)
        .whereNot('player_id', winnerId)
        .update({ result: 'loser' });
}

async function completePod(podId) {
    return await db('game_pods')
        .where('id', podId)
        .update({
            status: 'completed',
            confirmation_status: 'complete'
        });
}

async function getPodPlayers(podId) {
    return await db('game_players')
        .where('pod_id', podId)
        .select('*');
}

module.exports = {
    createTestPod,
    addPlayerToPod,
    removePlayerFromPod,
    confirmPodResult,
    setPodWinner,
    completePod,
    getPodPlayers
};