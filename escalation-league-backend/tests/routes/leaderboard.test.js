const request = require('supertest');
const express = require('express');
const leaderboardRouter = require('../../routes/leaderboard');
const { getLeaderboard, getOpponentStats } = require('../../controllers/leaderboardController');
const authenticateToken = require('../../middlewares/authentication');

// Mock the controller functions and middleware
jest.mock('../../controllers/leaderboardController', () => ({
    getLeaderboard: jest.fn((req, res) => res.send('Leaderboard data')),
    getOpponentStats: jest.fn((req, res) => res.send('Opponent stats data')),
}));

jest.mock('../../middlewares/authentication', () => jest.fn((req, res, next) => next()));

describe('Leaderboard Router', () => {
    let app;

    beforeAll(() => {
        app = express();
        app.use(leaderboardRouter);
    });

    it('should handle GET /leaderboard', async () => {
        const res = await request(app).get('/leaderboard');
        expect(res.statusCode).toBe(200);
        expect(res.text).toBe('Leaderboard data');
        expect(getLeaderboard).toHaveBeenCalled();
    });

    it('should handle GET /opponent-stats with authentication', async () => {
        const res = await request(app).get('/opponent-stats');
        expect(res.statusCode).toBe(200);
        expect(res.text).toBe('Opponent stats data');
        expect(authenticateToken).toHaveBeenCalled();
        expect(getOpponentStats).toHaveBeenCalled();
    });

    it('should return 404 for undefined routes', async () => {
        const res = await request(app).get('/undefined-route');
        expect(res.statusCode).toBe(404);
    });
});