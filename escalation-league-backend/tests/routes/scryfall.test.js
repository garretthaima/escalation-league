const request = require('supertest');
const { getAuthToken } = require('../helpers/authHelper');

jest.mock('../../models/db', () => require('../helpers/testDb'));
jest.mock('../../utils/settingsUtils', () => ({
    getSetting: jest.fn((key) => {
        if (key === 'secret_key') {
            return Promise.resolve(process.env.JWT_SECRET || 'test-secret-key');
        }
        return Promise.resolve(null);
    })
}));

const app = require('../../server');

describe.skip('Scryfall Routes', () => {
    describe('GET /api/scryfall/search', () => {
        it('should search for cards', async () => {
            const { token } = await getAuthToken();

            const res = await request(app)
                .get('/api/scryfall/search')
                .query({ q: 'Lightning Bolt' })
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(200);
            expect(Array.isArray(res.body)).toBe(true);
        });

        it('should require search query', async () => {
            const { token } = await getAuthToken();

            const res = await request(app)
                .get('/api/scryfall/search')
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(400);
            expect(res.body).toHaveProperty('error');
        });

        it('should handle minimum query length', async () => {
            const { token } = await getAuthToken();

            const res = await request(app)
                .get('/api/scryfall/search')
                .query({ q: 'a' }) // Too short
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(400);
        });

        // TODO: Test pagination
        // TODO: Test filter by color
        // TODO: Test filter by type
        // TODO: Test filter by rarity
    });

    describe('GET /api/scryfall/card/:id', () => {
        it('should return card details by Scryfall ID', async () => {
            const { token } = await getAuthToken();

            const res = await request(app)
                .get('/api/scryfall/card/f2eb06a8-de77-4c10-a307-7b8c0b0d001e') // Known card ID
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('id');
            expect(res.body).toHaveProperty('name');
        });

        it('should return 404 for invalid card ID', async () => {
            const { token } = await getAuthToken();

            const res = await request(app)
                .get('/api/scryfall/card/invalid-uuid')
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(404);
        });

        // TODO: Test includes price data
        // TODO: Test includes legality info
    });

    describe('GET /api/scryfall/commander/:name', () => {
        it('should return commander by exact name', async () => {
            const { token } = await getAuthToken();

            const res = await request(app)
                .get('/api/scryfall/commander/Atraxa, Praetors\' Voice')
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('name', 'Atraxa, Praetors\' Voice');
            expect(res.body).toHaveProperty('type_line');
        });

        it('should validate legendary creature type', async () => {
            const { token } = await getAuthToken();

            const res = await request(app)
                .get('/api/scryfall/commander/Lightning Bolt') // Not a creature
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(400);
        });

        // TODO: Test case-insensitive search
        // TODO: Test partner commanders
    });

    describe('GET /api/scryfall/autocomplete', () => {
        it('should return card name suggestions', async () => {
            const { token } = await getAuthToken();

            const res = await request(app)
                .get('/api/scryfall/autocomplete')
                .query({ q: 'Atra' })
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(200);
            expect(Array.isArray(res.body)).toBe(true);
            expect(res.body.length).toBeLessThanOrEqual(10); // Limit suggestions
        });

        // TODO: Test minimum query length
        // TODO: Test rate limiting
    });

    describe('GET /api/scryfall/rulings/:cardId', () => {
        it('should return card rulings', async () => {
            const { token } = await getAuthToken();

            const res = await request(app)
                .get('/api/scryfall/rulings/f2eb06a8-de77-4c10-a307-7b8c0b0d001e')
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(200);
            expect(Array.isArray(res.body)).toBe(true);
        });

        // TODO: Test includes ruling date and source
    });
});