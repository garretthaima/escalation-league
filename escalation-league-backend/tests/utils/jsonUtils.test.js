/**
 * Tests for jsonUtils.js
 * JSON parsing utilities for database fields
 */

const {
    safeParse,
    parseDeckCards,
    parseCommanders,
    parseColors,
    parseImageUri,
    parseLegalities,
    parseKeywords
} = require('../../utils/jsonUtils');

describe('jsonUtils', () => {
    describe('safeParse', () => {
        it('should return default value for null', () => {
            expect(safeParse(null)).toEqual([]);
            expect(safeParse(null, {})).toEqual({});
            expect(safeParse(null, 'default')).toBe('default');
        });

        it('should return default value for undefined', () => {
            expect(safeParse(undefined)).toEqual([]);
            expect(safeParse(undefined, [])).toEqual([]);
        });

        it('should return the field if not a string', () => {
            const array = [1, 2, 3];
            const object = { key: 'value' };

            expect(safeParse(array)).toEqual(array);
            expect(safeParse(object)).toEqual(object);
            expect(safeParse(42)).toBe(42);
            expect(safeParse(true)).toBe(true);
        });

        it('should parse valid JSON strings', () => {
            expect(safeParse('[1, 2, 3]')).toEqual([1, 2, 3]);
            expect(safeParse('{"key": "value"}')).toEqual({ key: 'value' });
            expect(safeParse('"hello"')).toBe('hello');
            expect(safeParse('123')).toBe(123);
            expect(safeParse('true')).toBe(true);
        });

        it('should return default value for invalid JSON strings', () => {
            expect(safeParse('not json')).toEqual([]);
            expect(safeParse('{ invalid }')).toEqual([]);
            expect(safeParse('{ "key": }', {})).toEqual({});
        });

        it('should handle empty string', () => {
            expect(safeParse('', 'default')).toBe('default');
        });

        it('should handle nested JSON', () => {
            const nested = '{"a": {"b": {"c": 1}}}';
            expect(safeParse(nested)).toEqual({ a: { b: { c: 1 } } });
        });
    });

    describe('parseDeckCards', () => {
        it('should return empty array for null deck', () => {
            expect(parseDeckCards(null)).toEqual([]);
        });

        it('should return empty array for undefined deck', () => {
            expect(parseDeckCards(undefined)).toEqual([]);
        });

        it('should return empty array for deck without cards', () => {
            expect(parseDeckCards({})).toEqual([]);
        });

        it('should parse cards from JSON string', () => {
            const deck = {
                cards: '[{"name": "Sol Ring", "quantity": 1}]'
            };
            expect(parseDeckCards(deck)).toEqual([{ name: 'Sol Ring', quantity: 1 }]);
        });

        it('should return cards array if already parsed', () => {
            const cards = [{ name: 'Sol Ring', quantity: 1 }];
            const deck = { cards };
            expect(parseDeckCards(deck)).toEqual(cards);
        });

        it('should return empty array for invalid JSON cards', () => {
            const deck = { cards: 'not valid json' };
            expect(parseDeckCards(deck)).toEqual([]);
        });
    });

    describe('parseCommanders', () => {
        it('should return empty array for null deck', () => {
            expect(parseCommanders(null)).toEqual([]);
        });

        it('should return empty array for deck without commanders', () => {
            expect(parseCommanders({})).toEqual([]);
        });

        it('should parse commanders from JSON string', () => {
            const deck = {
                commanders: '[{"name": "Atraxa, Praetors\' Voice"}]'
            };
            expect(parseCommanders(deck)).toEqual([{ name: "Atraxa, Praetors' Voice" }]);
        });

        it('should return commanders array if already parsed', () => {
            const commanders = [{ name: 'Atraxa' }];
            const deck = { commanders };
            expect(parseCommanders(deck)).toEqual(commanders);
        });
    });

    describe('parseColors', () => {
        it('should return empty array for null card', () => {
            expect(parseColors(null)).toEqual([]);
        });

        it('should return empty array for card without colors', () => {
            expect(parseColors({})).toEqual([]);
        });

        it('should parse colors from JSON string', () => {
            const card = { colors: '["W", "U", "B"]' };
            expect(parseColors(card)).toEqual(['W', 'U', 'B']);
        });

        it('should return colors array if already parsed', () => {
            const colors = ['R', 'G'];
            const card = { colors };
            expect(parseColors(card)).toEqual(colors);
        });

        it('should handle colorless cards', () => {
            const card = { colors: '[]' };
            expect(parseColors(card)).toEqual([]);
        });
    });

    describe('parseImageUri', () => {
        it('should return null for null/undefined input', () => {
            expect(parseImageUri(null)).toBeNull();
            expect(parseImageUri(undefined)).toBeNull();
        });

        it('should parse image_uris and return normal image', () => {
            const imageUris = JSON.stringify({
                small: 'https://example.com/small.jpg',
                normal: 'https://example.com/normal.jpg',
                large: 'https://example.com/large.jpg'
            });
            expect(parseImageUri(imageUris)).toBe('https://example.com/normal.jpg');
        });

        it('should handle already parsed object', () => {
            const imageUris = {
                small: 'https://example.com/small.jpg',
                normal: 'https://example.com/normal.jpg'
            };
            expect(parseImageUri(imageUris)).toBe('https://example.com/normal.jpg');
        });

        it('should fallback to small if normal not available', () => {
            const imageUris = {
                small: 'https://example.com/small.jpg',
                large: 'https://example.com/large.jpg'
            };
            expect(parseImageUri(imageUris)).toBe('https://example.com/small.jpg');
        });

        it('should fallback to large if normal and small not available', () => {
            const imageUris = {
                large: 'https://example.com/large.jpg'
            };
            expect(parseImageUri(imageUris)).toBe('https://example.com/large.jpg');
        });

        it('should return null if no image URLs available', () => {
            expect(parseImageUri({})).toBeNull();
            expect(parseImageUri('invalid json')).toBeNull();
        });
    });

    describe('parseLegalities', () => {
        it('should return empty object for null card', () => {
            expect(parseLegalities(null)).toEqual({});
        });

        it('should return empty object for card without legalities', () => {
            expect(parseLegalities({})).toEqual({});
        });

        it('should parse legalities from JSON string', () => {
            const card = {
                legalities: '{"commander": "legal", "standard": "not_legal"}'
            };
            expect(parseLegalities(card)).toEqual({
                commander: 'legal',
                standard: 'not_legal'
            });
        });

        it('should return legalities object if already parsed', () => {
            const legalities = { commander: 'legal' };
            const card = { legalities };
            expect(parseLegalities(card)).toEqual(legalities);
        });

        it('should return empty object for invalid JSON', () => {
            const card = { legalities: 'not json' };
            expect(parseLegalities(card)).toEqual({});
        });
    });

    describe('parseKeywords', () => {
        it('should return empty array for null card', () => {
            expect(parseKeywords(null)).toEqual([]);
        });

        it('should return empty array for card without keywords', () => {
            expect(parseKeywords({})).toEqual([]);
        });

        it('should parse keywords from JSON string', () => {
            const card = {
                keywords: '["Flying", "Vigilance", "Lifelink"]'
            };
            expect(parseKeywords(card)).toEqual(['Flying', 'Vigilance', 'Lifelink']);
        });

        it('should return keywords array if already parsed', () => {
            const keywords = ['Trample', 'Haste'];
            const card = { keywords };
            expect(parseKeywords(card)).toEqual(keywords);
        });

        it('should handle cards with no keywords', () => {
            const card = { keywords: '[]' };
            expect(parseKeywords(card)).toEqual([]);
        });
    });
});
