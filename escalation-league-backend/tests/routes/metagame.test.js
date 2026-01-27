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

// Mock redis cache
jest.mock('../../utils/redisClient', () => ({
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue('OK'),
    setex: jest.fn().mockResolvedValue('OK'),
    del: jest.fn().mockResolvedValue(1)
}));

// Mock deckService to prevent actual API calls during lazy sync
jest.mock('../../services/deckService', () => ({
    triggerLazySyncIfNeeded: jest.fn().mockResolvedValue(false),
    fetchDeckDataIfStale: jest.fn().mockResolvedValue(null),
    getCachedPriceCheck: jest.fn().mockResolvedValue(null),
    cachePriceCheckResults: jest.fn().mockResolvedValue(null),
    LAZY_SYNC_INTERVAL_HOURS: 6
}));

// Card data for Scryfall mock - maps card names to their details
const scryfallCardData = {
    'sol ring': {
        id: 'sol-ring-id',
        name: 'Sol Ring',
        cmc: 1,
        colors: '[]',
        type_line: 'Artifact',
        oracle_text: 'Tap: Add two colorless mana.',
        keywords: '[]',
        image_uris: '{"normal":"https://example.com/sol-ring.jpg","small":"https://example.com/sol-ring-small.jpg"}'
    },
    'rhystic study': {
        id: 'rhystic-study-id',
        name: 'Rhystic Study',
        cmc: 3,
        colors: '["U"]',
        type_line: 'Enchantment',
        oracle_text: 'Whenever an opponent casts a spell, you may draw a card unless that player pays {1}.',
        keywords: '[]',
        image_uris: '{"normal":"https://example.com/rhystic.jpg"}'
    },
    'counterspell': {
        id: 'counterspell-id',
        name: 'Counterspell',
        cmc: 2,
        colors: '["U"]',
        type_line: 'Instant',
        oracle_text: 'Counter target spell.',
        keywords: '[]',
        image_uris: '{"normal":"https://example.com/counterspell.jpg"}'
    },
    'lightning bolt': {
        id: 'lightning-bolt-id',
        name: 'Lightning Bolt',
        cmc: 1,
        colors: '["R"]',
        type_line: 'Instant',
        oracle_text: 'Lightning Bolt deals 3 damage to any target.',
        keywords: '[]',
        image_uris: '{"normal":"https://example.com/bolt.jpg"}'
    },
    'llanowar elves': {
        id: 'llanowar-elves-id',
        name: 'Llanowar Elves',
        cmc: 1,
        colors: '["G"]',
        type_line: 'Creature — Elf Druid',
        oracle_text: 'Tap: Add one green mana.',
        keywords: '[]',
        image_uris: '{"normal":"https://example.com/llanowar.jpg"}'
    },
    'arcane signet': {
        id: 'arcane-signet-id',
        name: 'Arcane Signet',
        cmc: 2,
        colors: '[]',
        type_line: 'Artifact',
        oracle_text: 'Tap: Add one mana of any color in your commander\'s color identity.',
        keywords: '[]',
        image_uris: '{"normal":"https://example.com/signet.jpg"}'
    },
    'cultivate': {
        id: 'cultivate-id',
        name: 'Cultivate',
        cmc: 3,
        colors: '["G"]',
        type_line: 'Sorcery',
        oracle_text: 'Search your library for up to two basic land cards, reveal those cards, put one onto the battlefield tapped and the other into your hand, then shuffle.',
        keywords: '[]',
        image_uris: '{"normal":"https://example.com/cultivate.jpg"}'
    },
    "kodama's reach": {
        id: 'kodamas-reach-id',
        name: "Kodama's Reach",
        cmc: 3,
        colors: '["G"]',
        type_line: 'Sorcery — Arcane',
        oracle_text: 'Search your library for up to two basic land cards, reveal those cards, put one onto the battlefield tapped and the other into your hand, then shuffle.',
        keywords: '[]',
        image_uris: '{"normal":"https://example.com/kodama.jpg"}'
    },
    'mystic remora': {
        id: 'mystic-remora-id',
        name: 'Mystic Remora',
        cmc: 1,
        colors: '["U"]',
        type_line: 'Enchantment',
        oracle_text: 'Cumulative upkeep {1}\nWhenever an opponent casts a noncreature spell, you may draw a card unless that player pays {4}.',
        keywords: '[]',
        image_uris: '{"normal":"https://example.com/remora.jpg"}'
    },
    'consecrated sphinx': {
        id: 'consecrated-sphinx-id',
        name: 'Consecrated Sphinx',
        cmc: 6,
        colors: '["U"]',
        type_line: 'Creature — Sphinx',
        oracle_text: 'Flying\nWhenever an opponent draws a card, you may draw two cards.',
        keywords: '["Flying"]',
        image_uris: '{"normal":"https://example.com/sphinx.jpg"}'
    },
    'doubling season': {
        id: 'doubling-season-id',
        name: 'Doubling Season',
        cmc: 5,
        colors: '["G"]',
        type_line: 'Enchantment',
        oracle_text: 'If an effect would create one or more tokens under your control, it creates twice that many of those tokens instead. If an effect would put one or more counters on a permanent you control, it puts twice that many of those counters on that permanent instead.',
        keywords: '[]',
        image_uris: '{"normal":"https://example.com/doubling.jpg"}'
    },
    'proliferate card': {
        id: 'proliferate-card-id',
        name: 'Proliferate Card',
        cmc: 3,
        colors: '["U"]',
        type_line: 'Instant',
        oracle_text: 'Proliferate.',
        keywords: '["Proliferate"]',
        image_uris: '{"normal":"https://example.com/proliferate.jpg"}'
    },
    'counter synergy': {
        id: 'counter-synergy-id',
        name: 'Counter Synergy',
        cmc: 2,
        colors: '["G"]',
        type_line: 'Creature',
        oracle_text: 'When this creature enters, put a +1/+1 counter on target creature.',
        keywords: '[]',
        image_uris: '{"normal":"https://example.com/counter.jpg"}'
    },
    'plains': {
        id: 'plains-id',
        name: 'Plains',
        cmc: 0,
        colors: '[]',
        type_line: 'Basic Land — Plains',
        oracle_text: '({T}: Add {W}.)',
        keywords: '[]',
        image_uris: '{"normal":"https://example.com/plains.jpg"}'
    },
    'island': {
        id: 'island-id',
        name: 'Island',
        cmc: 0,
        colors: '[]',
        type_line: 'Basic Land — Island',
        oracle_text: '({T}: Add {U}.)',
        keywords: '[]',
        image_uris: '{"normal":"https://example.com/island.jpg"}'
    },
    'swamp': {
        id: 'swamp-id',
        name: 'Swamp',
        cmc: 0,
        colors: '[]',
        type_line: 'Basic Land — Swamp',
        oracle_text: '({T}: Add {B}.)',
        keywords: '[]',
        image_uris: '{"normal":"https://example.com/swamp.jpg"}'
    },
    'mountain': {
        id: 'mountain-id',
        name: 'Mountain',
        cmc: 0,
        colors: '[]',
        type_line: 'Basic Land — Mountain',
        oracle_text: '({T}: Add {R}.)',
        keywords: '[]',
        image_uris: '{"normal":"https://example.com/mountain.jpg"}'
    },
    'forest': {
        id: 'forest-id',
        name: 'Forest',
        cmc: 0,
        colors: '[]',
        type_line: 'Basic Land — Forest',
        oracle_text: '({T}: Add {G}.)',
        keywords: '[]',
        image_uris: '{"normal":"https://example.com/forest.jpg"}'
    },
    // Edge case test cards
    'command tower': {
        id: 'command-tower-id',
        name: 'Command Tower',
        cmc: 0,
        colors: '[]',
        type_line: 'Land',
        oracle_text: '{T}: Add one mana of any color in your commander\'s color identity.',
        keywords: '[]',
        image_uris: '{"normal":"https://example.com/command-tower.jpg"}'
    },
    'smothering tithe': {
        id: 'smothering-tithe-id',
        name: 'Smothering Tithe',
        cmc: 4,
        colors: '["W"]',
        type_line: 'Enchantment',
        oracle_text: 'Whenever an opponent draws a card, that player may pay {2}. If the player doesn\'t, you create a Treasure token.',
        keywords: '[]',
        image_uris: '{"normal":"https://example.com/smothering-tithe.jpg"}'
    },
    'viscera seer': {
        id: 'viscera-seer-id',
        name: 'Viscera Seer',
        cmc: 1,
        colors: '["B"]',
        type_line: 'Creature — Vampire Wizard',
        oracle_text: 'Sacrifice a creature: Scry 1.',
        keywords: '[]',
        image_uris: '{"normal":"https://example.com/viscera-seer.jpg"}'
    },
    'swords to plowshares': {
        id: 'swords-to-plowshares-id',
        name: 'Swords to Plowshares',
        cmc: 1,
        colors: '["W"]',
        type_line: 'Instant',
        oracle_text: 'Exile target creature. Its controller gains life equal to its power.',
        keywords: '[]',
        image_uris: '{"normal":"https://example.com/swords.jpg"}'
    },
    'path to exile': {
        id: 'path-to-exile-id',
        name: 'Path to Exile',
        cmc: 1,
        colors: '["W"]',
        type_line: 'Instant',
        oracle_text: 'Exile target creature. Its controller may search their library for a basic land card, put that card onto the battlefield tapped, then shuffle.',
        keywords: '[]',
        image_uris: '{"normal":"https://example.com/path.jpg"}'
    },
    'wrath of god': {
        id: 'wrath-of-god-id',
        name: 'Wrath of God',
        cmc: 4,
        colors: '["W"]',
        type_line: 'Sorcery',
        oracle_text: 'Destroy all creatures. They can\'t be regenerated.',
        keywords: '[]',
        image_uris: '{"normal":"https://example.com/wrath.jpg"}'
    },
    'plaguecrafter': {
        id: 'plaguecrafter-id',
        name: 'Plaguecrafter',
        cmc: 3,
        colors: '["B"]',
        type_line: 'Creature — Human Shaman',
        oracle_text: 'When Plaguecrafter enters, each player sacrifices a creature or planeswalker. Each player who can\'t discards a card.',
        keywords: '[]',
        image_uris: '{"normal":"https://example.com/plaguecrafter.jpg"}'
    },
    'birds of paradise': {
        id: 'birds-of-paradise-id',
        name: 'Birds of Paradise',
        cmc: 1,
        colors: '["G"]',
        type_line: 'Creature — Bird',
        oracle_text: 'Flying\n{T}: Add one mana of any color.',
        keywords: '["Flying"]',
        image_uris: '{"normal":"https://example.com/birds.jpg"}'
    }
};

