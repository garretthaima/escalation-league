const request = require('supertest');
const express = require('express');
const indexRouter = require('../../routes/index');

// Mock sub-routes
jest.mock('../../routes/users', () => {
  const express = require('express'); // Require express inside the factory function
  return express.Router().get('/', (req, res) => res.send('Users route'));
});

jest.mock('../../routes/games', () => {
  const express = require('express'); // Require express inside the factory function
  return express.Router().get('/', (req, res) => res.send('Games route'));
});

jest.mock('../../routes/leaderboard', () => {
  const express = require('express'); // Require express inside the factory function
  return express.Router().get('/', (req, res) => res.send('Leaderboard route'));
});

describe('Index Router', () => {
  let app;

  beforeAll(() => {
    app = express();
    app.use(indexRouter);
  });

  it('should mount /users route', async () => {
    const res = await request(app).get('/users');
    expect(res.statusCode).toBe(200);
    expect(res.text).toBe('Users route');
  });

  it('should mount /games route', async () => {
    const res = await request(app).get('/games');
    expect(res.statusCode).toBe(200);
    expect(res.text).toBe('Games route');
  });

  it('should mount /leaderboard route', async () => {
    const res = await request(app).get('/leaderboard');
    expect(res.statusCode).toBe(200);
    expect(res.text).toBe('Leaderboard route');
  });

  it('should return 404 for undefined routes', async () => {
    const res = await request(app).get('/undefined-route');
    expect(res.statusCode).toBe(404);
  });
});