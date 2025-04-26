const express = require('express');
const request = require('supertest');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../../models/db');
const { registerUser, loginUser } = require('../../controllers/usersController');

// Mock the database
jest.mock('../../models/db');

// Mock bcrypt and jwt
jest.mock('bcrypt');
jest.mock('jsonwebtoken');

const app = express();
app.use(express.json());

// Routes for testing
app.post('/register', registerUser);
app.post('/login', loginUser);

describe('usersController.js', () => {
    afterEach(() => {
        jest.clearAllMocks(); // Clear all mocks after each test
    });

    afterAll(() => {
        jest.restoreAllMocks(); // Restore original implementations after all tests
    });

    describe('registerUser', () => {
        it('should return 400 if username or password is missing', async () => {
            const response = await request(app).post('/register').send({ username: 'testuser' });
            expect(response.status).toBe(400);
            expect(response.body).toEqual({ error: 'Username and password are required.' });
        });

        it('should return 400 if username already exists', async () => {
            db.run.mockImplementation((query, params, callback) => {
                console.log('Mock db.run called with:', query, params);
                const error = new Error('SQLITE_CONSTRAINT');
                error.code = 'SQLITE_CONSTRAINT';
                callback(error);
            });

            const response = await request(app).post('/register').send({
                username: 'testuser',
                password: 'password123',
            });
            expect(response.status).toBe(400);
            expect(response.body).toEqual({ error: 'Username already exists.' });
        });

        it('should return 201 if user is registered successfully', async () => {
            bcrypt.hash.mockImplementation((password, saltRounds, callback) => {
                callback(null, 'hashed_password');
            });

            db.run.mockImplementation((query, params, callback) => {
                callback(null); // Simulate successful insertion
            });

            const response = await request(app).post('/register').send({
                username: 'testuser',
                password: 'password123',
            });
            expect(response.status).toBe(201);
            expect(response.body).toEqual({ message: 'User registered successfully.' });
        });

        it('should return 500 if there is an error hashing the password', async () => {
            bcrypt.hash.mockImplementation((password, saltRounds, callback) => {
                callback(new Error('Hashing error'));
            });

            const response = await request(app).post('/register').send({
                username: 'testuser',
                password: 'password123',
            });
            expect(response.status).toBe(500);
            expect(response.body).toEqual({ error: 'Error hashing password.' });
        });
    });

    describe('loginUser', () => {
        it('should return 400 if username or password is missing', async () => {
            const response = await request(app).post('/login').send({ username: 'testuser' });
            expect(response.status).toBe(400);
            expect(response.body).toEqual({ error: 'Username and password are required.' });
        });

        it('should return 404 if user is not found', async () => {
            db.get.mockImplementation((query, params, callback) => {
                callback(null, null); // Simulate no user found
            });

            const response = await request(app).post('/login').send({
                username: 'nonexistentuser',
                password: 'password123',
            });
            expect(response.status).toBe(404);
            expect(response.body).toEqual({ error: 'User not found.' });
        });

        it('should return 401 if password is incorrect', async () => {
            db.get.mockImplementation((query, params, callback) => {
                callback(null, { id: 1, username: 'testuser', password: 'hashed_password' });
            });

            bcrypt.compare.mockImplementation((password, hashedPassword, callback) => {
                callback(null, false); // Simulate password mismatch
            });

            const response = await request(app).post('/login').send({
                username: 'testuser',
                password: 'wrongpassword',
            });
            expect(response.status).toBe(401);
            expect(response.body).toEqual({ error: 'Invalid credentials.' });
        });

        it('should return 200 and a token if login is successful', async () => {
            db.get.mockImplementation((query, params, callback) => {
                callback(null, { id: 1, username: 'testuser', password: 'hashed_password' });
            });

            bcrypt.compare.mockImplementation((password, hashedPassword, callback) => {
                callback(null, true); // Simulate password match
            });

            jwt.sign.mockImplementation((payload, secret, options) => {
                return 'mocked_token'; // Simulate token generation
            });

            const response = await request(app).post('/login').send({
                username: 'testuser',
                password: 'password123',
            });
            expect(response.status).toBe(200);
            expect(response.body).toEqual({
                message: 'Login successful.',
                token: 'mocked_token',
            });
        });

        it('should return 500 if there is a database error', async () => {
            db.get.mockImplementation((query, params, callback) => {
                callback(new Error('Database error'), null); // Simulate database error
            });

            const response = await request(app).post('/login').send({
                username: 'testuser',
                password: 'password123',
            });
            expect(response.status).toBe(500);
            expect(response.body).toEqual({ error: 'Database error.' });
        });
    });
});