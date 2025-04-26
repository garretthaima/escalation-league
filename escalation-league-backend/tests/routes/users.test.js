const request = require('supertest');
const app = require('../../server'); // Import your Express app
const db = require('../../models/db'); // Import the database

// Mock the database for testing
jest.mock('../../models/db');

describe('Users Controller', () => {
  afterEach(() => {
    jest.clearAllMocks(); // Clear mocks after each test
  });

  describe('POST /register', () => {
    it('should register a new user', async () => {
      // Mock the database behavior
      db.run.mockImplementation((query, params, callback) => {
        callback(null); // Simulate successful insertion
      });

      const res = await request(app)
        .post('/register')
        .send({ username: 'testuser', password: 'testpassword' });

      expect(res.statusCode).toBe(201);
      expect(res.body.message).toBe('User registered successfully.');
    });

    it('should return 400 if username or password is missing', async () => {
      const res = await request(app)
        .post('/register')
        .send({ username: '' });

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toBe('Username and password are required.');
    });

    it('should return 400 if username already exists', async () => {
      // Mock the database behavior for duplicate username
      db.run.mockImplementation((query, params, callback) => {
        const error = new Error();
        error.code = 'SQLITE_CONSTRAINT';
        callback(error);
      });

      const res = await request(app)
        .post('/register')
        .send({ username: 'existinguser', password: 'testpassword' });

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toBe('Username already exists.');
    });
  });

  describe('POST /login', () => {
    it('should log in a user with valid credentials', async () => {
      // Mock the database behavior for finding a user
      db.get.mockImplementation((query, params, callback) => {
        callback(null, { id: 1, username: 'testuser', password: '$2b$10$hashedpassword' }); // Simulate a user
      });

      // Mock bcrypt comparison
      jest.mock('bcrypt', () => ({
        compare: jest.fn((password, hashedPassword, callback) => {
          callback(null, true); // Simulate password match
        }),
      }));

      const res = await request(app)
        .post('/login')
        .send({ username: 'testuser', password: 'testpassword' });

      expect(res.statusCode).toBe(200);
      expect(res.body.message).toBe('Login successful.');
      expect(res.body.token).toBeDefined();
    });

    it('should return 404 if user is not found', async () => {
      db.get.mockImplementation((query, params, callback) => {
        callback(null, null); // Simulate no user found
      });

      const res = await request(app)
        .post('/login')
        .send({ username: 'nonexistentuser', password: 'testpassword' });

      expect(res.statusCode).toBe(404);
      expect(res.body.error).toBe('User not found.');
    });

    it('should return 401 if password is incorrect', async () => {
      db.get.mockImplementation((query, params, callback) => {
        callback(null, { id: 1, username: 'testuser', password: '$2b$10$hashedpassword' }); // Simulate a user
      });

      jest.mock('bcrypt', () => ({
        compare: jest.fn((password, hashedPassword, callback) => {
          callback(null, false); // Simulate password mismatch
        }),
      }));

      const res = await request(app)
        .post('/login')
        .send({ username: 'testuser', password: 'wrongpassword' });

      expect(res.statusCode).toBe(401);
      expect(res.body.error).toBe('Invalid credentials.');
    });
  });
});