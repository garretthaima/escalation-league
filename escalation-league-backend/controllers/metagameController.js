const db = require('../models/db');
const scryfallDb = require('../models/scryfallDb');
const logger = require('../utils/logger');
const { handleError } = require('../utils/errorUtils');
const { safeParse } = require('../utils/jsonUtils');
const {
    ANALYSIS_KEYWORDS,
    BASIC_LAND_NAMES,
    isBasicLand,
    isLand,
    getColorName,
    getPrimaryType
} = require('../services/cardAnalysisService');
const { triggerLazySyncIfNeeded, forceSyncLeagueDecks } = require('../services/deckService');

/**
 * Get metagame statistics for the active league
 * Analyzes all decks and provides aggregate data
 */
const getMetagameStats = async (req, res) => {
    try {
        const { leagueId } = req.params;

        // Trigger lazy deck sync in background if enough time has passed
        // This doesn't block the response - sync happens asynchronously
        triggerLazySyncIfNeeded(leagueId).catch(err => {
            logger.error('Failed to trigger lazy sync', { leagueId, error: err.message });
        });

        // Get all decks for users in the specified league
        const decksInLeague = await db('user_leagues as ul')
            .join('decks as d', 'ul.deck_id', 'd.id')
            .where('ul.league_id', leagueId)
            .select('d.id', 'd.name', 'd.commanders', 'd.cards', 'd.platform');

        if (decksInLeague.length === 0) {
            return res.status(200).json({
                totalDecks: 0,
                message: 'No decks found in this league'
            });
        }

        // Initialize aggregators
        const cardCounts = {}; // { cardName: count }
        const colorCounts = { W: 0, U: 0, B: 0, R: 0, G: 0, C: 0 }; // Color identity
        const commanderCounts = {}; // { commanderName: count }
        const typeCounts = {}; // { cardType: count }
        const cmcCounts = {}; // { cmc: count } for mana curve
        const colorIdentityCounts = {}; // { identity: count } for color combinations
        const interactionCards = { removal: 0, counterspells: 0, boardWipes: 0 };
        let rampCards = 0;
        let cardDrawCards = 0;
        const winConditions = { combat: 0, combo: 0, alternate: 0 };
        const commanderSynergies = {}; // { commanderName: { cardName: count } }
        const keywordCounts = {}; // { keyword: count }
        let totalCreatures = 0;
        let totalInstantsSorceries = 0;
        let totalArtifactsEnchantments = 0;
        const deckStats = []; // Track per-deck stats for comparison

        // Use constants from cardAnalysisService
        const removalKeywords = ANALYSIS_KEYWORDS.removal;
        const counterspellKeywords = ANALYSIS_KEYWORDS.counterspell;
        const boardWipeKeywords = ANALYSIS_KEYWORDS.boardWipe;
        const rampKeywords = ANALYSIS_KEYWORDS.ramp;
        const drawKeywords = ANALYSIS_KEYWORDS.cardDraw;
        const comboKeywords = ANALYSIS_KEYWORDS.combo;
        const alternateWinKeywords = ANALYSIS_KEYWORDS.alternateWin;
        const combatKeywords = ANALYSIS_KEYWORDS.combat;

        // Process each deck
        for (const deck of decksInLeague) {
            const cards = safeParse(deck.cards, []);
            const commanders = safeParse(deck.commanders, []);

            // Get commander names for synergy tracking
            const commanderNames = Array.isArray(commanders)
                ? commanders.map(c => c.name || c)
                : [];

            // Fetch full card data from scryfall for commanders
            if (Array.isArray(commanders)) {
                for (const commander of commanders) {
                    const scryfallId = commander.scryfall_id || commander.id;
                    if (scryfallId) {
                        try {
                            const cardData = await scryfallDb('cards')
                                .where('id', scryfallId)
                                .first();

                            if (cardData) {
                                // Merge scryfall data into commander object
                                Object.assign(commander, {
                                    color_identity: safeParse(cardData.color_identity, []),
                                    colors: safeParse(cardData.colors, [])
                                });
                            }
                        } catch (err) {
                            logger.error('Error fetching commander data', err);
                        }
                    }
                }
            }

            // Count commanders
            if (Array.isArray(commanders)) {
                for (const commander of commanders) {
                    const cmdName = commander.name || commander;
                    commanderCounts[cmdName] = (commanderCounts[cmdName] || 0) + 1;

                    // Initialize commander synergy tracking
                    if (!commanderSynergies[cmdName]) {
                        commanderSynergies[cmdName] = {};
                    }

                    // Track commander color identity for color distribution
                    if (commander.color_identity && Array.isArray(commander.color_identity)) {
                        for (const color of commander.color_identity) {
                            if (colorCounts.hasOwnProperty(color)) {
                                colorCounts[color]++;
                            }
                        }
                    }

                    // Track commander color identity combinations
                    if (commander.color_identity || commander.colors) {
                        const identity = (commander.color_identity || commander.colors).sort().join('');
                        colorIdentityCounts[identity] = (colorIdentityCounts[identity] || 0) + 1;
                    }
                }
            }

            // Count cards (excluding basic lands)
            // Per-deck tracking
            let deckTotalCmc = 0;
            let deckCardCount = 0;
            let deckRemoval = 0;
            let deckCounterspells = 0;
            let deckBoardWipes = 0;
            let deckRamp = 0;
            let deckCardDraw = 0;

            if (Array.isArray(cards)) {
                // Fetch card details from scryfall - try by ID first, then by name
                const scryfallIds = cards.map(c => c.scryfall_id || c.id).filter(id => id);
                const cardNames = cards.map(c => c.name).filter(n => n);

                try {
                    // First try to get cards by ID
                    let cardDetails = await scryfallDb('cards')
                        .whereIn('id', scryfallIds)
                        .select('id', 'name', 'cmc', 'colors', 'type_line', 'oracle_text', 'keywords');

                    // Create lookup maps (by ID and by name)
                    const cardMapById = {};
                    const cardMapByName = {};
                    for (const card of cardDetails) {
                        const parsed = {
                            ...card,
                            colors: safeParse(card.colors, []),
                            oracle_text: card.oracle_text || ''
                        };
                        cardMapById[card.id] = parsed;
                        cardMapByName[card.name.toLowerCase()] = parsed;
                    }

                    // If we didn't find enough cards by ID, try by name
                    const missingNames = cardNames.filter(name =>
                        !cardMapByName[name.toLowerCase()]
                    );

                    if (missingNames.length > 0) {
                        const nameDetails = await scryfallDb('cards')
                            .whereIn('name', missingNames)
                            .select('id', 'name', 'cmc', 'colors', 'type_line', 'oracle_text', 'keywords');

                        for (const card of nameDetails) {
                            if (!cardMapByName[card.name.toLowerCase()]) {
                                const parsed = {
                                    ...card,
                                    colors: safeParse(card.colors, []),
                                    oracle_text: card.oracle_text || ''
                                };
                                cardMapByName[card.name.toLowerCase()] = parsed;
                            }
                        }
                    }

                    // Combined lookup function
                    const getCardData = (card) => {
                        const byId = cardMapById[card.scryfall_id || card.id];
                        if (byId) return byId;
                        const byName = cardMapByName[card.name?.toLowerCase()];
                        if (byName) return byName;
                        return card;
                    };

                    // Process each card with full scryfall data
                    for (const card of cards) {
                        const fullCard = getCardData(card);

                        const cardName = fullCard.name || card.name;
                        const cardText = (fullCard.oracle_text || '').toLowerCase();
                        const cardType = fullCard.type_line || '';

                        // Skip basic lands (by name or type line)
                        if (isBasicLand(fullCard)) {
                            continue;
                        }

                        cardCounts[cardName] = (cardCounts[cardName] || 0) + 1;

                        // Track commander synergies - which cards appear with which commanders
                        for (const cmdName of commanderNames) {
                            if (commanderSynergies[cmdName]) {
                                commanderSynergies[cmdName][cardName] = (commanderSynergies[cmdName][cardName] || 0) + 1;
                            }
                        }

                        // Mana curve analysis - exclude ALL lands (not just basic)
                        // Lands have CMC 0 and skew the curve
                        if (!isLand(fullCard)) {
                            const cmc = fullCard.cmc !== undefined ? fullCard.cmc : 0;
                            const cmcKey = cmc >= 7 ? '7+' : String(cmc);
                            cmcCounts[cmcKey] = (cmcCounts[cmcKey] || 0) + 1;

                            // Track per-deck CMC
                            deckTotalCmc += cmc;
                            deckCardCount++;
                        }

                        // Count colors if available
                        if (fullCard.colors && Array.isArray(fullCard.colors)) {
                            for (const color of fullCard.colors) {
                                if (colorCounts.hasOwnProperty(color)) {
                                    colorCounts[color]++;
                                }
                            }
                        }

                        // Count card types if available
                        if (cardType) {
                            const primaryType = cardType.split('—')[0].trim();
                            typeCounts[primaryType] = (typeCounts[primaryType] || 0) + 1;
                        }

                        // Detect interaction cards
                        if (removalKeywords.some(kw => cardText.includes(kw) || cardType.toLowerCase().includes('removal'))) {
                            interactionCards.removal++;
                            deckRemoval++;
                        }
                        if (counterspellKeywords.some(kw => cardText.includes(kw)) || cardType.toLowerCase().includes('counterspell')) {
                            interactionCards.counterspells++;
                            deckCounterspells++;
                        }
                        if (boardWipeKeywords.some(kw => cardText.includes(kw))) {
                            interactionCards.boardWipes++;
                            deckBoardWipes++;
                        }

                        // Detect ramp cards (exclude lands - they have "tap: add" but aren't ramp)
                        if (!isLand(fullCard) && rampKeywords.some(kw => cardText.includes(kw) || cardName.toLowerCase().includes(kw))) {
                            rampCards++;
                            deckRamp++;
                        }

                        // Detect card draw
                        if (drawKeywords.some(kw => cardText.includes(kw) || cardName.toLowerCase().includes(kw))) {
                            cardDrawCards++;
                            deckCardDraw++;
                        }

                        // Detect win conditions
                        if (comboKeywords.some(kw => cardText.includes(kw))) {
                            winConditions.combo++;
                        } else if (alternateWinKeywords.some(kw => cardText.includes(kw))) {
                            winConditions.alternate++;
                        } else if (combatKeywords.some(kw => cardText.includes(kw) || cardType.toLowerCase().includes('creature'))) {
                            winConditions.combat++;
                        }

                        // Count keywords and track card types
                        const keywords = safeParse(fullCard.keywords, []);
                        const cardTypeLower = cardType.toLowerCase();

                        // Track card type totals for percentage calculations
                        if (cardTypeLower.includes('creature')) {
                            totalCreatures++;
                        }
                        if (cardTypeLower.includes('instant') || cardTypeLower.includes('sorcery')) {
                            totalInstantsSorceries++;
                        }
                        if (cardTypeLower.includes('artifact') || cardTypeLower.includes('enchantment')) {
                            totalArtifactsEnchantments++;
                        }

                        if (keywords && Array.isArray(keywords)) {
                            keywords.forEach(keyword => {
                                if (keyword) {
                                    keywordCounts[keyword] = (keywordCounts[keyword] || 0) + 1;
                                }
                            });
                        }
                    }
                } catch (err) {
                    logger.error('Error fetching/processing card details:', err.message);
                }
            }

            // Store per-deck stats
            const deckAvgCmc = deckCardCount > 0 ? deckTotalCmc / deckCardCount : 0;
            const deckInteraction = deckRemoval + deckCounterspells + deckBoardWipes;
            deckStats.push({
                deckId: deck.id,
                deckName: deck.name,
                commander: commanderNames[0] || 'Unknown',
                avgCmc: parseFloat(deckAvgCmc.toFixed(2)),
                interaction: deckInteraction,
                removal: deckRemoval,
                counterspells: deckCounterspells,
                boardWipes: deckBoardWipes,
                ramp: deckRamp,
                cardDraw: deckCardDraw
            });
        }

        // Sort and format results
        const topCardsList = Object.entries(cardCounts)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 50) // Top 50 most played cards
            .map(([name, count]) => ({
                name,
                count,
                percentage: ((count / decksInLeague.length) * 100).toFixed(2)
            }));

        // Fetch scryfall data for top cards to get images
        let topCards = topCardsList;
        if (topCardsList.length > 0) {
            try {
                // For double-faced cards, also search by front face name
                const topCardNames = topCardsList.map(c => c.name);
                const frontFaceNames = topCardsList.map(c => c.name.split(' // ')[0]);
                const allSearchNames = [...new Set([...topCardNames, ...frontFaceNames])];

                const topCardData = await scryfallDb('cards')
                    .whereIn('name', allSearchNames)
                    .select('name', 'id', 'image_uris', 'card_faces');

                // Helper to parse image_uris
                const parseImageUris = (field) => {
                    if (!field) return null;
                    if (typeof field === 'object' && !Array.isArray(field)) return field;
                    if (typeof field === 'string') {
                        try {
                            return JSON.parse(field);
                        } catch (e) {
                            return null;
                        }
                    }
                    return null;
                };

                // Create a map for quick lookup (by both full name and front face)
                const topCardMap = new Map();
                for (const card of topCardData) {
                    const imageUris = parseImageUris(card.image_uris);
                    const cardFaces = parseImageUris(card.card_faces);

                    let cardData = {
                        scryfall_id: card.id,
                        image_uri: imageUris?.normal || imageUris?.small || null,
                        image_uris: [] // Array for multi-faced cards
                    };

                    // If card has multiple faces, get image for each face
                    if (cardFaces && Array.isArray(cardFaces) && cardFaces.length > 1) {
                        cardData.image_uris = cardFaces.map(face => {
                            const faceImageUris = parseImageUris(face.image_uris);
                            return faceImageUris?.normal || faceImageUris?.small || null;
                        }).filter(uri => uri !== null);
                    } else if (cardData.image_uri) {
                        cardData.image_uris = [cardData.image_uri];
                    }

                    topCardMap.set(card.name, cardData);
                }

                // Merge scryfall data with top cards
                topCards = topCardsList.map(card => {
                    // Try full name first, then front face name
                    let scryfallData = topCardMap.get(card.name);
                    if (!scryfallData && card.name.includes(' // ')) {
                        const frontFace = card.name.split(' // ')[0];
                        scryfallData = topCardMap.get(frontFace);
                    }
                    return {
                        ...card,
                        scryfall_id: scryfallData?.scryfall_id || null,
                        image_uri: scryfallData?.image_uri || null,
                        image_uris: scryfallData?.image_uris || []
                    };
                });
            } catch (err) {
                logger.error('Error fetching top card images:', err);
                // If error, use cards without images
            }
        }

        const topCommanders = Object.entries(commanderCounts)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 20) // Top 20 most played commanders
            .map(([name, count]) => ({
                name,
                count,
                percentage: ((count / decksInLeague.length) * 100).toFixed(2)
            }));

        const topTypes = Object.entries(typeCounts)
            .sort(([, a], [, b]) => b - a)
            .map(([type, count]) => ({
                type,
                count
            }));

        // Calculate total colors
        const totalColorPips = Object.values(colorCounts).reduce((sum, count) => sum + count, 0);
        const colorDistribution = Object.entries(colorCounts).map(([color, count]) => ({
            color,
            colorName: getColorName(color),
            count,
            percentage: totalColorPips > 0 ? ((count / totalColorPips) * 100).toFixed(2) : 0
        }));

        // Calculate mana curve
        const manaCurve = Object.entries(cmcCounts)
            .sort(([a], [b]) => parseInt(a) - parseInt(b))
            .map(([cmc, count]) => ({
                cmc: parseInt(cmc),
                count,
                percentage: ((count / decksInLeague.length) * 100).toFixed(2)
            }));

        // Calculate average CMC
        const totalCmc = Object.entries(cmcCounts).reduce((sum, [cmc, count]) => sum + (parseInt(cmc) * count), 0);
        const totalCards = Object.values(cmcCounts).reduce((sum, count) => sum + count, 0);
        const avgCmc = totalCards > 0 ? (totalCmc / totalCards).toFixed(2) : 0;

        // Color identity breakdown
        const colorIdentityBreakdown = Object.entries(colorIdentityCounts)
            .sort(([, a], [, b]) => b - a)
            .map(([identity, count]) => ({
                identity: identity || 'Colorless',
                colors: identity.split('').map(c => getColorName(c)).join('/'),
                count,
                percentage: ((count / decksInLeague.length) * 100).toFixed(2)
            }));

        // Detect staples (cards in 40%+ of decks)
        const stapleThreshold = Math.ceil(decksInLeague.length * 0.4);
        const staplesList = Object.entries(cardCounts)
            .filter(([, count]) => count >= stapleThreshold)
            .sort(([, a], [, b]) => b - a)
            .map(([name, count]) => ({
                name,
                count,
                percentage: ((count / decksInLeague.length) * 100).toFixed(2)
            }));

        // Fetch scryfall data for staples to get images
        let staples = staplesList;
        if (staplesList.length > 0) {
            try {
                // For double-faced cards, also search by front face name
                const stapleNames = staplesList.map(s => s.name);
                const frontFaceNames = staplesList.map(s => s.name.split(' // ')[0]);
                const allSearchNames = [...new Set([...stapleNames, ...frontFaceNames])];

                const stapleCards = await scryfallDb('cards')
                    .whereIn('name', allSearchNames)
                    .select('name', 'id', 'image_uris', 'card_faces');

                // Helper to parse image_uris
                const parseImageUris = (field) => {
                    if (!field) return null;
                    if (typeof field === 'object' && !Array.isArray(field)) return field;
                    if (typeof field === 'string') {
                        try {
                            return JSON.parse(field);
                        } catch (e) {
                            return null;
                        }
                    }
                    return null;
                };

                // Create a map for quick lookup
                const stapleCardMap = new Map();
                for (const card of stapleCards) {
                    const imageUris = parseImageUris(card.image_uris);
                    const cardFaces = parseImageUris(card.card_faces);

                    let cardData = {
                        scryfall_id: card.id,
                        image_uri: imageUris?.small || imageUris?.normal || null,
                        image_uris: [] // Array for multi-faced cards
                    };

                    // If card has multiple faces, get image for each face
                    if (cardFaces && Array.isArray(cardFaces) && cardFaces.length > 1) {
                        cardData.image_uris = cardFaces.map(face => {
                            const faceImageUris = parseImageUris(face.image_uris);
                            return faceImageUris?.small || faceImageUris?.normal || null;
                        }).filter(uri => uri !== null);
                    } else if (cardData.image_uri) {
                        cardData.image_uris = [cardData.image_uri];
                    }

                    stapleCardMap.set(card.name, cardData);
                }

                // Merge scryfall data with staples
                staples = staplesList.map(staple => {
                    // Try full name first, then front face name
                    let scryfallData = stapleCardMap.get(staple.name);
                    if (!scryfallData && staple.name.includes(' // ')) {
                        const frontFace = staple.name.split(' // ')[0];
                        scryfallData = stapleCardMap.get(frontFace);
                    }
                    return {
                        ...staple,
                        scryfall_id: scryfallData?.scryfall_id || null,
                        image_uri: scryfallData?.image_uri || null,
                        image_uris: scryfallData?.image_uris || []
                    };
                });
            } catch (err) {
                logger.error('Error fetching staple images:', err);
                // If error, use staples without images
            }
        }

        // Archetype detection based on card types
        const totalTypeCounts = Object.values(typeCounts).reduce((sum, count) => sum + count, 0);
        const creaturePercentage = totalTypeCounts > 0 ? ((typeCounts['Creature'] || 0) / totalTypeCounts * 100) : 0;
        const instantSorceryPercentage = totalTypeCounts > 0 ? (((typeCounts['Instant'] || 0) + (typeCounts['Sorcery'] || 0)) / totalTypeCounts * 100) : 0;

        let dominantArchetype = 'Midrange';
        if (creaturePercentage > 40) dominantArchetype = 'Aggro/Creature-based';
        else if (instantSorceryPercentage > 30) dominantArchetype = 'Control/Spell-based';

        // Format commander synergies - top 10 cards per commander
        const topCommanderSynergies = {};
        for (const [commander, cards] of Object.entries(commanderSynergies)) {
            topCommanderSynergies[commander] = Object.entries(cards)
                .sort(([, a], [, b]) => b - a)
                .slice(0, 10)
                .map(([cardName, count]) => ({
                    name: cardName,
                    count,
                    percentage: ((count / (commanderCounts[commander] || 1)) * 100).toFixed(2)
                }));
        }

        // Calculate total cards for resource metrics
        const totalCardsAnalyzed = Object.values(cardCounts).reduce((sum, count) => sum + count, 0);

        // Categorize keywords
        const keywordCategories = {
            combat: ['Flying', 'Trample', 'Deathtouch', 'Lifelink', 'First Strike', 'Double Strike', 'Vigilance', 'Reach', 'Menace'],
            protection: ['Hexproof', 'Ward', 'Protection', 'Indestructible', 'Shroud'],
            utility: ['Mill', 'Proliferate', 'Cascade', 'Storm', 'Convoke', 'Delve', 'Flashback', 'Kicker'],
            speed: ['Haste', 'Flash']
        };

        const categorizedKeywords = {
            combat: [],
            protection: [],
            utility: [],
            speed: []
        };

        // Sort keywords by count and categorize
        const sortedKeywords = Object.entries(keywordCounts)
            .sort(([, a], [, b]) => b - a);

        for (const [keyword, count] of sortedKeywords) {
            let percentage = 0;
            let total = totalCardsAnalyzed;
            let baseType = 'cards';

            // Find which category this keyword belongs to
            let categorized = false;
            for (const [category, keywords] of Object.entries(keywordCategories)) {
                if (keywords.includes(keyword)) {
                    // Calculate percentage based on card type
                    if (category === 'combat') {
                        percentage = totalCreatures > 0 ? ((count / totalCreatures) * 100).toFixed(2) : 0;
                        baseType = 'creatures';
                    } else if (category === 'speed' && keyword === 'Flash') {
                        percentage = totalInstantsSorceries > 0 ? ((count / totalInstantsSorceries) * 100).toFixed(2) : 0;
                        baseType = 'instants/sorceries';
                    } else if (category === 'utility') {
                        // Utility keywords can appear on various card types, use total
                        percentage = totalCardsAnalyzed > 0 ? ((count / totalCardsAnalyzed) * 100).toFixed(2) : 0;
                        baseType = 'cards';
                    } else {
                        percentage = totalCardsAnalyzed > 0 ? ((count / totalCardsAnalyzed) * 100).toFixed(2) : 0;
                        baseType = 'cards';
                    }

                    categorizedKeywords[category].push({ keyword, count, percentage, baseType });
                    categorized = true;
                    break;
                }
            }

            // If not in predefined categories, add to utility with general percentage
            if (!categorized && categorizedKeywords.utility.length < 10) {
                percentage = totalCardsAnalyzed > 0 ? ((count / totalCardsAnalyzed) * 100).toFixed(2) : 0;
                categorizedKeywords.utility.push({ keyword, count, percentage, baseType: 'cards' });
            }
        }

        const response = {
            totalDecks: decksInLeague.length,
            topCards,
            topCommanders,
            colorDistribution,
            topTypes,
            manaCurve: {
                distribution: manaCurve,
                averageCmc: parseFloat(avgCmc)
            },
            colorIdentity: colorIdentityBreakdown,
            interaction: interactionCards,
            staples,
            archetypeBreakdown: {
                dominant: dominantArchetype,
                creaturePercentage: creaturePercentage.toFixed(2),
                spellPercentage: instantSorceryPercentage.toFixed(2)
            },
            resources: {
                ramp: {
                    totalCount: rampCards,
                    averagePerDeck: (rampCards / decksInLeague.length).toFixed(2),
                    percentage: totalCardsAnalyzed > 0 ? ((rampCards / totalCardsAnalyzed) * 100).toFixed(2) : 0
                },
                cardDraw: {
                    totalCount: cardDrawCards,
                    averagePerDeck: (cardDrawCards / decksInLeague.length).toFixed(2),
                    percentage: totalCardsAnalyzed > 0 ? ((cardDrawCards / totalCardsAnalyzed) * 100).toFixed(2) : 0
                }
            },
            winConditions: {
                combat: winConditions.combat,
                combo: winConditions.combo,
                alternate: winConditions.alternate,
                totalCards: winConditions.combat + winConditions.combo + winConditions.alternate
            },
            keywords: categorizedKeywords,
            commanderSynergies: topCommanderSynergies,
            // Meta analytics - per-deck comparison
            metaAnalytics: {
                leagueAvgCmc: parseFloat((deckStats.reduce((sum, d) => sum + d.avgCmc, 0) / deckStats.length).toFixed(2)),
                leagueAvgInteraction: parseFloat((deckStats.reduce((sum, d) => sum + d.interaction, 0) / deckStats.length).toFixed(1)),
                deckComparison: deckStats.sort((a, b) => a.avgCmc - b.avgCmc).map(d => ({
                    commander: d.commander,
                    avgCmc: d.avgCmc,
                    interaction: d.interaction,
                    ramp: d.ramp,
                    cardDraw: d.cardDraw
                }))
            }
        };

        res.status(200).json(response);

    } catch (err) {
        handleError(res, err, 'Failed to fetch metagame statistics');
    }
};

