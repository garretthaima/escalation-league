const request = require('supertest');
const { getAuthToken } = require('../helpers/authHelper');

// Mock the main database
jest.mock('../../models/db', () => require('../helpers/testDb'));

// Mock the settings utility
jest.mock('../../utils/settingsUtils', () => ({
    getSetting: jest.fn((key) => {
        if (key === 'secret_key') {
            return Promise.resolve(process.env.JWT_SECRET || 'test-secret-key');
        }
        return Promise.resolve(null);
    })
}));

// Mock the Scryfall database
jest.mock('../../models/scryfallDb', () => {
    const mockQuery = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        whereRaw: jest.fn().mockReturnThis(),
        whereNot: jest.fn().mockReturnThis(),
        whereNotExists: jest.fn().mockReturnThis(),
        andWhereRaw: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        first: jest.fn(),
        then: jest.fn()
    };
    const scryfallDb = jest.fn(() => mockQuery);
    scryfallDb.raw = jest.fn((sql) => sql);
    return scryfallDb;
});

// Mock Redis client
jest.mock('../../utils/redisClient', () => ({
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue('OK'),
    setex: jest.fn().mockResolvedValue('OK'),
    del: jest.fn().mockResolvedValue(1)
}));

const app = require('../../server');
const scryfallDb = require('../../models/scryfallDb');
const redis = require('../../utils/redisClient');

