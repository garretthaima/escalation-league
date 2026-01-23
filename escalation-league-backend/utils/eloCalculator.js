/**
 * ELO Calculator for 4-Player Commander
 *
 * Features:
 * - Winner-takes-all model for multiplayer
 * - Seat weighting for turn order advantage/disadvantage
 * - Draw handling with expected score adjustments
 * - K-factor adjustment based on games played
 */

// Starting ELO for new players
const STARTING_ELO = 1500;

// Base K-factor (rating volatility)
const BASE_K = 32;

/**
 * Seat weighting multipliers
 *
 * Based on Commander metagame data:
 * - 1st seat: ~27% win rate (acts first, slight advantage)
 * - 2nd seat: ~26% win rate (balanced)
 * - 3rd seat: ~24% win rate (slight disadvantage)
 * - 4th seat: ~23% win rate (acts last, biggest disadvantage)
 *
 * Winning from a disadvantaged seat is rewarded more.
 * Losing from an advantaged seat is penalized more.
 */
const SEAT_WEIGHTS = {
    1: { winBonus: 0.95, lossPenalty: 1.05 },  // 1st seat: wins worth less, losses hurt more
    2: { winBonus: 1.00, lossPenalty: 1.00 },  // 2nd seat: neutral baseline
    3: { winBonus: 1.05, lossPenalty: 0.95 },  // 3rd seat: wins worth more, losses hurt less
    4: { winBonus: 1.10, lossPenalty: 0.90 },  // 4th seat: wins worth most, losses hurt least
};

/**
 * Get K-factor based on games played
 * New players have higher volatility for faster calibration
 *
 * @param {number} gamesPlayed - Total games the player has played
 * @returns {number} K-factor to use
 */
function getKFactor(gamesPlayed) {
    if (gamesPlayed < 10) return 40;   // New player, high volatility
    if (gamesPlayed < 30) return 32;   // Normal K
    return 24;                          // Veteran, more stable rating
}

/**
 * Calculate expected score for a player against multiple opponents
 * Uses pairwise comparison and averages the results
 *
 * @param {number} playerElo - Player's current ELO rating
 * @param {number[]} opponentElos - Array of opponent ELO ratings
 * @returns {number} Expected score (0-1)
 */
function calculateExpectedScore(playerElo, opponentElos) {
    if (!opponentElos || opponentElos.length === 0) {
        return 0.5; // Default to neutral if no opponents
    }

    let totalExpected = 0;
    for (const oppElo of opponentElos) {
        // Standard ELO expected score formula
        totalExpected += 1 / (1 + Math.pow(10, (oppElo - playerElo) / 400));
    }

    // Average expected score across all opponents
    return totalExpected / opponentElos.length;
}

/**
 * Calculate ELO changes for all players in a completed game
 *
 * @param {Object[]} players - Array of player objects:
 *   - playerId: number
 *   - currentElo: number
 *   - result: 'win' | 'loss' | 'draw' | 'disqualified'
 *   - turnOrder: number (1-4)
 *   - gamesPlayed?: number (for K-factor, optional)
 * @returns {Object[]} Array of { playerId, eloChange, eloBefore }
 */
function calculateEloChanges(players) {
    // Filter out disqualified players - they don't participate in ELO
    const activePlayers = players.filter(p => p.result !== 'disqualified');

    // Need at least 2 active players for ELO calculation
    if (activePlayers.length < 2) {
        return players.map(p => ({
            playerId: p.playerId,
            eloChange: 0,
            eloBefore: p.currentElo
        }));
    }

    const results = [];

    // Check if it's a draw game (all active players have 'draw' result)
    const isDraw = activePlayers.every(p => p.result === 'draw');

    for (const player of players) {
        // Disqualified players get no ELO change
        if (player.result === 'disqualified') {
            results.push({
                playerId: player.playerId,
                eloChange: 0,
                eloBefore: player.currentElo
            });
            continue;
        }

        // Get opponent ELOs (excluding this player)
        const opponentElos = activePlayers
            .filter(p => p.playerId !== player.playerId)
            .map(p => p.currentElo);

        // Calculate expected score
        const expectedScore = calculateExpectedScore(player.currentElo, opponentElos);

        // Calculate actual score
        let actualScore;
        if (isDraw) {
            // In a draw, everyone gets equal share
            actualScore = 1 / activePlayers.length;
        } else if (player.result === 'win') {
            actualScore = 1;
        } else {
            // Loss
            actualScore = 0;
        }

        // Get K-factor based on experience
        const K = getKFactor(player.gamesPlayed || 0);

        // Get seat weight (default to neutral if missing)
        const seatWeight = SEAT_WEIGHTS[player.turnOrder] || SEAT_WEIGHTS[2];

        // Calculate base ELO change
        let eloChange = K * (actualScore - expectedScore);

        // Apply seat weighting
        if (eloChange > 0) {
            // Gaining ELO (win or favorable draw): apply win bonus
            eloChange = Math.round(eloChange * seatWeight.winBonus);
        } else if (eloChange < 0) {
            // Losing ELO: apply loss penalty
            eloChange = Math.round(eloChange * seatWeight.lossPenalty);
        } else {
            eloChange = 0;
        }

        results.push({
            playerId: player.playerId,
            eloChange: eloChange,
            eloBefore: player.currentElo
        });
    }

    return results;
}

/**
 * Reverse ELO changes (for admin edits/deletes)
 * Simply negates the stored changes
 *
 * @param {Object[]} storedChanges - Array of { playerId, eloChange }
 * @returns {Object[]} Array with negated eloChange values
 */
function reverseEloChanges(storedChanges) {
    return storedChanges.map(change => ({
        playerId: change.playerId,
        eloChange: -change.eloChange
    }));
}

module.exports = {
    STARTING_ELO,
    BASE_K,
    SEAT_WEIGHTS,
    getKFactor,
    calculateExpectedScore,
    calculateEloChanges,
    reverseEloChanges
};
