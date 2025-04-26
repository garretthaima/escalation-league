const express = require('express');
const request = require('supertest');
const db = require('../../models/db');
const { logGame, confirmGame, getGameHistory } = require('../../controllers/gamesController');

// Mock the database
jest.mock('../../models/db');

const app = express();
app.use(express.json());

// Mock middleware to simulate authenticated user
app.use((req, res, next) => {
  req.user = { id: 1, username: 'testuser' }; // Simulate an authenticated user
  next();
});

// Routes for testing
app.post('/log-game', logGame);
app.post('/confirm-game', confirmGame);
app.get('/game-history', getGameHistory);

describe('gamesController.js', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('logGame', () => {
    it('should return 400 if opponents are not provided', async () => {
      const response = await request(app).post('/log-game').send({
        result: 'win',
        date: '2025-04-24',
      });
      expect(response.status).toBe(400);
      expect(response.body).toEqual({ error: 'You must provide between 1 and 3 opponents.' });
    });

    it('should return 404 if opponents are not found in the database', async () => {
      db.all.mockImplementation((query, params, callback) => {
        callback(null, []); // Simulate no opponents found
      });

      const response = await request(app).post('/log-game').send({
        opponents: ['opponent1'],
        result: 'win',
        date: '2025-04-24',
      });
      expect(response.status).toBe(404);
      expect(response.body).toEqual({ error: 'Opponent(s) not found: opponent1' });
    });

    it('should log a game and return 201 if successful', async () => {
      db.all.mockImplementation((query, params, callback) => {
        callback(null, [{ id: 2, username: 'opponent1' }]); // Simulate opponent found
      });
      db.run.mockImplementation((query, params, callback) => {
        callback(null); // Simulate successful insertion
      });

      const response = await request(app).post('/log-game').send({
        opponents: ['opponent1'],
        result: 'win',
        date: '2025-04-24',
      });
      expect(response.status).toBe(201);
      expect(response.body).toEqual({ message: 'Game logged successfully.', gameId: undefined });
    });
  });

  describe('confirmGame', () => {
    it('should return 400 if gameId is not provided', async () => {
      const response = await request(app).post('/confirm-game').send({});
      expect(response.status).toBe(400);
      expect(response.body).toEqual({ error: 'Game ID is required.' });
    });

    it('should return 404 if the user is not part of the game', async () => {
      db.get.mockImplementation((query, params, callback) => {
        callback(null, null); // Simulate no matching game found
      });

      const response = await request(app).post('/confirm-game').send({ gameId: 1 });
      expect(response.status).toBe(404);
      expect(response.body).toEqual({ error: 'You are not part of this game.' });
    });

    it('should confirm the game and return 200 if successful', async () => {
      db.get.mockImplementation((query, params, callback) => {
        callback(null, { confirmed: 0 }); // Simulate game found but not confirmed
      });
      db.run.mockImplementation((query, params, callback) => {
        callback(null); // Simulate successful update
      });

      const response = await request(app).post('/confirm-game').send({ gameId: 1 });
      expect(response.status).toBe(200);
      expect(response.body).toEqual({ message: 'Game confirmed successfully.' });
    });
  });

  describe('getGameHistory', () => {
    it('should return 200 and the user\'s game history', async () => {
      const mockGames = [
        {
          gameId: 1,
          result: 'win',
          date: '2025-04-24',
          opponent: 'opponent1',
          confirmed: 1,
        },
      ];
      db.all.mockImplementation((query, params, callback) => {
        callback(null, mockGames); // Simulate game history
      });

      const response = await request(app).get('/game-history');
      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockGames);
    });

    it('should return 500 if there is a database error', async () => {
      db.all.mockImplementation((query, params, callback) => {
        callback(new Error('Database error'), null); // Simulate database error
      });

      const response = await request(app).get('/game-history');
      expect(response.status).toBe(500);
      expect(response.body).toEqual({ error: 'Database error.' });
    });
  });
});