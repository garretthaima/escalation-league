const db = require('../models/db');

// Fetch a game or pod by ID
const getById = async (table, id) => {
    return db(table).where({ id }).first();
};

// Fetch participants for a game or pod
const getParticipants = async (table, id) => {
    return db('game_players as gp')
        .join('users as u', 'gp.player_id', 'u.id')
        .select('u.id as player_id', 'u.username')
        .where(`gp.${table}_id`, id);
};

// Update a game or pod
const updateById = async (table, id, updates) => {
    return db(table).where({ id }).update(updates);
};

// Soft delete a game or pod
const deleteById = async (table, id) => {
    return db(table).where({ id }).update({ deleted_at: db.fn.now() });
};

module.exports = {
    getById,
    getParticipants,
    updateById,
    deleteById,
};