describe('Scryfall Routes', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        // Reset redis mock to return null (cache miss) by default
        redis.get.mockResolvedValue(null);
        redis.setex.mockResolvedValue('OK');
    });

    describe('GET /api/scryfall/autocomplete', () => {
        const mockAutocompleteResults = [
            { name: 'Atraxa, Praetors\' Voice', image_uris: JSON.stringify({ small: 'https://example.com/atraxa.jpg' }) },
            { name: 'Atris, Oracle of Half-Truths', image_uris: JSON.stringify({ small: 'https://example.com/atris.jpg' }) }
        ];

        it('should return autocomplete suggestions', async () => {
            const { token } = await getAuthToken();

            // Mock the database query chain
            const mockQueryChain = scryfallDb();
            mockQueryChain.limit.mockResolvedValue(mockAutocompleteResults);

            const res = await request(app)
                .get('/api/scryfall/autocomplete')
                .query({ q: 'Atra' })
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(200);
            expect(Array.isArray(res.body)).toBe(true);
            expect(res.body.length).toBe(2);
            expect(res.body[0]).toHaveProperty('name', 'Atraxa, Praetors\' Voice');
            expect(res.body[0]).toHaveProperty('image');
        });

        it('should return 400 when q parameter is missing', async () => {
            const { token } = await getAuthToken();

            const res = await request(app)
                .get('/api/scryfall/autocomplete')
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(400);
            expect(res.body).toHaveProperty('error', 'The "q" query parameter is required.');
        });

        it('should return cached data on cache hit', async () => {
            const { token } = await getAuthToken();

            const cachedData = [
                { name: 'Cached Card', image: 'https://example.com/cached.jpg' }
            ];
            redis.get.mockResolvedValue(JSON.stringify(cachedData));

            const res = await request(app)
                .get('/api/scryfall/autocomplete')
                .query({ q: 'Cached' })
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(200);
            expect(res.body).toEqual(cachedData);
            // Verify database was not called when cache hit
            expect(scryfallDb).not.toHaveBeenCalled();
        });

        it('should apply partner filter when specified', async () => {
            const { token } = await getAuthToken();

            const partnerResults = [
                { name: 'Thrasios, Triton Hero', image_uris: JSON.stringify({ small: 'https://example.com/thrasios.jpg' }) }
            ];

            const mockQueryChain = scryfallDb();
            mockQueryChain.limit.mockResolvedValue(partnerResults);

            const res = await request(app)
                .get('/api/scryfall/autocomplete')
                .query({ q: 'Thra', filter: 'partner' })
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(200);
            expect(res.body[0]).toHaveProperty('name', 'Thrasios, Triton Hero');
        });

        it('should apply background filter when specified', async () => {
            const { token } = await getAuthToken();

            const backgroundResults = [
                { name: 'Candlekeep Sage', image_uris: JSON.stringify({ small: 'https://example.com/sage.jpg' }) }
            ];

            const mockQueryChain = scryfallDb();
            mockQueryChain.limit.mockResolvedValue(backgroundResults);

            const res = await request(app)
                .get('/api/scryfall/autocomplete')
                .query({ q: 'Candle', filter: 'background' })
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(200);
            expect(res.body[0]).toHaveProperty('name', 'Candlekeep Sage');
        });

        it('should return 500 on database error', async () => {
            const { token } = await getAuthToken();

            const mockQueryChain = scryfallDb();
            mockQueryChain.limit.mockRejectedValue(new Error('Database connection failed'));

            const res = await request(app)
                .get('/api/scryfall/autocomplete')
                .query({ q: 'Error' })
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(500);
            expect(res.body).toHaveProperty('error', 'Failed to fetch autocomplete suggestions.');
        });

        it('should handle cards with null image_uris', async () => {
            const { token } = await getAuthToken();

            const resultsWithNullImage = [
                { name: 'Card Without Image', image_uris: null }
            ];

            const mockQueryChain = scryfallDb();
            mockQueryChain.limit.mockResolvedValue(resultsWithNullImage);

            const res = await request(app)
                .get('/api/scryfall/autocomplete')
                .query({ q: 'Card' })
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(200);
            expect(res.body[0]).toHaveProperty('image', null);
        });

        it('should require authentication', async () => {
            const res = await request(app)
                .get('/api/scryfall/autocomplete')
                .query({ q: 'Atra' });

            expect(res.status).toBe(401);
        });
    });

    describe('GET /api/scryfall/autocomplete-with-prices', () => {
        const mockPriceResults = [
            { name: 'Sol Ring', usd: '1.50', usd_foil: '5.00', usd_etched: null },
            { name: 'Sol Ring', usd: '0.75', usd_foil: '3.00', usd_etched: null },
            { name: 'Solemn Simulacrum', usd: '0.50', usd_foil: '2.00', usd_etched: '1.50' }
        ];

        it('should return autocomplete with prices', async () => {
            const { token } = await getAuthToken();

            const mockQueryChain = scryfallDb();
            mockQueryChain.limit.mockResolvedValue(mockPriceResults);

            const res = await request(app)
                .get('/api/scryfall/autocomplete-with-prices')
                .query({ q: 'Sol' })
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(200);
            expect(Array.isArray(res.body)).toBe(true);
            // Results should be grouped by name and show cheapest price
            expect(res.body.find(c => c.name === 'Sol Ring')).toHaveProperty('price', '0.75');
            expect(res.body.find(c => c.name === 'Solemn Simulacrum')).toHaveProperty('price', '0.50');
        });

        it('should return 400 when q parameter is missing', async () => {
            const { token } = await getAuthToken();

            const res = await request(app)
                .get('/api/scryfall/autocomplete-with-prices')
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(400);
            expect(res.body).toHaveProperty('error', 'The "q" query parameter is required.');
        });

        it('should return cached data on cache hit', async () => {
            const { token } = await getAuthToken();

            const cachedData = [
                { name: 'Cached Card', price: '5.00' }
            ];
            redis.get.mockResolvedValue(JSON.stringify(cachedData));

            const res = await request(app)
                .get('/api/scryfall/autocomplete-with-prices')
                .query({ q: 'Cached' })
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(200);
            expect(res.body).toEqual(cachedData);
        });

        it('should handle cards with no price data', async () => {
            const { token } = await getAuthToken();

            const noPriceResults = [
                { name: 'Promo Card', usd: null, usd_foil: null, usd_etched: null }
            ];

            const mockQueryChain = scryfallDb();
            mockQueryChain.limit.mockResolvedValue(noPriceResults);

            const res = await request(app)
                .get('/api/scryfall/autocomplete-with-prices')
                .query({ q: 'Promo' })
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(200);
            expect(res.body[0]).toHaveProperty('price', null);
        });

        it('should return 500 on database error', async () => {
            const { token } = await getAuthToken();

            const mockQueryChain = scryfallDb();
            mockQueryChain.limit.mockRejectedValue(new Error('Database error'));

            const res = await request(app)
                .get('/api/scryfall/autocomplete-with-prices')
                .query({ q: 'Error' })
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(500);
            expect(res.body).toHaveProperty('error', 'Failed to fetch autocomplete suggestions.');
        });

        it('should require authentication', async () => {
            const res = await request(app)
                .get('/api/scryfall/autocomplete-with-prices')
                .query({ q: 'Sol' });

            expect(res.status).toBe(401);
        });

        it('should limit results to 20 cards', async () => {
            const { token } = await getAuthToken();

            // Generate 30 mock results
            const manyResults = Array.from({ length: 30 }, (_, i) => ({
                name: `Card ${String(i).padStart(2, '0')}`,
                usd: '1.00',
                usd_foil: null,
                usd_etched: null
            }));

            const mockQueryChain = scryfallDb();
            mockQueryChain.limit.mockResolvedValue(manyResults);

            const res = await request(app)
                .get('/api/scryfall/autocomplete-with-prices')
                .query({ q: 'Card' })
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(200);
            expect(res.body.length).toBeLessThanOrEqual(20);
        });
    });

    describe('GET /api/scryfall/cards/named', () => {
        const mockCardData = {
            id: 'abc123',
            name: 'Lightning Bolt',
            type_line: 'Instant',
            oracle_text: 'Lightning Bolt deals 3 damage to any target.',
            image_uris: JSON.stringify({ normal: 'https://example.com/bolt.jpg', small: 'https://example.com/bolt_small.jpg' }),
            prices: JSON.stringify({ usd: '1.50', usd_foil: '5.00' }),
            legalities: JSON.stringify({ commander: 'legal', standard: 'not_legal' }),
            colors: JSON.stringify(['R']),
            color_identity: JSON.stringify(['R']),
            games: JSON.stringify(['paper', 'mtgo']),
            card_faces: null,
            keywords: JSON.stringify([]),
            released_at: '2023-01-01'
        };

        it('should return card by exact name', async () => {
            const { token } = await getAuthToken();

            const mockQueryChain = scryfallDb();
            mockQueryChain.first.mockResolvedValue(mockCardData);

            const res = await request(app)
                .get('/api/scryfall/cards/named')
                .query({ exact: 'Lightning Bolt' })
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('name', 'Lightning Bolt');
            expect(res.body).toHaveProperty('image_uris');
            expect(res.body.image_uris).toHaveProperty('normal');
        });

        it('should return 400 when exact parameter is missing', async () => {
            const { token } = await getAuthToken();

            const res = await request(app)
                .get('/api/scryfall/cards/named')
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(400);
            expect(res.body).toHaveProperty('error', 'The "exact" query parameter is required.');
        });

        it('should return 404 when card not found', async () => {
            const { token } = await getAuthToken();

            const mockQueryChain = scryfallDb();
            mockQueryChain.first.mockResolvedValue(null);

            const res = await request(app)
                .get('/api/scryfall/cards/named')
                .query({ exact: 'Nonexistent Card' })
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(404);
            expect(res.body).toHaveProperty('error', 'Card not found.');
        });

        it('should return cached data on cache hit', async () => {
            const { token } = await getAuthToken();

            const cachedCard = {
                id: 'cached123',
                name: 'Cached Card',
                image_uris: { normal: 'https://example.com/cached.jpg' }
            };
            redis.get.mockResolvedValue(JSON.stringify(cachedCard));

            const res = await request(app)
                .get('/api/scryfall/cards/named')
                .query({ exact: 'Cached Card' })
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(200);
            expect(res.body).toEqual(cachedCard);
        });

        it('should cache card data for 1 hour', async () => {
            const { token } = await getAuthToken();

            const mockQueryChain = scryfallDb();
            mockQueryChain.first.mockResolvedValue(mockCardData);

            await request(app)
                .get('/api/scryfall/cards/named')
                .query({ exact: 'Lightning Bolt' })
                .set('Authorization', `Bearer ${token}`);

            // Verify setex was called with 3600 seconds (1 hour)
            expect(redis.setex).toHaveBeenCalledWith(
                expect.stringContaining('card-by-name:'),
                3600,
                expect.any(String)
            );
        });

        it('should return 500 on database error', async () => {
            const { token } = await getAuthToken();

            const mockQueryChain = scryfallDb();
            mockQueryChain.first.mockRejectedValue(new Error('Database error'));

            const res = await request(app)
                .get('/api/scryfall/cards/named')
                .query({ exact: 'Error Card' })
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(500);
            expect(res.body).toHaveProperty('error', 'Failed to fetch card details.');
        });

        it('should require authentication', async () => {
            const res = await request(app)
                .get('/api/scryfall/cards/named')
                .query({ exact: 'Lightning Bolt' });

            expect(res.status).toBe(401);
        });

        it('should parse JSON fields correctly', async () => {
            const { token } = await getAuthToken();

            const mockQueryChain = scryfallDb();
            mockQueryChain.first.mockResolvedValue(mockCardData);

            const res = await request(app)
                .get('/api/scryfall/cards/named')
                .query({ exact: 'Lightning Bolt' })
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(200);
            // Verify JSON fields are parsed
            expect(res.body.colors).toEqual(['R']);
            expect(res.body.legalities).toHaveProperty('commander', 'legal');
        });
    });

    describe('GET /api/scryfall/cards/:id', () => {
        const mockCardById = {
            id: 'uuid-123-456',
            name: 'Sol Ring',
            image_normal: '"https://example.com/sol_normal.jpg"',
            image_large: '"https://example.com/sol_large.jpg"',
            image_small: '"https://example.com/sol_small.jpg"',
            card_faces: null
        };

        it('should return card by ID', async () => {
            const { token } = await getAuthToken();

            const mockQueryChain = scryfallDb();
            mockQueryChain.first.mockResolvedValue(mockCardById);

            const res = await request(app)
                .get('/api/scryfall/cards/uuid-123-456')
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('id', 'uuid-123-456');
            expect(res.body).toHaveProperty('name', 'Sol Ring');
            expect(res.body).toHaveProperty('image_uris');
            expect(res.body.image_uris).toHaveProperty('normal');
        });

        it('should return 404 when card not found', async () => {
            const { token } = await getAuthToken();

            const mockQueryChain = scryfallDb();
            mockQueryChain.first.mockResolvedValue(null);

            const res = await request(app)
                .get('/api/scryfall/cards/nonexistent-uuid')
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(404);
            expect(res.body).toHaveProperty('error', 'Card not found.');
        });

        it('should return 500 on database error', async () => {
            const { token } = await getAuthToken();

            const mockQueryChain = scryfallDb();
            mockQueryChain.first.mockRejectedValue(new Error('Database error'));

            const res = await request(app)
                .get('/api/scryfall/cards/error-uuid')
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(500);
            expect(res.body).toHaveProperty('error', 'Failed to fetch card by ID.');
        });

        it('should require authentication', async () => {
            const res = await request(app)
                .get('/api/scryfall/cards/uuid-123-456');

            expect(res.status).toBe(401);
        });

        it('should handle double-faced cards with card_faces', async () => {
            const { token } = await getAuthToken();

            // The controller's safeParseOrReturn function:
            // - Returns null if !val
            // - Returns val directly if typeof val !== 'string'
            // - Returns val if it starts with 'http' or doesn't start with '"'
            // - Otherwise tries to JSON.parse
            // So for an array, we should pass the already-parsed array directly
            // as if MySQL returned a pre-parsed JSON value
            const doubleFacedCard = {
                id: 'dfc-uuid',
                name: 'Delver of Secrets // Insectile Aberration',
                image_normal: null,
                image_large: null,
                image_small: null,
                card_faces: [
                    { name: 'Delver of Secrets', image_uris: { normal: 'https://example.com/delver_front.jpg' } },
                    { name: 'Insectile Aberration', image_uris: { normal: 'https://example.com/delver_back.jpg' } }
                ]
            };

            const mockQueryChain = scryfallDb();
            mockQueryChain.first.mockResolvedValue(doubleFacedCard);

            const res = await request(app)
                .get('/api/scryfall/cards/dfc-uuid')
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('card_faces');
            expect(Array.isArray(res.body.card_faces)).toBe(true);
            expect(res.body.card_faces.length).toBe(2);
        });

        it('should handle image URIs that are already URLs', async () => {
            const { token } = await getAuthToken();

            const cardWithUrlImages = {
                id: 'url-image-uuid',
                name: 'Test Card',
                image_normal: 'https://example.com/image.jpg', // Already a URL, not JSON
                image_large: 'https://example.com/large.jpg',
                image_small: 'https://example.com/small.jpg',
                card_faces: null
            };

            const mockQueryChain = scryfallDb();
            mockQueryChain.first.mockResolvedValue(cardWithUrlImages);

            const res = await request(app)
                .get('/api/scryfall/cards/url-image-uuid')
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(200);
            expect(res.body.image_uris.normal).toBe('https://example.com/image.jpg');
        });
    });

    describe('GET /api/scryfall/cards/cheapest', () => {
        const mockCheapestPrintings = [
            {
                id: 'printing-1',
                name: 'Lightning Bolt',
                set_name: 'Mystery Booster',
                set_code: 'mb1',
                border_color: 'black',
                type_line: 'Instant',
                set_type: 'masters',
                usd: '2.00',
                usd_foil: '10.00',
                usd_etched: null,
                image_uri: '"https://example.com/bolt1.jpg"',
                card_faces: null,
                commander_legal: '"legal"'
            },
            {
                id: 'printing-2',
                name: 'Lightning Bolt',
                set_name: 'Double Masters',
                set_code: '2xm',
                border_color: 'black',
                type_line: 'Instant',
                set_type: 'masters',
                usd: '1.50',
                usd_foil: '5.00',
                usd_etched: null,
                image_uri: '"https://example.com/bolt2.jpg"',
                card_faces: null,
                commander_legal: '"legal"'
            }
        ];

        it('should return cheapest printing of a card', async () => {
            const { token } = await getAuthToken();

            // Mock whereNotExists to resolve with the array
            const mockQueryChain = scryfallDb();
            mockQueryChain.whereNotExists.mockResolvedValue(mockCheapestPrintings);

            const res = await request(app)
                .get('/api/scryfall/cards/cheapest')
                .query({ name: 'Lightning Bolt' })
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('name', 'Lightning Bolt');
            // Should return the printing with the lowest price ($1.50)
            expect(res.body).toHaveProperty('id', 'printing-2');
            expect(res.body.prices.usd).toBe(1.50);
        });

        it('should return 400 when name parameter is missing', async () => {
            const { token } = await getAuthToken();

            const res = await request(app)
                .get('/api/scryfall/cards/cheapest')
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(400);
            expect(res.body).toHaveProperty('error', 'Card name is required.');
        });

        it('should return 404 when no printings found', async () => {
            const { token } = await getAuthToken();

            const mockQueryChain = scryfallDb();
            mockQueryChain.whereNotExists.mockResolvedValue([]);

            const res = await request(app)
                .get('/api/scryfall/cards/cheapest')
                .query({ name: 'Nonexistent Card' })
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(404);
            expect(res.body).toHaveProperty('error', 'Card not found.');
        });

        it('should return 404 when no price data available', async () => {
            const { token } = await getAuthToken();

            const noPriceData = [
                {
                    id: 'no-price',
                    name: 'Promo Card',
                    set_name: 'Promo Pack',
                    usd: null,
                    usd_foil: null,
                    usd_etched: null,
                    image_uri: null,
                    card_faces: null
                }
            ];

            const mockQueryChain = scryfallDb();
            mockQueryChain.whereNotExists.mockResolvedValue(noPriceData);

            const res = await request(app)
                .get('/api/scryfall/cards/cheapest')
                .query({ name: 'Promo Card' })
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(404);
            expect(res.body).toHaveProperty('error', 'No price data available for this card.');
        });

        it('should return 500 on database error', async () => {
            const { token } = await getAuthToken();

            const mockQueryChain = scryfallDb();
            mockQueryChain.whereNotExists.mockRejectedValue(new Error('Database error'));

            const res = await request(app)
                .get('/api/scryfall/cards/cheapest')
                .query({ name: 'Error Card' })
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(500);
            expect(res.body).toHaveProperty('error', 'Failed to fetch cheapest printing.');
        });

        it('should require authentication', async () => {
            const res = await request(app)
                .get('/api/scryfall/cards/cheapest')
                .query({ name: 'Lightning Bolt' });

            expect(res.status).toBe(401);
        });

        it('should prefer foil price when it is cheapest', async () => {
            const { token } = await getAuthToken();

            const foilCheaper = [
                {
                    id: 'foil-cheap',
                    name: 'Test Card',
                    set_name: 'Test Set',
                    usd: '5.00',
                    usd_foil: '2.00',
                    usd_etched: null,
                    image_uri: '"https://example.com/test.jpg"',
                    card_faces: null
                }
            ];

            const mockQueryChain = scryfallDb();
            mockQueryChain.whereNotExists.mockResolvedValue(foilCheaper);

            const res = await request(app)
                .get('/api/scryfall/cards/cheapest')
                .query({ name: 'Test Card' })
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(200);
            // The response should be based on the cheapest price (foil at $2.00)
            expect(res.body.prices.usd_foil).toBe(2.00);
        });

        it('should prefer etched price when it is cheapest', async () => {
            const { token } = await getAuthToken();

            const etchedCheaper = [
                {
                    id: 'etched-cheap',
                    name: 'Test Card',
                    set_name: 'Test Set',
                    usd: '5.00',
                    usd_foil: '4.00',
                    usd_etched: '1.50',
                    image_uri: '"https://example.com/test.jpg"',
                    card_faces: null
                }
            ];

            const mockQueryChain = scryfallDb();
            mockQueryChain.whereNotExists.mockResolvedValue(etchedCheaper);

            const res = await request(app)
                .get('/api/scryfall/cards/cheapest')
                .query({ name: 'Test Card' })
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(200);
            expect(res.body.prices.usd_etched).toBe(1.50);
        });

        it('should handle double-faced cards in cheapest printing', async () => {
            const { token } = await getAuthToken();

            const dfcPrinting = [
                {
                    id: 'dfc-printing',
                    name: 'Delver of Secrets // Insectile Aberration',
                    set_name: 'Innistrad',
                    usd: '1.00',
                    usd_foil: '5.00',
                    usd_etched: null,
                    image_uri: null,
                    card_faces: JSON.stringify([
                        { name: 'Delver of Secrets', image_uris: { normal: 'https://example.com/front.jpg' } },
                        { name: 'Insectile Aberration', image_uris: { normal: 'https://example.com/back.jpg' } }
                    ])
                }
            ];

            const mockQueryChain = scryfallDb();
            mockQueryChain.whereNotExists.mockResolvedValue(dfcPrinting);

            const res = await request(app)
                .get('/api/scryfall/cards/cheapest')
                .query({ name: 'Delver of Secrets // Insectile Aberration' })
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('card_faces');
            expect(Array.isArray(res.body.card_faces)).toBe(true);
        });

        it('should handle image_uri that is already a URL string', async () => {
            const { token } = await getAuthToken();

            const urlImagePrinting = [
                {
                    id: 'url-image',
                    name: 'Test Card',
                    set_name: 'Test Set',
                    usd: '1.00',
                    usd_foil: null,
                    usd_etched: null,
                    image_uri: 'https://example.com/direct-url.jpg', // Direct URL, not JSON
                    card_faces: null
                }
            ];

            const mockQueryChain = scryfallDb();
            mockQueryChain.whereNotExists.mockResolvedValue(urlImagePrinting);

            const res = await request(app)
                .get('/api/scryfall/cards/cheapest')
                .query({ name: 'Test Card' })
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(200);
            expect(res.body.image_uris.normal).toBe('https://example.com/direct-url.jpg');
        });
    });

    describe('Authentication Requirements', () => {
        it('should return 401 for all endpoints without token', async () => {
            const endpoints = [
                { method: 'get', path: '/api/scryfall/autocomplete', query: { q: 'test' } },
                { method: 'get', path: '/api/scryfall/autocomplete-with-prices', query: { q: 'test' } },
                { method: 'get', path: '/api/scryfall/cards/named', query: { exact: 'test' } },
                { method: 'get', path: '/api/scryfall/cards/test-uuid' },
                { method: 'get', path: '/api/scryfall/cards/cheapest', query: { name: 'test' } }
            ];

            for (const endpoint of endpoints) {
                let req = request(app)[endpoint.method](endpoint.path);
                if (endpoint.query) {
                    req = req.query(endpoint.query);
                }
                const res = await req;
                expect(res.status).toBe(401);
            }
        });

        it('should return 403 for invalid token', async () => {
            const res = await request(app)
                .get('/api/scryfall/autocomplete')
                .query({ q: 'test' })
                .set('Authorization', 'Bearer invalid-token');

            expect(res.status).toBe(403);
        });
    });

    describe('Caching Behavior', () => {
        it('should cache autocomplete results with correct key format', async () => {
            const { token } = await getAuthToken();

            const mockQueryChain = scryfallDb();
            mockQueryChain.limit.mockResolvedValue([]);

            await request(app)
                .get('/api/scryfall/autocomplete')
                .query({ q: 'Test' })
                .set('Authorization', `Bearer ${token}`);

            // Verify cache key includes lowercase query and filter
            expect(redis.setex).toHaveBeenCalledWith(
                'autocomplete-simple:test:all',
                600, // 10 minutes
                expect.any(String)
            );
        });

        it('should include filter in autocomplete cache key', async () => {
            const { token } = await getAuthToken();

            const mockQueryChain = scryfallDb();
            mockQueryChain.limit.mockResolvedValue([]);

            await request(app)
                .get('/api/scryfall/autocomplete')
                .query({ q: 'Test', filter: 'partner' })
                .set('Authorization', `Bearer ${token}`);

            expect(redis.setex).toHaveBeenCalledWith(
                'autocomplete-simple:test:partner',
                600,
                expect.any(String)
            );
        });

        it('should cache autocomplete with prices results', async () => {
            const { token } = await getAuthToken();

            const mockQueryChain = scryfallDb();
            mockQueryChain.limit.mockResolvedValue([]);

            await request(app)
                .get('/api/scryfall/autocomplete-with-prices')
                .query({ q: 'Test' })
                .set('Authorization', `Bearer ${token}`);

            expect(redis.setex).toHaveBeenCalledWith(
                'autocomplete:test',
                600,
                expect.any(String)
            );
        });

        it('should cache card by name with lowercase key', async () => {
            const { token } = await getAuthToken();

            const mockQueryChain = scryfallDb();
            mockQueryChain.first.mockResolvedValue({
                id: 'test-id',
                name: 'Test Card',
                image_uris: null,
                prices: null,
                legalities: null,
                colors: null,
                color_identity: null,
                games: null,
                card_faces: null,
                keywords: null
            });

            await request(app)
                .get('/api/scryfall/cards/named')
                .query({ exact: 'Test Card' })
                .set('Authorization', `Bearer ${token}`);

            expect(redis.setex).toHaveBeenCalledWith(
                'card-by-name:test card',
                3600, // 1 hour
                expect.any(String)
            );
        });
    });
});
