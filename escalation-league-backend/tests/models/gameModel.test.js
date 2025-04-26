const sqlite3 = require('sqlite3').verbose();
const { createGame, getGameById } = require('../../models/gameModel');

// Use an in-memory database for testing
const testDbPath = ':memory:';
let db;

beforeAll((done) => {
    db = new sqlite3.Database(testDbPath, (err) => {
        if (err) throw err;

        // Create the games table for testing
        db.run(
            `CREATE TABLE games (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                creator_id INTEGER NOT NULL,
                result TEXT NOT NULL,
                date TEXT NOT NULL
            )`,
            done
        );
    });
});

beforeEach(() => {
    return new Promise((resolve, reject) => {
        db.run(`DELETE FROM games`, (err) => {
            if (err) reject(err);
            else resolve();
        });
    });
});

afterAll(() => {
    return new Promise((resolve, reject) => {
        db.close((err) => {
            if (err) reject(err);
            else resolve();
        });
    });
});

describe('gameModel.js', () => {
    it('should create a game and return its ID', async () => {
        const creatorId = 1;
        const result = 'win';
        const date = '2025-04-24';

        const gameId = await createGame(creatorId, result, date);
        expect(gameId).toBeGreaterThan(0);

        // Verify the game was inserted into the database
        const row = await new Promise((resolve, reject) => {
            db.get(`SELECT * FROM games WHERE id = ?`, [gameId], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });

        expect(row).not.toBeNull(); // Ensure the row exists
        expect(row.creator_id).toBe(creatorId);
        expect(row.result).toBe(result);
        expect(row.date).toBe(date);
    });

    it('should retrieve a game by its ID', async () => {
        const creatorId = 2;
        const result = 'loss';
        const date = '2025-04-25';

        // Insert a game directly into the database
        const gameId = await new Promise((resolve, reject) => {
            db.run(
                `INSERT INTO games (creator_id, result, date) VALUES (?, ?, ?)`,
                [creatorId, result, date],
                function (err) {
                    if (err) reject(err);
                    else resolve(this.lastID);
                }
            );
        });

        // Retrieve the game using the model
        const game = await getGameById(gameId);
        expect(game).toEqual({
            id: gameId,
            creator_id: creatorId,
            result,
            date,
        });
    });
});