/**
 * Get detailed card statistics for a specific card
 */
const getCardStats = async (req, res) => {
    try {
        const { leagueId, cardName } = req.params;

        const decksWithCard = await db('user_leagues as ul')
            .join('decks as d', 'ul.deck_id', 'd.id')
            .join('users as u', 'ul.user_id', 'u.id')
            .where('ul.league_id', leagueId)
            .whereRaw('JSON_SEARCH(d.cards, "one", ?) IS NOT NULL', [cardName])
            .select(
                'u.id as user_id',
                'u.firstname',
                'u.lastname',
                'd.name as deck_name',
                'd.commanders'
            );

        res.status(200).json({
            cardName,
            timesPlayed: decksWithCard.length,
            decks: decksWithCard
        });

    } catch (err) {
        handleError(res, err, 'Failed to fetch card statistics');
    }
};

/**
 * Get win rate statistics by turn order position
 * Analyzes completed games to determine win percentages for each seating position
 */
const getTurnOrderStats = async (req, res) => {
    try {
        const { leagueId } = req.params;

        // Get all completed games in this league with turn order data
        const completedGames = await db('game_pods as gp')
            .join('game_players as pl', 'gp.id', 'pl.pod_id')
            .where('gp.league_id', leagueId)
            .where('gp.confirmation_status', 'complete')
            .whereNotNull('pl.turn_order')
            .whereNotNull('pl.result')
            .select('gp.id as pod_id', 'pl.turn_order', 'pl.result');

        if (completedGames.length === 0) {
            return res.status(200).json({
                message: 'No completed games with turn order data found',
                turnOrderStats: [],
                totalGames: 0
            });
        }

        // Group by pod to count unique games
        const podIds = new Set(completedGames.map(g => g.pod_id));
        const totalGames = podIds.size;

        // Calculate stats for each turn order position (1-4)
        const turnOrderStats = [];
        for (let position = 1; position <= 4; position++) {
            const gamesAtPosition = completedGames.filter(g => g.turn_order === position);
            const winsAtPosition = gamesAtPosition.filter(g => g.result === 'win').length;
            const totalAtPosition = gamesAtPosition.length;

            if (totalAtPosition > 0) {
                turnOrderStats.push({
                    position,
                    positionLabel: getPositionLabel(position),
                    wins: winsAtPosition,
                    gamesPlayed: totalAtPosition,
                    winRate: Math.round((winsAtPosition / totalAtPosition) * 100 * 10) / 10
                });
            }
        }

        // Also calculate draws if any
        const drawGames = completedGames.filter(g => g.result === 'draw');
        const drawCount = new Set(drawGames.map(g => g.pod_id)).size;

        res.status(200).json({
            turnOrderStats,
            totalGames,
            gamesWithDraws: drawCount,
            message: totalGames < 10 ? 'Limited data - statistics may not be statistically significant' : null
        });
    } catch (err) {
        handleError(res, err, 'Failed to fetch turn order statistics');
    }
};

