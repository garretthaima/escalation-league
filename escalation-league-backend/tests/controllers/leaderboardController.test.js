const express = require('express');
const request = require('supertest');
const db = require('../../models/db');
const { getLeaderboard, getOpponentStats } = require('../../controllers/leaderboardController');

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
app.get('/leaderboard', getLeaderboard);
app.get('/opponent-stats', getOpponentStats);

describe('leaderboardController.js', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getLeaderboard', () => {
    it('should return 200 and the leaderboard data', async () => {
      const mockLeaderboard = [
        {
          username: 'player1',
          wins: 5,
          losses: 2,
          total_games: 7,
          win_rate: 71.43,
        },
        {
          username: 'player2',
          wins: 3,
          losses: 4,
          total_games: 7,
          win_rate: 42.86,
        },
      ];

      db.all.mockImplementation((query, params, callback) => {
        callback(null, mockLeaderboard); // Simulate leaderboard data
      });

      const response = await request(app).get('/leaderboard');
      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockLeaderboard);
    });

    it('should return 500 if there is a database error', async () => {
      db.all.mockImplementation((query, params, callback) => {
        callback(new Error('Database error'), null); // Simulate database error
      });

      const response = await request(app).get('/leaderboard');
      expect(response.status).toBe(500);
      expect(response.body).toEqual({ error: 'Database error.' });
    });
  });

  describe('getOpponentStats', () => {
    it('should return 200 and the opponent stats', async () => {
      const mockOpponentStats = [
        {
          opponent: 'opponent1',
          wins: 2,
          losses: 3,
          total_games: 5,
          win_rate: 40.0,
        },
        {
          opponent: 'opponent2',
          wins: 1,
          losses: 1,
          total_games: 2,
          win_rate: 50.0,
        },
      ];

      db.all.mockImplementation((query, params, callback) => {
        callback(null, mockOpponentStats); // Simulate opponent stats data
      });

      const response = await request(app).get('/opponent-stats');
      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockOpponentStats);
    });

    it('should return 500 if there is a database error', async () => {
      db.all.mockImplementation((query, params, callback) => {
        callback(new Error('Database error'), null); // Simulate database error
      });

      const response = await request(app).get('/opponent-stats');
      expect(response.status).toBe(500);
      expect(response.body).toEqual({ error: 'Database error.' });
    });
  });
});