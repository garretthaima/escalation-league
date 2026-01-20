const db = require('../models/db');
const scryfallDb = require('../models/scryfallDb');

/**
 * Get metagame statistics for the active league
 * Analyzes all decks and provides aggregate data
 */
const getMetagameStats = async (req, res) => {
    try {
        const { leagueId } = req.params;

        console.log('=== METAGAME DEBUG ===');
        console.log('Fetching metagame for leagueId:', leagueId);

        // Get all decks for users in the specified league
        const decksInLeague = await db('user_leagues as ul')
            .join('decks as d', 'ul.deck_id', 'd.id')
            .where('ul.league_id', leagueId)
            .select('d.id', 'd.name', 'd.commanders', 'd.cards', 'd.platform');

        console.log('Found decks:', decksInLeague.length);
        if (decksInLeague.length > 0) {
            console.log('First deck:', decksInLeague[0].name);
            console.log('First deck commanders:', decksInLeague[0].commanders);
            console.log('First deck cards sample:', JSON.stringify(decksInLeague[0].cards).substring(0, 500));
        }

        if (decksInLeague.length === 0) {
            console.log('No decks found, returning empty response');
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

        const basicLands = ['Plains', 'Island', 'Swamp', 'Mountain', 'Forest', 'Wastes'];

        // Keywords for interaction detection
        const removalKeywords = ['destroy', 'exile', 'sacrifice', 'remove', 'bounce', '-X/-X', 'dies'];
        const counterspellKeywords = ['counter target', 'counter spell'];
        const boardWipeKeywords = ['destroy all', 'exile all', 'each creature', 'all creatures'];
        const rampKeywords = ['search your library for a land', 'add mana', 'ramp', 'sol ring', 'arcane signet', 'cultivate', 'kodama'];
        const drawKeywords = ['draw cards', 'draw a card', 'draw two cards', 'card advantage', 'rhystic study', 'mystic remora', 'when you draw'];
        const comboKeywords = ['infinite', 'win the game', 'copy', 'untap', 'goes infinite'];
        const alternateWinKeywords = ['you win the game', 'win condition', 'mill', 'poison counter', 'infect'];
        const combatKeywords = ['combat damage', 'attack', 'double strike', 'commander damage', '+1/+1 counter'];

        // Process each deck
        for (const deck of decksInLeague) {
            const cards = typeof deck.cards === 'string' ? JSON.parse(deck.cards) : deck.cards;
            const commanders = typeof deck.commanders === 'string' ? JSON.parse(deck.commanders) : deck.commanders;

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
                                // Parse JSON fields safely
                                const parseIfNeeded = (field) => {
                                    if (!field) return [];
                                    if (Array.isArray(field)) return field;
                                    if (typeof field === 'string') {
                                        try {
                                            return JSON.parse(field);
                                        } catch (e) {
                                            return [];
                                        }
                                    }
                                    return [];
                                };

                                // Merge scryfall data into commander object
                                Object.assign(commander, {
                                    color_identity: parseIfNeeded(cardData.color_identity),
                                    colors: parseIfNeeded(cardData.colors)
                                });
                            }
                        } catch (err) {
                            console.error('Error fetching commander data:', err.message);
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
            if (Array.isArray(cards)) {
                // Fetch all card details from scryfall in batch
                const scryfallIds = cards.map(c => c.scryfall_id || c.id).filter(id => id);

                try {
                    const cardDetails = await scryfallDb('cards')
                        .whereIn('id', scryfallIds)
                        .select('id', 'name', 'cmc', 'colors', 'type_line', 'oracle_text', 'keywords');

                    // Helper to parse JSON fields safely
                    const parseIfNeeded = (field) => {
                        if (!field) return [];
                        if (Array.isArray(field)) return field;
                        if (typeof field === 'string') {
                            try {
                                return JSON.parse(field);
                            } catch (e) {
                                return [];
                            }
                        }
                        return [];
                    };

                    // Create lookup map
                    const cardMap = {};
                    for (const card of cardDetails) {
                        cardMap[card.id] = {
                            ...card,
                            colors: parseIfNeeded(card.colors),
                            oracle_text: card.oracle_text || ''
                        };
                    }

                    // Process each card with full scryfall data
                    for (const card of cards) {
                        const scryfallId = card.scryfall_id || card.id;
                        const fullCard = cardMap[scryfallId] || card;

                        const cardName = fullCard.name || card.name;
                        const cardText = (fullCard.oracle_text || '').toLowerCase();
                        const cardType = fullCard.type_line || '';

                        // Skip basic lands
                        if (basicLands.includes(cardName)) {
                            continue;
                        }

                        cardCounts[cardName] = (cardCounts[cardName] || 0) + 1;

                        // Track commander synergies - which cards appear with which commanders
                        for (const cmdName of commanderNames) {
                            if (commanderSynergies[cmdName]) {
                                commanderSynergies[cmdName][cardName] = (commanderSynergies[cmdName][cardName] || 0) + 1;
                            }
                        }

                        // Mana curve analysis
                        const cmc = fullCard.cmc !== undefined ? fullCard.cmc : 0;
                        const cmcKey = cmc >= 7 ? '7+' : String(cmc);
                        cmcCounts[cmcKey] = (cmcCounts[cmcKey] || 0) + 1;

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
                        }
                        if (counterspellKeywords.some(kw => cardText.includes(kw)) || cardType.toLowerCase().includes('counterspell')) {
                            interactionCards.counterspells++;
                        }
                        if (boardWipeKeywords.some(kw => cardText.includes(kw))) {
                            interactionCards.boardWipes++;
                        }

                        // Detect ramp cards
                        if (rampKeywords.some(kw => cardText.includes(kw) || cardName.toLowerCase().includes(kw))) {
                            rampCards++;
                        }

                        // Detect card draw
                        if (drawKeywords.some(kw => cardText.includes(kw) || cardName.toLowerCase().includes(kw))) {
                            cardDrawCards++;
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
                        const keywords = parseIfNeeded(fullCard.keywords);
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
                    console.error('Error fetching/processing card details:', err.message);
                }
            }
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
                console.error('Error fetching top card images:', err);
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

                console.log('Fetching staple images for:', stapleNames);
                const stapleCards = await scryfallDb('cards')
                    .whereIn('name', allSearchNames)
                    .select('name', 'id', 'image_uris', 'card_faces');

                console.log('Found staple cards:', stapleCards.length);
                console.log('Sample card:', stapleCards[0]);

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
                console.log('Staples with images:', staples.slice(0, 2));
            } catch (err) {
                console.error('Error fetching staple images:', err);
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
            commanderSynergies: topCommanderSynergies
        };

        console.log('Response summary:', {
            totalDecks: response.totalDecks,
            topCardsLength: response.topCards?.length,
            topCommandersLength: response.topCommanders?.length,
            staples: response.staples?.length,
            manaCurveKeys: response.manaCurve?.distribution?.length,
            colorCounts: colorCounts,
            colorDistributionLength: response.colorDistribution?.length,
            interaction: response.interaction,
            resources: response.resources,
            winConditions: response.winConditions
        });
        console.log('Staples data sample:', response.staples?.slice(0, 3));

        res.status(200).json(response);

    } catch (err) {
        console.error('Error fetching metagame stats:', err.message);
        res.status(500).json({ error: 'Failed to fetch metagame statistics.' });
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
        console.error('Error fetching card stats:', err.message);
        res.status(500).json({ error: 'Failed to fetch card statistics.' });
    }
};

// Helper function to get color names
function getColorName(colorCode) {
    const colorMap = {
        W: 'White',
        U: 'Blue',
        B: 'Black',
        R: 'Red',
        G: 'Green',
        C: 'Colorless'
    };
    return colorMap[colorCode] || colorCode;
}

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
        console.error('Error fetching turn order stats:', err.message);
        res.status(500).json({ error: 'Failed to fetch turn order statistics.' });
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

module.exports = {
    getMetagameStats,
    getCardStats,
    getTurnOrderStats
};