/**
 * Get position label for turn order
 */
function getPositionLabel(position) {
    const labels = {
        1: '1st (Going First)',
        2: '2nd',
        3: '3rd',
        4: '4th (Going Last)'
    };
    return labels[position] || `${position}th`;
}

/**
 * Get cards for a specific category (ramp, removal, cardDraw, counterspells, boardWipes)
 * Returns deduplicated list of cards sorted by popularity
 * Optimized: Single batch Scryfall query instead of per-deck queries
 */
const getCategoryCards = async (req, res) => {
    try {
        const { leagueId, category } = req.params;

        // Map API category names to service category keys
        const categoryMap = {
            ramp: 'ramp',
            cardDraw: 'cardDraw',
            removal: 'removal',
            counterspells: 'counterspell',
            boardWipes: 'boardWipe'
        };

        const serviceCategory = categoryMap[category];
        const keywords = serviceCategory ? ANALYSIS_KEYWORDS[serviceCategory] : null;
        if (!keywords) {
            return res.status(400).json({ error: `Invalid category: ${category}. Valid categories: ${Object.keys(categoryMap).join(', ')}` });
        }

        // Get all decks for this league
        const decksInLeague = await db('user_leagues as ul')
            .join('decks as d', 'ul.deck_id', 'd.id')
            .where('ul.league_id', leagueId)
            .select('d.id', 'd.cards');

        if (decksInLeague.length === 0) {
            return res.status(200).json({ category, cards: [], totalDecks: 0 });
        }

        // Phase 1: Collect ALL unique card IDs and names from ALL decks
        const allScryfallIds = new Set();
        const allCardNames = new Set();
        const parsedDecks = [];

        for (const deck of decksInLeague) {
            const cards = safeParse(deck.cards, []);
            if (!Array.isArray(cards)) continue;

            parsedDecks.push({ deckId: deck.id, cards });

            for (const card of cards) {
                if (card.scryfall_id) allScryfallIds.add(card.scryfall_id);
                if (card.id) allScryfallIds.add(card.id);
                if (card.name) allCardNames.add(card.name);
            }
        }

        // Phase 2: Single batch Scryfall query for all cards
        const cardMapById = {};
        const cardMapByName = {};

        try {
            // Query by IDs first
            if (allScryfallIds.size > 0) {
                const cardDetails = await scryfallDb('cards')
                    .whereIn('id', Array.from(allScryfallIds))
                    .select('id', 'name', 'oracle_text', 'type_line', 'image_uris');

                for (const card of cardDetails) {
                    cardMapById[card.id] = card;
                    cardMapByName[card.name.toLowerCase()] = card;
                }
            }

            // Query missing cards by name
            const missingNames = Array.from(allCardNames).filter(name =>
                !cardMapByName[name.toLowerCase()]
            );

            if (missingNames.length > 0) {
                const nameDetails = await scryfallDb('cards')
                    .whereIn('name', missingNames)
                    .select('id', 'name', 'oracle_text', 'type_line', 'image_uris');

                for (const card of nameDetails) {
                    if (!cardMapByName[card.name.toLowerCase()]) {
                        cardMapByName[card.name.toLowerCase()] = card;
                    }
                }
            }
        } catch (err) {
            logger.error('Error fetching Scryfall data:', err.message);
        }

        // Helper to get card data
        const getCardData = (card) => {
            const byId = cardMapById[card.scryfall_id || card.id];
            if (byId) return byId;
            const byName = cardMapByName[card.name?.toLowerCase()];
            if (byName) return byName;
            return card;
        };

        // Phase 3: Process all decks using cached Scryfall data
        const cardCounts = {}; // { cardName: { count: number, scryfallId: string, imageUri: string } }

        for (const { cards } of parsedDecks) {
            const seenInDeck = new Set(); // Track unique cards per deck

            for (const card of cards) {
                const fullCard = getCardData(card);
                const cardName = fullCard.name || card.name;

                // Skip basic lands
                if (isBasicLand(fullCard)) continue;

                // Skip all lands for ramp category - lands produce mana but aren't "ramp" cards
                if (category === 'ramp' && isLand(fullCard)) continue;

                // Check if card matches category
                const cardText = (fullCard.oracle_text || '').toLowerCase();
                const cardMatchesCategory = keywords.some(kw =>
                    cardText.includes(kw) || cardName.toLowerCase().includes(kw)
                );

                if (cardMatchesCategory && !seenInDeck.has(cardName)) {
                    seenInDeck.add(cardName);
                    if (!cardCounts[cardName]) {
                        // Parse image_uris if string
                        let imageUri = null;
                        if (fullCard.image_uris) {
                            const imageUris = safeParse(fullCard.image_uris, null);
                            imageUri = imageUris?.normal || imageUris?.small || null;
                        }
                        cardCounts[cardName] = { count: 0, scryfallId: fullCard.id || card.scryfall_id || card.id, imageUri };
                    }
                    cardCounts[cardName].count++;
                }
            }
        }

        // Sort by count and format response
        const cards = Object.entries(cardCounts)
            .sort(([, a], [, b]) => b.count - a.count)
            .map(([name, data]) => ({
                name,
                count: data.count,
                percentage: ((data.count / decksInLeague.length) * 100).toFixed(1),
                imageUri: data.imageUri
            }));

        res.status(200).json({
            category,
            cards,
            totalDecks: decksInLeague.length
        });
    } catch (err) {
        handleError(res, err, 'Failed to fetch category cards');
    }
};

