const request = require('supertest');
const { getAuthTokenWithRole } = require('../helpers/authHelper');
const { createTestLeague, addUserToLeague } = require('../helpers/leaguesHelper');
const db = require('../helpers/testDb');

// Mock the DB to use testDb
jest.mock('../../models/db', () => require('../helpers/testDb'));

// Mock settingsUtils
jest.mock('../../utils/settingsUtils', () => ({
    getSetting: jest.fn((key) => {
        if (key === 'secret_key') {
            return Promise.resolve(process.env.JWT_SECRET || 'test-secret-key');
        }
        return Promise.resolve(null);
    })
}));

const app = require('../../server');

describe('Metagame API', () => {
    let leagueId;
    let userId;
    let token;

    beforeAll(async () => {
        // No need to clear - setup.js handles initial database setup
    });

    afterAll(async () => {
        await db.destroy();
    });

    beforeEach(async () => {
        // Clear data but not RBAC (similar to other tests)
        await db('game_players').del();
        await db('game_pods').del();
        await db('decks').del();
        await db('user_leagues').del();
        await db('leagues').del();
        await db('users').where('id', '>', 0).del(); // Keep RBAC users

        // Create user with league_view_details permission
        const authData = await getAuthTokenWithRole('league_user', ['league_view_details']);
        token = authData.token;
        userId = authData.userId;

        // Create test league
        leagueId = await createTestLeague({ name: 'Test Meta League' });
        await addUserToLeague(userId, leagueId);
    });

    describe('GET /api/leagues/:leagueId/metagame/analysis', () => {
        it('should return empty metagame stats for league with no decks', async () => {
            const res = await request(app)
                .get(`/api/leagues/${leagueId}/metagame/analysis`)
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(200);
            expect(res.body.totalDecks).toBe(0);
            expect(res.body.message).toBe('No decks found in this league');
        });

        it('should return 401 without authentication', async () => {
            const res = await request(app)
                .get(`/api/leagues/${leagueId}/metagame/analysis`);

            expect(res.status).toBe(401);
        });

        it('should return 403 without proper permissions', async () => {
            // Create user without league_view_details permission (use 'user' role which has minimal permissions)
            const { token: unauthorizedToken } = await getAuthTokenWithRole('user', []);

            const res = await request(app)
                .get(`/api/leagues/${leagueId}/metagame/analysis`)
                .set('Authorization', `Bearer ${unauthorizedToken}`);

            expect(res.status).toBe(403);
        });

        it('should analyze decks with basic card data', async () => {
            // Create a test deck
            const deckId = 'test-deck-1';
            await db('decks').insert({
                id: deckId,
                name: 'Test Commander Deck',
                decklist_url: 'https://moxfield.com/test',
                platform: 'moxfield',
                commanders: JSON.stringify([
                    { name: 'Atraxa, Praetors\' Voice', colors: ['W', 'U', 'B', 'G'] }
                ]),
                cards: JSON.stringify([
                    { name: 'Sol Ring', cmc: 1, type: 'Artifact', oracle_text: 'add two mana' },
                    { name: 'Rhystic Study', cmc: 3, type: 'Enchantment', oracle_text: 'draw a card' },
                    { name: 'Counterspell', cmc: 2, type: 'Instant', oracle_text: 'counter target spell' },
                    { name: 'Lightning Bolt', cmc: 1, type: 'Instant', oracle_text: 'destroy target creature' },
                    { name: 'Llanowar Elves', cmc: 1, type: 'Creature', colors: ['G'] }
                ])
            });

            // Link deck to user in league
            await db('user_leagues')
                .where({ user_id: userId, league_id: leagueId })
                .update({ deck_id: deckId });

            const res = await request(app)
                .get(`/api/leagues/${leagueId}/metagame/analysis`)
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(200);
            expect(res.body.totalDecks).toBe(1);

            // Check top cards
            expect(Array.isArray(res.body.topCards)).toBe(true);
            expect(res.body.topCards.length).toBeGreaterThan(0);
            expect(res.body.topCards[0]).toHaveProperty('name');
            expect(res.body.topCards[0]).toHaveProperty('count');
            expect(res.body.topCards[0]).toHaveProperty('percentage');

            // Check commanders
            expect(Array.isArray(res.body.topCommanders)).toBe(true);
            expect(res.body.topCommanders.length).toBe(1);
            expect(res.body.topCommanders[0].name).toBe('Atraxa, Praetors\' Voice');

            // Check mana curve
            expect(res.body.manaCurve).toHaveProperty('distribution');
            expect(res.body.manaCurve).toHaveProperty('averageCmc');
            expect(Array.isArray(res.body.manaCurve.distribution)).toBe(true);

            // Check resources
            expect(res.body.resources).toHaveProperty('ramp');
            expect(res.body.resources).toHaveProperty('cardDraw');
            expect(res.body.resources.ramp).toHaveProperty('totalCount');
            expect(res.body.resources.ramp).toHaveProperty('averagePerDeck');

            // Check interaction
            expect(res.body.interaction).toHaveProperty('removal');
            expect(res.body.interaction).toHaveProperty('counterspells');
            expect(res.body.interaction).toHaveProperty('boardWipes');

            // Check win conditions
            expect(res.body.winConditions).toHaveProperty('combat');
            expect(res.body.winConditions).toHaveProperty('combo');
            expect(res.body.winConditions).toHaveProperty('alternate');

            // Check commander synergies
            expect(res.body.commanderSynergies).toHaveProperty('Atraxa, Praetors\' Voice');
        });

        it('should detect ramp cards correctly', async () => {
            const deckId = 'ramp-deck';
            await db('decks').insert({
                id: deckId,
                name: 'Ramp Deck',
                decklist_url: 'https://moxfield.com/test',
                platform: 'moxfield',
                commanders: JSON.stringify([{ name: 'Omnath, Locus of Mana' }]),
                cards: JSON.stringify([
                    { name: 'Sol Ring', cmc: 1, oracle_text: 'add two mana' },
                    { name: 'Arcane Signet', cmc: 2, oracle_text: 'add one mana' },
                    { name: 'Cultivate', cmc: 3, oracle_text: 'search your library for a land' },
                    { name: 'Kodama\'s Reach', cmc: 3, oracle_text: 'search your library for a land' }
                ])
            });

            await db('user_leagues')
                .where({ user_id: userId, league_id: leagueId })
                .update({ deck_id: deckId });

            const res = await request(app)
                .get(`/api/leagues/${leagueId}/metagame/analysis`)
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(200);
            expect(res.body.resources.ramp.totalCount).toBeGreaterThanOrEqual(4);
        });

        it('should detect card draw engines correctly', async () => {
            const deckId = 'draw-deck';
            await db('decks').insert({
                id: deckId,
                name: 'Card Draw Deck',
                decklist_url: 'https://moxfield.com/test',
                platform: 'moxfield',
                commanders: JSON.stringify([{ name: 'Nekusar, the Mindrazer' }]),
                cards: JSON.stringify([
                    { name: 'Rhystic Study', cmc: 3, oracle_text: 'whenever an opponent casts a spell, you may draw a card unless that player pays {1}' },
                    { name: 'Mystic Remora', cmc: 1, oracle_text: 'whenever an opponent casts a noncreature spell, you may draw a card unless that player pays {4}' },
                    { name: 'Consecrated Sphinx', cmc: 6, oracle_text: 'whenever an opponent draws a card, you may draw two cards' }
                ])
            });

            await db('user_leagues')
                .where({ user_id: userId, league_id: leagueId })
                .update({ deck_id: deckId });

            const res = await request(app)
                .get(`/api/leagues/${leagueId}/metagame/analysis`)
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(200);
            expect(res.body.resources.cardDraw.totalCount).toBeGreaterThanOrEqual(3);
        });

        it('should calculate staples correctly (cards in 50%+ of decks)', async () => {
            // Create 2 users with decks, both having Sol Ring
            const deck1 = 'deck-1';
            const deck2 = 'deck-2';

            // Create second user
            const { userId: user2Id } = await getAuthTokenWithRole('league_user', ['league_view_details']);
            await addUserToLeague(user2Id, leagueId);

            // Create decks with Sol Ring in both
            await db('decks').insert([
                {
                    id: deck1,
                    name: 'Deck 1',
                    decklist_url: 'https://moxfield.com/deck1',
                    platform: 'moxfield',
                    commanders: JSON.stringify([{ name: 'Commander A' }]),
                    cards: JSON.stringify([
                        { name: 'Sol Ring', cmc: 1 },
                        { name: 'Lightning Bolt', cmc: 1 }
                    ])
                },
                {
                    id: deck2,
                    name: 'Deck 2',
                    decklist_url: 'https://moxfield.com/deck2',
                    platform: 'moxfield',
                    commanders: JSON.stringify([{ name: 'Commander B' }]),
                    cards: JSON.stringify([
                        { name: 'Sol Ring', cmc: 1 },
                        { name: 'Counterspell', cmc: 2 }
                    ])
                }
            ]);

            await db('user_leagues')
                .where({ user_id: userId, league_id: leagueId })
                .update({ deck_id: deck1 });

            await db('user_leagues')
                .where({ user_id: user2Id, league_id: leagueId })
                .update({ deck_id: deck2 });

            const res = await request(app)
                .get(`/api/leagues/${leagueId}/metagame/analysis`)
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(200);
            expect(res.body.totalDecks).toBe(2);

            // Sol Ring should be a staple (in 100% of decks)
            expect(Array.isArray(res.body.staples)).toBe(true);
            const solRing = res.body.staples.find(s => s.name === 'Sol Ring');
            expect(solRing).toBeDefined();
            expect(solRing.count).toBe(2);
            expect(parseFloat(solRing.percentage)).toBe(100);
        });

        it('should track commander synergies correctly', async () => {
            const deckId = 'synergy-deck';
            await db('decks').insert({
                id: deckId,
                name: 'Atraxa Deck',
                decklist_url: 'https://moxfield.com/test',
                platform: 'moxfield',
                commanders: JSON.stringify([{ name: 'Atraxa, Praetors\' Voice' }]),
                cards: JSON.stringify([
                    { name: 'Doubling Season', cmc: 5 },
                    { name: 'Proliferate Card', cmc: 3 },
                    { name: 'Counter Synergy', cmc: 2 }
                ])
            });

            await db('user_leagues')
                .where({ user_id: userId, league_id: leagueId })
                .update({ deck_id: deckId });

            const res = await request(app)
                .get(`/api/leagues/${leagueId}/metagame/analysis`)
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(200);
            expect(res.body.commanderSynergies).toHaveProperty('Atraxa, Praetors\' Voice');

            const atraxaSynergies = res.body.commanderSynergies['Atraxa, Praetors\' Voice'];
            expect(Array.isArray(atraxaSynergies)).toBe(true);
            expect(atraxaSynergies.length).toBeGreaterThan(0);
            expect(atraxaSynergies[0]).toHaveProperty('name');
            expect(atraxaSynergies[0]).toHaveProperty('count');
            expect(atraxaSynergies[0]).toHaveProperty('percentage');
        });

        it('should filter out basic lands from card counts', async () => {
            const deckId = 'lands-deck';
            await db('decks').insert({
                id: deckId,
                name: 'Lands Deck',
                decklist_url: 'https://moxfield.com/test',
                platform: 'moxfield',
                commanders: JSON.stringify([{ name: 'Test Commander' }]),
                cards: JSON.stringify([
                    { name: 'Plains', cmc: 0 },
                    { name: 'Island', cmc: 0 },
                    { name: 'Swamp', cmc: 0 },
                    { name: 'Mountain', cmc: 0 },
                    { name: 'Forest', cmc: 0 },
                    { name: 'Sol Ring', cmc: 1 }
                ])
            });

            await db('user_leagues')
                .where({ user_id: userId, league_id: leagueId })
                .update({ deck_id: deckId });

            const res = await request(app)
                .get(`/api/leagues/${leagueId}/metagame/analysis`)
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(200);

            // Basic lands should not appear in top cards
            const basicLandNames = ['Plains', 'Island', 'Swamp', 'Mountain', 'Forest'];
            const topCardNames = res.body.topCards.map(c => c.name);

            for (const land of basicLandNames) {
                expect(topCardNames).not.toContain(land);
            }

            // But Sol Ring should be there
            expect(topCardNames).toContain('Sol Ring');
        });
    });

    describe('GET /api/leagues/:leagueId/metagame/card/:cardName', () => {
        it('should return card statistics', async () => {
            const deckId = 'test-deck';
            await db('decks').insert({
                id: deckId,
                name: 'Test Deck',
                decklist_url: 'https://moxfield.com/test',
                platform: 'moxfield',
                commanders: JSON.stringify([{ name: 'Test Commander' }]),
                cards: JSON.stringify([
                    { name: 'Sol Ring', cmc: 1 },
                    { name: 'Lightning Bolt', cmc: 1 }
                ])
            });

            await db('user_leagues')
                .where({ user_id: userId, league_id: leagueId })
                .update({ deck_id: deckId });

            const res = await request(app)
                .get(`/api/leagues/${leagueId}/metagame/card/Sol Ring`)
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(200);
            expect(res.body.cardName).toBe('Sol Ring');
            expect(res.body.timesPlayed).toBe(1);
            expect(Array.isArray(res.body.decks)).toBe(true);
            expect(res.body.decks.length).toBe(1);
            expect(res.body.decks[0]).toHaveProperty('firstname');
            expect(res.body.decks[0]).toHaveProperty('deck_name');
        });

        it('should return 401 without authentication', async () => {
            const res = await request(app)
                .get(`/api/leagues/${leagueId}/metagame/card/Sol Ring`);

            expect(res.status).toBe(401);
        });

        it('should return 403 without proper permissions', async () => {
            const { token: unauthorizedToken } = await getAuthTokenWithRole('user', []);

            const res = await request(app)
                .get(`/api/leagues/${leagueId}/metagame/card/Sol Ring`)
                .set('Authorization', `Bearer ${unauthorizedToken}`);

            expect(res.status).toBe(403);
        });
    });
});
