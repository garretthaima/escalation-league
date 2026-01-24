/**
 * Card Analysis Service - Utilities for analyzing MTG card data
 *
 * Extracts common card analysis patterns from metagameController.js
 * for reusability and testability.
 */

const scryfallDb = require('../models/scryfallDb');
const { safeParse } = require('../utils/jsonUtils');

// ==========================================
// Constants - Card Analysis Keywords
// ==========================================

/**
 * Keywords for categorizing cards by function
 */
const ANALYSIS_KEYWORDS = {
    removal: ['destroy', 'exile', 'sacrifice', 'remove', 'bounce', '-X/-X', 'dies'],
    counterspell: ['counter target', 'counter spell'],
    boardWipe: ['destroy all', 'exile all', 'each creature', 'all creatures'],
    ramp: ['search your library for a land', 'add mana', 'ramp', 'sol ring', 'arcane signet', 'cultivate', 'kodama'],
    cardDraw: ['draw cards', 'draw a card', 'draw two cards', 'card advantage', 'rhystic study', 'mystic remora', 'when you draw'],
    combo: ['infinite', 'win the game', 'copy', 'untap', 'goes infinite'],
    alternateWin: ['you win the game', 'win condition', 'mill', 'poison counter', 'infect'],
    combat: ['combat damage', 'attack', 'double strike', 'commander damage', '+1/+1 counter']
};

/**
 * Basic land names to exclude from analysis
 */
const BASIC_LAND_NAMES = [
    'Plains', 'Island', 'Swamp', 'Mountain', 'Forest', 'Wastes',
    'Snow-Covered Plains', 'Snow-Covered Island', 'Snow-Covered Swamp',
    'Snow-Covered Mountain', 'Snow-Covered Forest'
];

/**
 * Color code to name mapping
 */
const COLOR_NAMES = {
    W: 'White',
    U: 'Blue',
    B: 'Black',
    R: 'Red',
    G: 'Green',
    C: 'Colorless'
};

// ==========================================
// Card Classification Functions
// ==========================================

/**
 * Check if a card is a basic land
 * @param {Object} card - Card object with name and type_line
 * @returns {boolean} True if card is a basic land
 */
const isBasicLand = (card) => {
    if (!card) return false;
    if (BASIC_LAND_NAMES.includes(card.name)) return true;
    const typeLine = (card.type_line || '').toLowerCase();
    return typeLine.includes('basic') && typeLine.includes('land');
};

/**
 * Check if card text matches a category of keywords
 * @param {string} cardText - Oracle text of the card
 * @param {string} cardName - Name of the card
 * @param {string} category - Category key from ANALYSIS_KEYWORDS
 * @returns {boolean} True if card matches category
 */
const matchesCategory = (cardText, cardName, category) => {
    const keywords = ANALYSIS_KEYWORDS[category];
    if (!keywords) return false;

    const lowerText = (cardText || '').toLowerCase();
    const lowerName = (cardName || '').toLowerCase();

    return keywords.some(kw => lowerText.includes(kw) || lowerName.includes(kw));
};

/**
 * Get the full color name from a color code
 * @param {string} colorCode - Single color code (W, U, B, R, G, C)
 * @returns {string} Full color name
 */
const getColorName = (colorCode) => {
    return COLOR_NAMES[colorCode] || 'Unknown';
};

/**
 * Get primary card type from type line
 * @param {string} typeLine - Full type line (e.g., "Legendary Creature — Dragon")
 * @returns {string} Primary type (e.g., "Legendary Creature")
 */
const getPrimaryType = (typeLine) => {
    if (!typeLine) return 'Unknown';
    return typeLine.split('—')[0].trim();
};

/**
 * Categorize a card's win condition type
 * @param {string} cardText - Oracle text
 * @param {string} typeLine - Type line
 * @returns {string|null} Win condition type: 'combat', 'combo', 'alternate', or null
 */
const categorizeWinCondition = (cardText, typeLine) => {
    const lowerText = (cardText || '').toLowerCase();
    const lowerType = (typeLine || '').toLowerCase();

    if (matchesCategory(cardText, '', 'combo')) {
        return 'combo';
    }
    if (matchesCategory(cardText, '', 'alternateWin')) {
        return 'alternate';
    }
    if (matchesCategory(cardText, '', 'combat') || lowerType.includes('creature')) {
        return 'combat';
    }
    return null;
};

// ==========================================
// Scryfall Data Functions
// ==========================================