// Mock scryfall database - create a chainable query builder
jest.mock('../../models/scryfallDb', () => {
    const createMockQueryBuilder = () => {
        let whereIds = [];
        let whereNames = [];

        const queryBuilder = {
            select: jest.fn().mockReturnThis(),
            where: jest.fn().mockImplementation((field, value) => {
                if (field === 'id') whereIds.push(value);
                if (field === 'name') whereNames.push(value?.toLowerCase?.() || value);
                return queryBuilder;
            }),
            whereIn: jest.fn().mockImplementation((field, values) => {
                if (field === 'id') whereIds = values;
                if (field === 'name') whereNames = values.map(v => v?.toLowerCase?.() || v);
                return queryBuilder;
            }),
            first: jest.fn().mockImplementation(() => {
                // Return first matching card by ID or name
                for (const id of whereIds) {
                    const card = Object.values(scryfallCardData).find(c => c.id === id);
                    if (card) return Promise.resolve(card);
                }
                for (const name of whereNames) {
                    const card = scryfallCardData[name?.toLowerCase?.() || name];
                    if (card) return Promise.resolve(card);
                }
                return Promise.resolve(null);
            }),
            then: jest.fn().mockImplementation((callback) => {
                // Return all matching cards for whereIn queries
                const results = [];
                for (const id of whereIds) {
                    const card = Object.values(scryfallCardData).find(c => c.id === id);
                    if (card) results.push(card);
                }
                for (const name of whereNames) {
                    const card = scryfallCardData[name?.toLowerCase?.() || name];
                    if (card && !results.find(r => r.id === card.id)) results.push(card);
                }
                return Promise.resolve(results).then(callback);
            })
        };

        return queryBuilder;
    };

    const mockDb = jest.fn().mockImplementation(() => createMockQueryBuilder());
    mockDb.raw = jest.fn((sql) => sql);
    return mockDb;
});

