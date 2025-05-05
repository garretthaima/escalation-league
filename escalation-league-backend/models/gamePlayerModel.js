const db = require('../config/dbConfig');

const addPlayerToGame = (gameId, playerId, confirmed = 0) => {
    return new Promise((resolve, reject) => {
        db.run(
            `INSERT INTO game_players (game_id, player_id, confirmed) VALUES (?, ?, ?)`,
            [gameId, playerId, confirmed],
            function (err) {
                if (err) reject(err);
                else resolve(this.lastID);
            }
        );
    });
};

const getPlayersByGameId = (gameId) => {
    return new Promise((resolve, reject) => {
        db.all(
            `SELECT * FROM game_players WHERE game_id = ?`,
            [gameId],
            (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            }
        );
    });
};

module.exports = { addPlayerToGame, getPlayersByGameId };