const request = require('supertest');

jest.mock('../../models/db', () => require('../helpers/testDb'));

// Mock the settings utility to return test secret key
jest.mock('../../utils/settingsUtils', () => ({
    getSetting: jest.fn((key) => {
        if (key === 'secret_key') {
            return Promise.resolve(process.env.JWT_SECRET || 'test-secret-key');
        }
        return Promise.resolve(null);
    })
}));

const app = require('../../server');

describe('Auth Routes', () => {
    describe('POST /api/auth/register', () => {
        it('should register a new user successfully', async () => {
            const uniqueEmail = `user-${Date.now()}-${Math.random()}@example.com`;

            const res = await request(app)
                .post('/api/auth/register')
                .send({
                    firstname: 'New',
                    lastname: 'User',
                    email: uniqueEmail,
                    password: 'SecurePass123!'
                });

            expect(res.status).toBe(201);
            expect(res.body).toHaveProperty('success', true);
            expect(res.body).toHaveProperty('userId');
        });

        it('should reject registration with duplicate email', async () => {
            const duplicateEmail = `duplicate-${Date.now()}-${Math.random()}@example.com`;

            // First registration
            const firstRes = await request(app)
                .post('/api/auth/register')
                .send({
                    firstname: 'First',
                    lastname: 'User',
                    email: duplicateEmail,
                    password: 'SecurePass123!'
                });

            expect(firstRes.status).toBe(201);

            // Second registration with same email - should fail
            const secondRes = await request(app)
                .post('/api/auth/register')
                .send({
                    firstname: 'Duplicate',
                    lastname: 'User',
                    email: duplicateEmail,
                    password: 'SecurePass123!'
                });

            expect(secondRes.status).toBe(400);
            expect(secondRes.body).toHaveProperty('error', 'Email is already registered.');
        });

        it('should reject registration with missing fields', async () => {
            const res = await request(app)
                .post('/api/auth/register')
                .send({
                    email: `incomplete-${Date.now()}@example.com`
                    // Missing firstname, lastname, password
                });

            expect(res.status).toBe(500);
        });

        // TODO: Add test for password validation (min length, complexity)
        // TODO: Add test for email format validation
        // TODO: Add test for SQL injection attempts in fields
    });

    describe('POST /api/auth/login', () => {
        it('should login with valid credentials', async () => {
            const testEmail = `login-${Date.now()}-${Math.random()}@example.com`;
            const testPassword = 'TestPass123!';

            // Register user first
            const registerRes = await request(app)
                .post('/api/auth/register')
                .send({
                    firstname: 'Test',
                    lastname: 'User',
                    email: testEmail,
                    password: testPassword
                });

            expect(registerRes.status).toBe(201);

            // Login immediately
            const loginRes = await request(app)
                .post('/api/auth/login')
                .send({
                    email: testEmail,
                    password: testPassword
                });

            expect(loginRes.status).toBe(200);
            expect(loginRes.body).toHaveProperty('token');
            expect(typeof loginRes.body.token).toBe('string');
        });

        it('should reject login with wrong password', async () => {
            const testEmail = `wrong-pwd-${Date.now()}-${Math.random()}@example.com`;
            const correctPassword = 'CorrectPass123!';

            const registerRes = await request(app)
                .post('/api/auth/register')
                .send({
                    firstname: 'Test',
                    lastname: 'User',
                    email: testEmail,
                    password: correctPassword
                });

            expect(registerRes.status).toBe(201);

            const res = await request(app)
                .post('/api/auth/login')
                .send({
                    email: testEmail,
                    password: 'WrongPassword123!'
                });

            expect(res.status).toBe(401);
            expect(res.body).toHaveProperty('error', 'Invalid email or password');
        });

        it('should reject login with non-existent email', async () => {
            const res = await request(app)
                .post('/api/auth/login')
                .send({
                    email: `nonexistent-${Date.now()}@example.com`,
                    password: 'TestPass123!'
                });

            expect(res.status).toBe(401);
            expect(res.body).toHaveProperty('error', 'Invalid email or password');
        });

        it('should reject login without email or password', async () => {
            const res = await request(app)
                .post('/api/auth/login')
                .send({
                    email: `test-${Date.now()}@example.com`
                    // Missing password
                });

            expect(res.status).toBe(400);
            expect(res.body).toHaveProperty('error', 'Email and password are required.');
        });

        it('should handle case-insensitive email login', async () => {
            const testEmail = `case-${Date.now()}-${Math.random()}@example.com`;
            const testPassword = 'TestPass123!';

            const registerRes = await request(app)
                .post('/api/auth/register')
                .send({
                    firstname: 'Test',
                    lastname: 'User',
                    email: testEmail.toLowerCase(),
                    password: testPassword
                });

            expect(registerRes.status).toBe(201);

            const res = await request(app)
                .post('/api/auth/login')
                .send({
                    email: testEmail.toUpperCase(),
                    password: testPassword
                });

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('token');
        });

        // TODO: Add test for banned user attempting to login
        // TODO: Add test for inactive user attempting to login
        // TODO: Add test for token expiration validation
        // TODO: Add test for rate limiting on failed login attempts
    });

    describe('POST /api/auth/google-auth', () => {
        it('should reject request without token', async () => {
            const res = await request(app)
                .post('/api/auth/google-auth')
                .send({});

            expect(res.status).toBe(400);
            expect(res.body).toHaveProperty('error', 'Token is required');
        });

        // TODO: Mock OAuth2Client to test successful Google authentication
        // TODO: Test creating new user from Google OAuth
        // TODO: Test logging in existing user with Google OAuth
        // TODO: Test handling invalid Google tokens
    });

    describe('POST /api/auth/verify-google-token', () => {
        // TODO: Add tests for verify-google-token endpoint
    });
});