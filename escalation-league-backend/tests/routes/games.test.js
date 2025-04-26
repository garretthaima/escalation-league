const request = require('supertest');
const app = require('../../server');
const db = require('../../models/db');

jest.mock('../../models/db');

describe('Games Controller', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /log-game', () => {
    it('should log a game successfully', async () => {
      db.all.mockImplementation((query, params, callback) => {
        callback(null, [{ id: 2 }, { id: 3 }]); // Simulate opponent IDs
      });

      db.run.mockImplementation((query, params, callback) => {
        callback(null); // Simulate successful insertion
      });

      const res = await request(app)
        .post('/log-game')
        .set('Authorization', 'Bearer valid_token')
        .send({
          opponents: ['player2', 'player3'],
          result: 'win',
          date: '2023-10-01',
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.message).toBe('Game logged successfully.');
      expect(res.body.gameId).toBeDefined();
    });

    it('should return 400 if opponents are missing', async () => {
      const res = await request(app)
        .post('/log-game')
        .set('Authorization', 'Bearer valid_token')
        .send({
          result: 'win',
          date: '2023-10-01',
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toBe('You must provide between 1 and 3 opponents.');
    });
  });
describe('POST /confirm-game', () => {
    it('should confirm a game successfully', async () => {
        db.run.mockImplementation((query, params, callback) => {
            callback(null); // Simulate successful confirmation
        });

        const res = await request(app)
            .post('/confirm-game')
            .set('Authorization', 'Bearer valid_token')
            .send({
                gameId: 1,
            });

        expect(res.statusCode).toBe(200);
        expect(res.body.message).toBe('Game confirmed successfully.');
    });

    it('should return 400 if gameId is missing', async () => {
        const res = await request(app)
            .post('/confirm-game')
            .set('Authorization', 'Bearer valid_token')
            .send({});

        expect(res.statusCode).toBe(400);
        expect(res.body.error).toBe('Game ID is required.');
    });
});

describe('GET /game-history', () => {
    it('should retrieve game history successfully', async () => {
        db.all.mockImplementation((query, params, callback) => {
            callback(null, [
                { id: 1, result: 'win', date: '2023-10-01' },
                { id: 2, result: 'loss', date: '2023-10-02' },
            ]); // Simulate game history
        });

        const res = await request(app)
            .get('/game-history')
            .set('Authorization', 'Bearer valid_token');

        expect(res.statusCode).toBe(200);
        expect(res.body.games).toHaveLength(2);
        expect(res.body.games[0].result).toBe('win');
    });

    it('should return 500 if there is a database error', async () => {
        db.all.mockImplementation((query, params, callback) => {
            callback(new Error('Database error'), null);
        });

        const res = await request(app)
            .get('/game-history')
            .set('Authorization', 'Bearer valid_token');

        expect(res.statusCode).toBe(500);
        expect(res.body.error).toBe('Failed to retrieve game history.');
    });
});
});