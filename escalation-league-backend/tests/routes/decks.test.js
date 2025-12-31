const request = require('supertest');
const { getAuthToken, getAuthTokenWithRole } = require('../helpers/authHelper');
const { createTestDeck, importDeck, syncDeck } = require('../helpers/decksHelper');
const { createTestLeague, addUserToLeague } = require('../helpers/leaguesHelper');

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

describe.skip('Deck Routes', () => {
    describe('POST /api/decks/import', () => {
        it('should import deck from Archidekt', async () => {
            const { token, userId } = await getAuthToken();

            const res = await request(app)
                .post('/api/decks/import')
                .set('Authorization', `Bearer ${token}`)
                .send({
                    deck_url: 'https://archidekt.com/decks/12345',
                    platform: 'archidekt'
                });

            expect(res.status).toBe(201);
            expect(res.body).toHaveProperty('deck_id');
            expect(res.body).toHaveProperty('message');
        });

        it('should import deck from Moxfield', async () => {
            const { token } = await getAuthToken();

            const res = await request(app)
                .post('/api/decks/import')
                .set('Authorization', `Bearer ${token}`)
                .send({
                    deck_url: 'https://www.moxfield.com/decks/abcd1234',
                    platform: 'moxfield'
                });

            expect(res.status).toBe(201);
            expect(res.body).toHaveProperty('deck_id');
        });

        it('should reject invalid URL format', async () => {
            const { token } = await getAuthToken();

            const res = await request(app)
                .post('/api/decks/import')
                .set('Authorization', `Bearer ${token}`)
                .send({
                    deck_url: 'not-a-valid-url',
                    platform: 'archidekt'
                });

            expect(res.status).toBe(400);
        });

        it('should prevent duplicate deck imports', async () => {
            const { token, userId } = await getAuthToken();
            const deckUrl = 'https://archidekt.com/decks/99999';

            // First import
            await request(app)
                .post('/api/decks/import')
                .set('Authorization', `Bearer ${token}`)
                .send({
                    deck_url: deckUrl,
                    platform: 'archidekt'
                });

            // Second import of same URL
            const res = await request(app)
                .post('/api/decks/import')
                .set('Authorization', `Bearer ${token}`)
                .send({
                    deck_url: deckUrl,
                    platform: 'archidekt'
                });

            expect(res.status).toBe(400);
            expect(res.body).toHaveProperty('error');
        });

        // TODO: Test unsupported platform rejection
        // TODO: Test platform API failure handling
    });

    describe('GET /api/decks/:id', () => {
        it('should return deck details for owner', async () => {
            const { token, userId } = await getAuthToken();
            const deckId = await createTestDeck(userId, {
                name: 'My Test Deck',
                commanders: JSON.stringify(['Atraxa, Praetors\' Voice'])
            });

            const res = await request(app)
                .get(`/api/decks/${deckId}`)
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('id', deckId);
            expect(res.body).toHaveProperty('name', 'My Test Deck');
            expect(res.body).toHaveProperty('commanders');
            expect(res.body).toHaveProperty('cards');
        });

        it('should return deck details for non-owner', async () => {
            const owner = await getAuthToken();
            const deckId = await createTestDeck(owner.userId);

            const { token } = await getAuthToken(); // Different user

            const res = await request(app)
                .get(`/api/decks/${deckId}`)
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('id', deckId);
        });

        it('should return 404 for non-existent deck', async () => {
            const { token } = await getAuthToken();

            const res = await request(app)
                .get('/api/decks/nonexistent-deck-id')
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(404);
        });

        // TODO: Test includes price data
        // TODO: Test includes color identity
        // TODO: Test includes legality info
    });

    describe('PUT /api/decks/:id/sync', () => {
        it('should sync deck with platform', async () => {
            const { token, userId } = await getAuthToken();
            const deckId = await createTestDeck(userId);

            const res = await request(app)
                .put(`/api/decks/${deckId}/sync`)
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('message');
        });

        it('should only allow owner to sync', async () => {
            const owner = await getAuthToken();
            const deckId = await createTestDeck(owner.userId);

            const { token } = await getAuthToken(); // Different user

            const res = await request(app)
                .put(`/api/decks/${deckId}/sync`)
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(403);
        });

        // TODO: Test updates last_synced_at timestamp
        // TODO: Test handles platform API errors gracefully
        // TODO: Test updates commanders and cards
    });

    describe('PUT /api/decks/:id', () => {
        it('should update deck details', async () => {
            const { token, userId } = await getAuthToken();
            const deckId = await createTestDeck(userId, { name: 'Old Name' });

            const res = await request(app)
                .put(`/api/decks/${deckId}`)
                .set('Authorization', `Bearer ${token}`)
                .send({
                    name: 'New Deck Name'
                });

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('message');
        });

        it('should only allow owner to update', async () => {
            const owner = await getAuthToken();
            const deckId = await createTestDeck(owner.userId);

            const { token } = await getAuthToken(); // Different user

            const res = await request(app)
                .put(`/api/decks/${deckId}`)
                .set('Authorization', `Bearer ${token}`)
                .send({ name: 'Hacked Name' });

            expect(res.status).toBe(403);
        });

        // TODO: Test update commander
        // TODO: Test update platform URL
    });

    describe('DELETE /api/decks/:id', () => {
        it('should delete deck', async () => {
            const { token, userId } = await getAuthToken();
            const deckId = await createTestDeck(userId);

            const res = await request(app)
                .delete(`/api/decks/${deckId}`)
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(200);
        });

        it('should only allow owner to delete', async () => {
            const owner = await getAuthToken();
            const deckId = await createTestDeck(owner.userId);

            const { token } = await getAuthToken(); // Different user

            const res = await request(app)
                .delete(`/api/decks/${deckId}`)
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(403);
        });

        it('should not allow deleting deck in use by active league', async () => {
            const { token, userId } = await getAuthToken();
            const deckId = await createTestDeck(userId);
            const leagueId = await createTestLeague({ is_active: 1 });

            await addUserToLeague(userId, leagueId, {
                deck_id: deckId
            });

            const res = await request(app)
                .delete(`/api/decks/${deckId}`)
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(400);
            expect(res.body).toHaveProperty('error');
        });

        // TODO: Test cascade behavior for user_leagues
        // TODO: Test admin can delete any deck
    });

    describe('GET /api/decks', () => {
        it('should return user\'s decks', async () => {
            const { token, userId } = await getAuthToken();

            await createTestDeck(userId, { name: 'Deck 1' });
            await createTestDeck(userId, { name: 'Deck 2' });

            const res = await request(app)
                .get('/api/decks')
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(200);
            expect(Array.isArray(res.body)).toBe(true);
            expect(res.body.length).toBeGreaterThanOrEqual(2);
        });

        // TODO: Test pagination
        // TODO: Test filter by commander
        // TODO: Test sort by created_at
    });
});