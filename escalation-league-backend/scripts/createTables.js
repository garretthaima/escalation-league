const db = require('../config/dbConfig');

const createTables = async () => {
    try {
        console.log('Creating tables...');

        await db.query(`
            CREATE TABLE IF NOT EXISTS users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                username VARCHAR(255) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                wins INT DEFAULT 0,
                losses INT DEFAULT 0
            )
        `);

        await db.query(`
            CREATE TABLE IF NOT EXISTS games (
                id INT AUTO_INCREMENT PRIMARY KEY,
                creator_id INT NOT NULL,
                result ENUM('win', 'loss') NOT NULL,
                date DATE NOT NULL,
                win_condition VARCHAR(255) NOT NULL,
                FOREIGN KEY (creator_id) REFERENCES users(id)
            )
        `);

        await db.query(`
            CREATE TABLE IF NOT EXISTS game_players (
                id INT AUTO_INCREMENT PRIMARY KEY,
                game_id INT NOT NULL,
                player_id INT NOT NULL,
                confirmed BOOLEAN DEFAULT FALSE,
                FOREIGN KEY (game_id) REFERENCES games(id),
                FOREIGN KEY (player_id) REFERENCES users(id)
            )
        `);

        await db.query(`
            CREATE TABLE IF NOT EXISTS leagues (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                start_date DATE NOT NULL,
                end_date DATE NOT NULL,
                current_week INT DEFAULT 1,
                money_accumulated DECIMAL(10, 2) DEFAULT 0.00,
                is_active BOOLEAN DEFAULT FALSE
            )
        `);

        console.log('Tables created successfully.');
    } catch (err) {
        console.error('Error creating tables:', err.message);
    } finally {
        db.end();
    }
};

module.exports = createTables; // Ensure this is a default export