/**
 * Get commander matchup statistics
 * Shows win rates when specific commanders face each other in pods
 */
const getCommanderMatchups = async (req, res) => {
    try {
        const { leagueId } = req.params;

        // Get all completed pods with player results and commander info
        const completedPods = await db('game_pods as gp')
            .join('game_players as pl', 'gp.id', 'pl.pod_id')
            .join('user_leagues as ul', function() {
                this.on('pl.player_id', '=', 'ul.user_id')
                    .andOn('gp.league_id', '=', 'ul.league_id');
            })
            .join('decks as d', 'ul.deck_id', 'd.id')
            .where('gp.league_id', leagueId)
            .where('gp.confirmation_status', 'complete')
            .whereNotNull('pl.result')
            .select(
                'gp.id as pod_id',
                'pl.player_id',
                'pl.result',
                'd.commanders'
            );

        if (completedPods.length === 0) {
            return res.status(200).json({
                message: 'No completed games found',
                matchups: [],
                totalGames: 0
            });
        }

        // Group by pod
        const podMap = {};
        for (const row of completedPods) {
            if (!podMap[row.pod_id]) {
                podMap[row.pod_id] = [];
            }
            const commanders = safeParse(row.commanders, []);
            const commanderName = Array.isArray(commanders) && commanders.length > 0
                ? (commanders[0].name || commanders[0])
                : 'Unknown';
            podMap[row.pod_id].push({
                playerId: row.player_id,
                commander: commanderName,
                result: row.result
            });
        }

        // Calculate matchup stats
        const matchupStats = {}; // { "CmdA vs CmdB": { wins: { A: x, B: y }, games: n } }
        const commanderStats = {}; // { commander: { wins: x, games: y } }

        for (const players of Object.values(podMap)) {
            // Get the winner
            const winner = players.find(p => p.result === 'win');
            if (!winner) continue; // Skip draws

            // Track individual commander stats
            for (const player of players) {
                if (!commanderStats[player.commander]) {
                    commanderStats[player.commander] = { wins: 0, games: 0 };
                }
                commanderStats[player.commander].games++;
                if (player.result === 'win') {
                    commanderStats[player.commander].wins++;
                }
            }

            // Track head-to-head matchups
            for (let i = 0; i < players.length; i++) {
                for (let j = i + 1; j < players.length; j++) {
                    const cmd1 = players[i].commander;
                    const cmd2 = players[j].commander;
                    if (cmd1 === cmd2) continue; // Skip same commander

                    // Create consistent key (alphabetical order)
                    const [first, second] = [cmd1, cmd2].sort();
                    const key = `${first}|||${second}`;

                    if (!matchupStats[key]) {
                        matchupStats[key] = {
                            commanders: [first, second],
                            wins: { [first]: 0, [second]: 0 },
                            games: 0
                        };
                    }

                    matchupStats[key].games++;
                    if (players[i].result === 'win') {
                        matchupStats[key].wins[cmd1]++;
                    } else if (players[j].result === 'win') {
                        matchupStats[key].wins[cmd2]++;
                    }
                }
            }
        }

        // Format commander stats
        const commanderOverview = Object.entries(commanderStats)
            .map(([commander, stats]) => ({
                commander,
                wins: stats.wins,
                games: stats.games,
                winRate: stats.games > 0 ? Math.round((stats.wins / stats.games) * 100) : 0
            }))
            .sort((a, b) => b.winRate - a.winRate);

        // Format matchup data (only show matchups with 2+ games)
        const matchups = Object.values(matchupStats)
            .filter(m => m.games >= 2)
            .map(m => ({
                commanders: m.commanders,
                games: m.games,
                winRates: {
                    [m.commanders[0]]: m.games > 0 ? Math.round((m.wins[m.commanders[0]] / m.games) * 100) : 0,
                    [m.commanders[1]]: m.games > 0 ? Math.round((m.wins[m.commanders[1]] / m.games) * 100) : 0
                }
            }))
            .sort((a, b) => b.games - a.games);

        res.status(200).json({
            commanderOverview,
            matchups,
            totalGames: Object.keys(podMap).length
        });
    } catch (err) {
        handleError(res, err, 'Failed to fetch commander matchups');
    }
};

/**
 * Manually trigger deck sync for a league
 * Admin-only endpoint for forcing a refresh
 */
const syncLeagueDecks = async (req, res) => {
    try {
        const { leagueId } = req.params;

        logger.info('Manual deck sync requested', { leagueId, userId: req.user?.id });

        const result = await forceSyncLeagueDecks(leagueId);

        res.status(200).json({
            message: 'Deck sync completed',
            ...result
        });
    } catch (err) {
        handleError(res, err, 'Failed to sync league decks');
    }
};

module.exports = {
    getMetagameStats,
    getCardStats,
    getTurnOrderStats,
    getCategoryCards,
    getCommanderMatchups,
    syncLeagueDecks
};