/**
 * Batch fetch card data from Scryfall database
 * @param {Array<string>} scryfallIds - Array of Scryfall IDs
 * @param {Array<string>} cardNames - Array of card names (fallback)
 * @returns {Promise<Object>} { cardMapById, cardMapByName }
 */
const getCardDataBatch = async (scryfallIds, cardNames) => {
    const cardMapById = {};
    const cardMapByName = {};

    // Fetch by ID first
    if (scryfallIds.length > 0) {
        const cardDetails = await scryfallDb('cards')
            .whereIn('id', scryfallIds)
            .select('id', 'name', 'cmc', 'colors', 'type_line', 'oracle_text', 'keywords', 'image_uris');

        for (const card of cardDetails) {
            const parsed = {
                ...card,
                colors: safeParse(card.colors, []),
                keywords: safeParse(card.keywords, []),
                oracle_text: card.oracle_text || ''
            };
            cardMapById[card.id] = parsed;
            cardMapByName[card.name.toLowerCase()] = parsed;
        }
    }

    // Fetch missing cards by name
    const missingNames = cardNames.filter(name =>
        !cardMapByName[name.toLowerCase()]
    );

    if (missingNames.length > 0) {
        const nameDetails = await scryfallDb('cards')
            .whereIn('name', missingNames)
            .select('id', 'name', 'cmc', 'colors', 'type_line', 'oracle_text', 'keywords', 'image_uris');

        for (const card of nameDetails) {
            if (!cardMapByName[card.name.toLowerCase()]) {
                const parsed = {
                    ...card,
                    colors: safeParse(card.colors, []),
                    keywords: safeParse(card.keywords, []),
                    oracle_text: card.oracle_text || ''
                };
                cardMapByName[card.name.toLowerCase()] = parsed;
            }
        }
    }

    return { cardMapById, cardMapByName };
};

/**
 * Get image URI from card data
 * @param {Object} card - Card object with image_uris or card_faces
 * @returns {string|null} Best available image URI
 */
const getCardImageUri = (card) => {
    if (!card) return null;

    const imageUris = safeParse(card.image_uris, null);
    if (imageUris) {
        return imageUris.normal || imageUris.small || imageUris.large || null;
    }

    // Check for double-faced cards
    const cardFaces = safeParse(card.card_faces, null);
    if (cardFaces && Array.isArray(cardFaces) && cardFaces.length > 0) {
        const frontFace = cardFaces[0];
        const frontImageUris = safeParse(frontFace.image_uris, null);
        if (frontImageUris) {
            return frontImageUris.normal || frontImageUris.small || null;
        }
    }

    return null;
};

/**
 * Analyze a single card for metagame statistics
 * @param {Object} card - Card object from deck
 * @param {Object} fullCardData - Full Scryfall data for the card
 * @returns {Object} Analysis results
 */
const analyzeCard = (card, fullCardData) => {
    const cardName = fullCardData.name || card.name;
    const cardText = (fullCardData.oracle_text || '').toLowerCase();
    const typeLine = fullCardData.type_line || '';
    const lowerType = typeLine.toLowerCase();

    return {
        name: cardName,
        cmc: fullCardData.cmc !== undefined ? fullCardData.cmc : 0,
        colors: fullCardData.colors || [],
        primaryType: getPrimaryType(typeLine),
        isBasicLand: isBasicLand(fullCardData),
        keywords: fullCardData.keywords || [],

        // Category detection
        isRemoval: matchesCategory(cardText, cardName, 'removal'),
        isCounterspell: matchesCategory(cardText, cardName, 'counterspell'),
        isBoardWipe: matchesCategory(cardText, cardName, 'boardWipe'),
        isRamp: matchesCategory(cardText, cardName, 'ramp'),
        isCardDraw: matchesCategory(cardText, cardName, 'cardDraw'),

        // Type classification
        isCreature: lowerType.includes('creature'),
        isInstantSorcery: lowerType.includes('instant') || lowerType.includes('sorcery'),
        isArtifactEnchantment: lowerType.includes('artifact') || lowerType.includes('enchantment'),

        // Win condition
        winCondition: categorizeWinCondition(cardText, typeLine)
    };
};

module.exports = {
    // Constants
    ANALYSIS_KEYWORDS,
    BASIC_LAND_NAMES,
    COLOR_NAMES,

    // Classification functions
    isBasicLand,
    matchesCategory,
    getColorName,
    getPrimaryType,
    categorizeWinCondition,

    // Scryfall functions
    getCardDataBatch,
    getCardImageUri,

    // Analysis functions
    analyzeCard
};
