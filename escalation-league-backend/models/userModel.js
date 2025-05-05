const db = require('../config/dbConfig');
 
const createUser = (username, password) => {
    return new Promise((resolve, reject) => {
        db.run(
            `INSERT INTO users (username, password) VALUES (?, ?)`,
            [username, password],
            function (err) {
                if (err) reject(err);
                else resolve(this.lastID);
            }
        );
    });
};

const getUserById = (id) => {
    return new Promise((resolve, reject) => {
        db.get(`SELECT * FROM users WHERE id = ?`, [id], (err, row) => {
            if (err) reject(err);
            else resolve(row);
        });
    });
};

const getAllUsers = () => {
    return new Promise((resolve, reject) => {
        db.all(`SELECT * FROM users`, [], (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
};

module.exports = { createUser, getUserById, getAllUsers };