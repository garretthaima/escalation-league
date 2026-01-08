const db = require('../models/db');

/**
 * Get metagame statistics for the active league
 * Analyzes all decks and provides aggregate data
 */
const getMetagameStats = async (req, res) => {
    try {
        const { leagueId } = req.params;

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

            // Count commanders
            if (Array.isArray(commanders)) {
                for (const commander of commanders) {
                    const cmdName = commander.name || commander;
                    commanderCounts[cmdName] = (commanderCounts[cmdName] || 0) + 1;

                    // Initialize commander synergy tracking
                    if (!commanderSynergies[cmdName]) {
                        commanderSynergies[cmdName] = {};
                    }

                    // Track commander color identity
                    if (commander.color_identity || commander.colors) {
                        const identity = (commander.color_identity || commander.colors).sort().join('');
                        colorIdentityCounts[identity] = (colorIdentityCounts[identity] || 0) + 1;
                    }
                }
            }

            // Count cards (excluding basic lands)
            if (Array.isArray(cards)) {
                for (const card of cards) {
                    const cardName = card.name || card;
                    const cardText = (card.oracle_text || card.text || '').toLowerCase();
                    const cardType = card.type || card.type_line || '';

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
                    const cmc = card.cmc || card.mana_cost || 0;
                    if (typeof cmc === 'number') {
                        cmcCounts[cmc] = (cmcCounts[cmc] || 0) + 1;
                    }

                    // Count colors if available
                    if (card.colors && Array.isArray(card.colors)) {
                        for (const color of card.colors) {
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
                    }
                    if (alternateWinKeywords.some(kw => cardText.includes(kw))) {
                        winConditions.alternate++;
                    }
                    if (combatKeywords.some(kw => cardText.includes(kw) || cardType.toLowerCase().includes('creature'))) {
                        winConditions.combat++;
                    }
                }
            }
        }

        // Sort and format results
        const topCards = Object.entries(cardCounts)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 50) // Top 50 most played cards
            .map(([name, count]) => ({
                name,
                count,
                percentage: ((count / decksInLeague.length) * 100).toFixed(2)
            }));

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

        // Detect staples (cards in 50%+ of decks)
        const stapleThreshold = Math.ceil(decksInLeague.length * 0.5);
        const staples = Object.entries(cardCounts)
            .filter(([, count]) => count >= stapleThreshold)
            .sort(([, a], [, b]) => b - a)
            .map(([name, count]) => ({
                name,
                count,
                percentage: ((count / decksInLeague.length) * 100).toFixed(2)
            }));

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

        res.status(200).json({
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
            commanderSynergies: topCommanderSynergies
        });

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

module.exports = {
    getMetagameStats,
    getCardStats
};