const app = require('../../server');

describe('Metagame API', () => {
    let leagueId;
    let userId;
    let token;

    // Helper to set up a basic test user and league
    // Called at the start of each test that needs them
    async function setupUserAndLeague() {
        const authData = await getAuthTokenWithRole('league_user');
        token = authData.token;
        userId = authData.userId;
        leagueId = await createTestLeague({ name: 'Test Meta League' });
        await addUserToLeague(userId, leagueId);
        return { token, userId, leagueId };
    }

    describe('GET /api/leagues/:leagueId/metagame/analysis', () => {
        it('should return empty metagame stats for league with no decks', async () => {
            await setupUserAndLeague();

            const res = await request(app)
                .get(`/api/leagues/${leagueId}/metagame/analysis`)
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(200);
            expect(res.body.totalDecks).toBe(0);
            expect(res.body.message).toBe('No decks found in this league');
        });

        it('should return 401 without authentication', async () => {
            await setupUserAndLeague();

            const res = await request(app)
                .get(`/api/leagues/${leagueId}/metagame/analysis`);

            expect(res.status).toBe(401);
        });

        it('should return 403 without proper permissions', async () => {
            await setupUserAndLeague();

            // Create user without league_view_details permission (use 'user' role which has minimal permissions)
            const { token: unauthorizedToken } = await getAuthTokenWithRole('user');

            const res = await request(app)
                .get(`/api/leagues/${leagueId}/metagame/analysis`)
                .set('Authorization', `Bearer ${unauthorizedToken}`);

            expect(res.status).toBe(403);
        });

        it('should analyze decks with basic card data', async () => {
            await setupUserAndLeague();

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
            await setupUserAndLeague();

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
            await setupUserAndLeague();

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
            await setupUserAndLeague();

            // Create 2 users with decks, both having Sol Ring
            const deck1 = 'deck-1';
            const deck2 = 'deck-2';

            // Create second user
            const { userId: user2Id } = await getAuthTokenWithRole('league_user');
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
            await setupUserAndLeague();

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
            await setupUserAndLeague();

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

        it('should exclude ALL lands (including non-basic) from mana curve', async () => {
            await setupUserAndLeague();

            const deckId = 'nonbasic-lands-deck';
            await db('decks').insert({
                id: deckId,
                name: 'Nonbasic Lands Deck',
                decklist_url: 'https://moxfield.com/test',
                platform: 'moxfield',
                commanders: JSON.stringify([{ name: 'Test Commander' }]),
                cards: JSON.stringify([
                    { name: 'Command Tower', scryfall_id: 'command-tower-id' },  // Non-basic land, CMC 0
                    { name: 'Sol Ring', scryfall_id: 'sol-ring-id' },            // CMC 1
                    { name: 'Arcane Signet', scryfall_id: 'arcane-signet-id' },  // CMC 2
                    { name: 'Cultivate', scryfall_id: 'cultivate-id' }           // CMC 3
                ])
            });

            await db('user_leagues')
                .where({ user_id: userId, league_id: leagueId })
                .update({ deck_id: deckId });

            const res = await request(app)
                .get(`/api/leagues/${leagueId}/metagame/analysis`)
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(200);

            // Command Tower should NOT be in the mana curve (it's a land)
            // Only 3 non-land cards should be counted
            const cmcDistribution = res.body.manaCurve.distribution;
            const totalCardsInCurve = cmcDistribution.reduce((sum, entry) => sum + entry.count, 0);

            // Should only be 3 cards (Sol Ring, Arcane Signet, Cultivate)
            expect(totalCardsInCurve).toBe(3);

            // Average CMC should be (1 + 2 + 3) / 3 = 2.0
            expect(res.body.manaCurve.averageCmc).toBe(2);
        });

        it('should NOT count Smothering Tithe as card draw (it creates treasures)', async () => {
            await setupUserAndLeague();

            const deckId = 'false-positive-deck';
            await db('decks').insert({
                id: deckId,
                name: 'False Positive Test Deck',
                decklist_url: 'https://moxfield.com/test',
                platform: 'moxfield',
                commanders: JSON.stringify([{ name: 'Test Commander' }]),
                cards: JSON.stringify([
                    { name: 'Smothering Tithe', scryfall_id: 'smothering-tithe-id' },  // NOT card draw
                    { name: 'Rhystic Study', scryfall_id: 'rhystic-study-id' }         // IS card draw
                ])
            });

            await db('user_leagues')
                .where({ user_id: userId, league_id: leagueId })
                .update({ deck_id: deckId });

            const res = await request(app)
                .get(`/api/leagues/${leagueId}/metagame/analysis`)
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(200);

            // Smothering Tithe says "draws a card" in its text (referring to opponent)
            // but it creates treasures, not card draw for you
            // The improved keywords should only match "you may draw a card"
            // which Rhystic Study has but Smothering Tithe doesn't
            // Only Rhystic Study should count as card draw
            expect(res.body.resources.cardDraw.totalCount).toBe(1);
        });

        it('should NOT count Viscera Seer as removal (it\'s a sacrifice outlet)', async () => {
            await setupUserAndLeague();

            const deckId = 'sacrifice-deck';
            await db('decks').insert({
                id: deckId,
                name: 'Sacrifice Test Deck',
                decklist_url: 'https://moxfield.com/test',
                platform: 'moxfield',
                commanders: JSON.stringify([{ name: 'Test Commander' }]),
                cards: JSON.stringify([
                    { name: 'Viscera Seer', scryfall_id: 'viscera-seer-id' },           // NOT removal (sacrifice outlet)
                    { name: 'Swords to Plowshares', scryfall_id: 'swords-to-plowshares-id' }  // IS removal
                ])
            });

            await db('user_leagues')
                .where({ user_id: userId, league_id: leagueId })
                .update({ deck_id: deckId });

            const res = await request(app)
                .get(`/api/leagues/${leagueId}/metagame/analysis`)
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(200);

            // Viscera Seer has "Sacrifice a creature" but that's a cost, not removal
            // Swords to Plowshares has "Exile target creature" which IS removal
            // Only Swords should count as removal
            expect(res.body.interaction.removal).toBe(1);
        });

        it('should detect targeted removal correctly', async () => {
            await setupUserAndLeague();

            const deckId = 'removal-deck';
            await db('decks').insert({
                id: deckId,
                name: 'Removal Test Deck',
                decklist_url: 'https://moxfield.com/test',
                platform: 'moxfield',
                commanders: JSON.stringify([{ name: 'Test Commander' }]),
                cards: JSON.stringify([
                    { name: 'Swords to Plowshares', scryfall_id: 'swords-to-plowshares-id' },  // Exile target creature
                    { name: 'Path to Exile', scryfall_id: 'path-to-exile-id' }                 // Exile target creature
                ])
            });

            await db('user_leagues')
                .where({ user_id: userId, league_id: leagueId })
                .update({ deck_id: deckId });

            const res = await request(app)
                .get(`/api/leagues/${leagueId}/metagame/analysis`)
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(200);

            // Both Swords and Path should be detected as removal
            expect(res.body.interaction.removal).toBe(2);
        });

        it('should detect board wipes correctly', async () => {
            await setupUserAndLeague();

            const deckId = 'boardwipe-deck';
            await db('decks').insert({
                id: deckId,
                name: 'Board Wipe Test Deck',
                decklist_url: 'https://moxfield.com/test',
                platform: 'moxfield',
                commanders: JSON.stringify([{ name: 'Test Commander' }]),
                cards: JSON.stringify([
                    { name: 'Wrath of God', scryfall_id: 'wrath-of-god-id' }  // Destroy all creatures
                ])
            });

            await db('user_leagues')
                .where({ user_id: userId, league_id: leagueId })
                .update({ deck_id: deckId });

            const res = await request(app)
                .get(`/api/leagues/${leagueId}/metagame/analysis`)
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(200);

            // Wrath of God should be detected as a board wipe
            expect(res.body.interaction.boardWipes).toBe(1);
        });

        it('should detect mana dorks as ramp', async () => {
            await setupUserAndLeague();

            const deckId = 'mana-dork-deck';
            await db('decks').insert({
                id: deckId,
                name: 'Mana Dork Test Deck',
                decklist_url: 'https://moxfield.com/test',
                platform: 'moxfield',
                commanders: JSON.stringify([{ name: 'Test Commander' }]),
                cards: JSON.stringify([
                    { name: 'Llanowar Elves', scryfall_id: 'llanowar-elves-id' },    // {T}: Add G
                    { name: 'Birds of Paradise', scryfall_id: 'birds-of-paradise-id' }  // {T}: Add any color
                ])
            });

            await db('user_leagues')
                .where({ user_id: userId, league_id: leagueId })
                .update({ deck_id: deckId });

            const res = await request(app)
                .get(`/api/leagues/${leagueId}/metagame/analysis`)
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(200);

            // Both mana dorks should be detected as ramp
            expect(res.body.resources.ramp.totalCount).toBe(2);
        });
    });

    describe('GET /api/leagues/:leagueId/metagame/card/:cardName', () => {
        it('should return card statistics', async () => {
            await setupUserAndLeague();

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
            await setupUserAndLeague();

            const res = await request(app)
                .get(`/api/leagues/${leagueId}/metagame/card/Sol Ring`);

            expect(res.status).toBe(401);
        });

        it('should return 403 without proper permissions', async () => {
            await setupUserAndLeague();

            const { token: unauthorizedToken } = await getAuthTokenWithRole('user');

            const res = await request(app)
                .get(`/api/leagues/${leagueId}/metagame/card/Sol Ring`)
                .set('Authorization', `Bearer ${unauthorizedToken}`);

            expect(res.status).toBe(403);
        });
    });

    describe('GET /api/leagues/:leagueId/metagame/turn-order', () => {
        it('should return empty stats when no completed games exist', async () => {
            await setupUserAndLeague();

            const res = await request(app)
                .get(`/api/leagues/${leagueId}/metagame/turn-order`)
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(200);
            expect(res.body.turnOrderStats).toEqual([]);
            expect(res.body.totalGames).toBe(0);
            expect(res.body.message).toBe('No completed games with turn order data found');
        });

        it('should return 401 without authentication', async () => {
            await setupUserAndLeague();

            const res = await request(app)
                .get(`/api/leagues/${leagueId}/metagame/turn-order`);

            expect(res.status).toBe(401);
        });

        it('should return 403 without proper permissions', async () => {
            await setupUserAndLeague();

            const { token: unauthorizedToken } = await getAuthTokenWithRole('user');

            const res = await request(app)
                .get(`/api/leagues/${leagueId}/metagame/turn-order`)
                .set('Authorization', `Bearer ${unauthorizedToken}`);

            expect(res.status).toBe(403);
        });

        it('should calculate turn order win rates correctly', async () => {
            await setupUserAndLeague();

            // Create additional users
            const { userId: user2Id } = await getAuthTokenWithRole('league_user');
            const { userId: user3Id } = await getAuthTokenWithRole('league_user');
            const { userId: user4Id } = await getAuthTokenWithRole('league_user');

            await addUserToLeague(user2Id, leagueId);
            await addUserToLeague(user3Id, leagueId);
            await addUserToLeague(user4Id, leagueId);

            // Create a completed pod with turn order data
            const [podId] = await db('game_pods').insert({
                league_id: leagueId,
                creator_id: userId,
                confirmation_status: 'complete'
            });

            // Add players with turn order and results
            // User 1 is first and wins
            await db('game_players').insert([
                { pod_id: podId, player_id: userId, turn_order: 1, result: 'win', confirmed: 1 },
                { pod_id: podId, player_id: user2Id, turn_order: 2, result: 'loss', confirmed: 1 },
                { pod_id: podId, player_id: user3Id, turn_order: 3, result: 'loss', confirmed: 1 },
                { pod_id: podId, player_id: user4Id, turn_order: 4, result: 'loss', confirmed: 1 }
            ]);

            const res = await request(app)
                .get(`/api/leagues/${leagueId}/metagame/turn-order`)
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(200);
            expect(res.body.totalGames).toBe(1);
            expect(Array.isArray(res.body.turnOrderStats)).toBe(true);
            expect(res.body.turnOrderStats.length).toBe(4);

            // Check first position stats
            const firstPosition = res.body.turnOrderStats.find(s => s.position === 1);
            expect(firstPosition).toBeDefined();
            expect(firstPosition.wins).toBe(1);
            expect(firstPosition.gamesPlayed).toBe(1);
            expect(firstPosition.winRate).toBe(100);

            // Check second position stats
            const secondPosition = res.body.turnOrderStats.find(s => s.position === 2);
            expect(secondPosition).toBeDefined();
            expect(secondPosition.wins).toBe(0);
            expect(secondPosition.gamesPlayed).toBe(1);
            expect(secondPosition.winRate).toBe(0);
        });

        it('should show limited data message when less than 10 games', async () => {
            await setupUserAndLeague();

            // Create one completed game
            const { userId: user2Id } = await getAuthTokenWithRole('league_user');
            await addUserToLeague(user2Id, leagueId);

            const [podId] = await db('game_pods').insert({
                league_id: leagueId,
                creator_id: userId,
                confirmation_status: 'complete'
            });

            await db('game_players').insert([
                { pod_id: podId, player_id: userId, turn_order: 1, result: 'win', confirmed: 1 },
                { pod_id: podId, player_id: user2Id, turn_order: 2, result: 'loss', confirmed: 1 }
            ]);

            const res = await request(app)
                .get(`/api/leagues/${leagueId}/metagame/turn-order`)
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(200);
            expect(res.body.message).toBe('Limited data - statistics may not be statistically significant');
        });

        it('should count draw games correctly', async () => {
            await setupUserAndLeague();

            const { userId: user2Id } = await getAuthTokenWithRole('league_user');
            await addUserToLeague(user2Id, leagueId);

            const [podId] = await db('game_pods').insert({
                league_id: leagueId,
                creator_id: userId,
                confirmation_status: 'complete'
            });

            // Both players have draw result
            await db('game_players').insert([
                { pod_id: podId, player_id: userId, turn_order: 1, result: 'draw', confirmed: 1 },
                { pod_id: podId, player_id: user2Id, turn_order: 2, result: 'draw', confirmed: 1 }
            ]);

            const res = await request(app)
                .get(`/api/leagues/${leagueId}/metagame/turn-order`)
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(200);
            expect(res.body.gamesWithDraws).toBe(1);
        });

        it('should only include completed games', async () => {
            await setupUserAndLeague();

            const { userId: user2Id } = await getAuthTokenWithRole('league_user');
            await addUserToLeague(user2Id, leagueId);

            // Create an active (not completed) pod
            const [activePodId] = await db('game_pods').insert({
                league_id: leagueId,
                creator_id: userId,
                confirmation_status: 'active'
            });

            await db('game_players').insert([
                { pod_id: activePodId, player_id: userId, turn_order: 1, result: null, confirmed: 0 },
                { pod_id: activePodId, player_id: user2Id, turn_order: 2, result: null, confirmed: 0 }
            ]);

            const res = await request(app)
                .get(`/api/leagues/${leagueId}/metagame/turn-order`)
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(200);
            expect(res.body.totalGames).toBe(0);
        });
    });
});
