const db = require('../config/dbConfig');

const createGame = (creatorId, result, date, winCondition) => {
    return new Promise((resolve, reject) => {
        db.run(
            `INSERT INTO games (creator_id, result, date, win_condition) VALUES (?, ?, ?, ?)`,
            [creatorId, result, date, winCondition],
            function (err) {
                if (err) reject(err);
                else resolve(this.lastID);
            }
        );
    });
};

const getGameById = (id) => {
    return new Promise((resolve, reject) => {
        db.get(`SELECT * FROM games WHERE id = ?`, [id], (err, row) => {
            if (err) reject(err);
            else resolve(row);
        });
    });
};

module.exports = { createGame, getGameById };