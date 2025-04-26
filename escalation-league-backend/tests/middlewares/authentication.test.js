const express = require('express');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const authenticateToken = require('../../middlewares/authentication');

const SECRET_KEY = 'test_secret_key'; // Use a test secret key for the tests
process.env.SECRET_KEY = SECRET_KEY; // Mock the environment variable

const app = express();
app.use(express.json());

// Test route protected by the middleware
app.get('/protected', authenticateToken, (req, res) => {
  res.json({ message: 'Access granted', user: req.user });
});

describe('authenticateToken middleware', () => {
  it('should return 401 if no token is provided', async () => {
    const response = await request(app).get('/protected');
    expect(response.status).toBe(401);
    expect(response.body).toEqual({ error: 'Authentication token is required.' });
  });

  it('should return 401 if the token is invalid', async () => {
    const response = await request(app)
      .get('/protected')
      .set('Authorization', 'Bearer invalid_token');
    expect(response.status).toBe(401);
    expect(response.body).toEqual({ error: 'Invalid token.' });
  });

  it('should allow access if the token is valid', async () => {
    const user = { id: 1, username: 'testuser' };
    const token = jwt.sign(user, SECRET_KEY);

    const response = await request(app)
      .get('/protected')
      .set('Authorization', `Bearer ${token}`);
    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      message: 'Access granted',
      user,
    });
  });
});