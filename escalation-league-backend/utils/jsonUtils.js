/**
 * JSON parsing utilities for handling database fields that may be
 * stored as JSON strings or already parsed objects/arrays
 */

/**
 * Safely parse a field that may be a JSON string or already parsed
 * Handles the common pattern where DB fields can be string or object
 *
 * @param {*} field - The field to parse (string, object, array, or null)
 * @param {*} defaultValue - Default value if field is null/undefined or parse fails
 * @returns {*} Parsed value or default
 */
const safeParse = (field, defaultValue = []) => {
    if (field === null || field === undefined) return defaultValue;
    if (typeof field !== 'string') return field;
    try {
        return JSON.parse(field);
    } catch (e) {
        return defaultValue;
    }
};

/**
 * Parse deck cards field - handles both string and object formats
 * @param {object} deck - Deck object with cards field
 * @returns {Array} Array of card objects
 */
const parseDeckCards = (deck) => {
    if (!deck) return [];
    return safeParse(deck.cards, []);
};

/**
 * Parse commanders field from deck
 * @param {object} deck - Deck object with commanders field
 * @returns {Array} Array of commander objects
 */
const parseCommanders = (deck) => {
    if (!deck) return [];
    return safeParse(deck.commanders, []);
};

/**
 * Parse colors field from card data
 * @param {object} card - Card object with colors field
 * @returns {Array} Array of color strings
 */
const parseColors = (card) => {
    if (!card) return [];
    return safeParse(card.colors, []);
};

/**
 * Parse image_uris field and extract the preferred image URL
 * @param {*} imageUrisField - The image_uris field (string or object)
 * @returns {string|null} Image URL or null
 */
const parseImageUri = (imageUrisField) => {
    const parsed = safeParse(imageUrisField, null);
    if (!parsed) return null;
    // Prefer normal size, fallback to small
    return parsed.normal || parsed.small || parsed.large || null;
};

/**
 * Parse legalities field from card data
 * @param {object} card - Card object with legalities field
 * @returns {object} Legalities object
 */
const parseLegalities = (card) => {
    if (!card) return {};
    return safeParse(card.legalities, {});
};

/**
 * Parse keywords field from card data
 * @param {object} card - Card object with keywords field
 * @returns {Array} Array of keyword strings
 */
const parseKeywords = (card) => {
    if (!card) return [];
    return safeParse(card.keywords, []);
};

module.exports = {
    safeParse,
    parseDeckCards,
    parseCommanders,
    parseColors,
    parseImageUri,
    parseLegalities,
    parseKeywords
};
