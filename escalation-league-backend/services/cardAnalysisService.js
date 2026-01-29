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
 * Updated based on Commander community definitions and oracle text patterns
 * See: https://mtg.cardsrealm.com/en-us/articles/removals-and-interactions-on-commander-categories-and-utilities
 */
const ANALYSIS_KEYWORDS = {
    // Targeted removal - must target opponent's permanents
    removal: [
        'destroy target creature',
        'destroy target artifact',
        'destroy target enchantment',
        'destroy target permanent',
        'destroy target planeswalker',
        'exile target creature',
        'exile target permanent',
        'exile target artifact',
        'exile target enchantment',
        'return target creature to its owner\'s hand',
        'return target nonland permanent to its owner\'s hand',
        'return target permanent to its owner\'s hand',
        'target creature gets -',  // -X/-X effects
        'deals damage to any target',
        'deals damage to target creature',
        'each opponent sacrifices',  // Edicts
        'target player sacrifices',
    ],
    // Counterspells - stack interaction
    // Using broad patterns to catch all variants (Negate, Essence Scatter, etc.)
    counterspell: [
        'counter target',      // Catches "counter target spell", "counter target noncreature spell", etc.
        'counter that spell',  // Conditional counters like Mana Drain
        'exile target spell',  // Counterspell variants like Dissipate
    ],
    // Board wipes - mass removal
    boardWipe: [
        'destroy all creatures',
        'destroy all nonland permanents',
        'destroy all permanents',
        'destroy all artifacts',
        'destroy all enchantments',
        'exile all creatures',
        'exile all nonland permanents',
        'all creatures get -',  // Mass -X/-X
        'each creature gets -',
        'damage to each creature',  // Blasphemous Act, Chain Reaction, etc.
    ],
    // Ramp - mana acceleration
    ramp: [
        // Land ramp
        'search your library for a basic land',
        'search your library for up to two basic land',
        'search your library for a land card',
        'put a land card from your hand onto the battlefield',
        'put that card onto the battlefield',  // For land tutors
        'land onto the battlefield tapped',
        // Mana rocks/dorks - specific tap abilities
        '{t}: add {',
        '{t}: add one mana',
        '{t}: add two',
        '{t}: add three',
        'add one mana of any color',
        'add one mana of any type',
        'add two mana',
        'add three mana',
        // Colored mana production (mana dorks)
        'add one white mana',
        'add one blue mana',
        'add one black mana',
        'add one red mana',
        'add one green mana',
        'add {w}',
        'add {u}',
        'add {b}',
        'add {r}',
        'add {g}',
        'add {c}',
        // Generic tap patterns
        'tap: add',
    ],
    // Card draw - effects that CAUSE you to draw cards
    // IMPORTANT: Exclude triggers like "whenever you draw" (Psychosis Crawler) - those don't draw cards
    // Focus on patterns that actually cause card draw
    cardDraw: [
        // Direct "you draw" effects (not "whenever you draw")
        'you may draw a card',
        'you may draw two cards',
        'you may draw that many',
        // Activated abilities that draw
        ': draw a card',      // "{T}: Draw a card", "{2}: Draw a card"
        ': draw two cards',
        // Triggered draws (ETB, combat, etc.) - but not "whenever you draw"
        ', draw a card.',     // "When ~ enters, draw a card." (with period to avoid triggers)
        ', draw two cards',
        ', draw three cards',
        // Spell effects
        'draw two cards',     // Direct draw spells like Divination
        'draw three cards',   // Like Harmonize
        'draw four cards',
        'draw cards equal to',
        'draw that many cards',
        'draw x cards',
        // Combined effects
        'then draw a card',
        'and draw a card',
    ],
    // Combo pieces
    combo: ['infinite', 'win the game', 'copy', 'untap', 'goes infinite'],
    // Alternate win conditions
    alternateWin: ['you win the game', 'win condition', 'mill', 'poison counter', 'infect'],
    // Combat-focused
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
 * Check if a card is any type of land (basic or non-basic)
 * Used to exclude lands from mana curve calculations
 * @param {Object} card - Card object with type_line
 * @returns {boolean} True if card is a land
 */
const isLand = (card) => {
    if (!card) return false;
    const typeLine = (card.type_line || '').toLowerCase();
    return typeLine.includes('land');
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
        // Exclude lands from ramp - lands produce mana but aren't "ramp" cards
        isRamp: !isLand(fullCardData) && matchesCategory(cardText, cardName, 'ramp'),
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
    isLand,
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
