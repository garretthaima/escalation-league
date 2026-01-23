#!/usr/bin/env node
/**
 * Backfill ELO ratings for all historical games
 *
 * This script processes all completed pods in chronological order
 * and calculates ELO changes as if the system had been in place from the start.
 *
 * Usage:
 *   node scripts/backfill-elo.js [--dry-run] [--league-id=X]
 *
 * Options:
 *   --dry-run     Show what would happen without making changes
 *   --league-id=X Only process a specific league
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const db = require('../models/db');
const { calculateEloChanges } = require('../utils/eloCalculator');

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const leagueIdArg = args.find(a => a.startsWith('--league-id='));
const LEAGUE_ID = leagueIdArg ? parseInt(leagueIdArg.split('=')[1]) : null;

async function backfillElo() {
    console.log('=== ELO Backfill Script ===');
    console.log(`Mode: ${DRY_RUN ? 'DRY RUN (no changes)' : 'LIVE'}`);
    if (LEAGUE_ID) console.log(`League: ${LEAGUE_ID}`);
    console.log('');

    try {
        // Step 1: Reset all ELO ratings to 1500
        if (!DRY_RUN) {
            console.log('Step 1: Resetting all ELO ratings to 1500...');
            await db('users').update({ elo_rating: 1500 });
            await db('user_leagues').update({ elo_rating: 1500 });
            await db('game_players').update({ elo_change: null, elo_before: null });
            console.log('✅ All ELO ratings reset\n');
        } else {
            console.log('Step 1: [DRY RUN] Would reset all ELO ratings to 1500\n');
        }

        // Step 2: Get all completed pods in chronological order
        console.log('Step 2: Fetching completed pods...');
        let podsQuery = db('game_pods')
            .where('confirmation_status', 'complete')
            .whereNull('deleted_at')
            .orderBy('created_at', 'asc')
            .orderBy('id', 'asc');

        if (LEAGUE_ID) {
            podsQuery = podsQuery.where('league_id', LEAGUE_ID);
        }

        const pods = await podsQuery;
        console.log(`Found ${pods.length} completed pods to process\n`);

        // Track ELO state for each user (global and per-league)
        const globalElo = {};      // userId -> elo
        const leagueElo = {};      // `${userId}-${leagueId}` -> elo
        const gamesPlayed = {};    // userId -> count

        // Initialize from current state (everyone starts at 1500)
        const users = await db('users').select('id');
        users.forEach(u => {
            globalElo[u.id] = 1500;
            gamesPlayed[u.id] = 0;
        });

        const userLeagues = await db('user_leagues').select('user_id', 'league_id');
        userLeagues.forEach(ul => {
            leagueElo[`${ul.user_id}-${ul.league_id}`] = 1500;
        });

        // Step 3: Process each pod
        console.log('Step 3: Processing pods...');
        let processed = 0;
        let skipped = 0;

        for (const pod of pods) {
            // Get participants for this pod
            const participants = await db('game_players')
                .where('pod_id', pod.id)
                .whereNull('deleted_at')
                .select('player_id', 'result', 'turn_order');

            // Skip pods with no valid participants (must have a result)
            const validParticipants = participants.filter(p => p.result);
            if (validParticipants.length < 2) {
                skipped++;
                continue;
            }

            // Build player data for ELO calculation
            const playersWithElo = validParticipants.map(p => ({
                playerId: p.player_id,
                currentElo: globalElo[p.player_id] || 1500,
                result: p.result,
                turnOrder: p.turn_order || 2, // Default to seat 2 if missing
                gamesPlayed: gamesPlayed[p.player_id] || 0
            }));

            // Calculate ELO changes
            const eloChanges = calculateEloChanges(playersWithElo);

            // Apply changes
            for (const change of eloChanges) {
                const player = playersWithElo.find(p => p.playerId === change.playerId);
                const leagueKey = `${change.playerId}-${pod.league_id}`;

                if (!DRY_RUN) {
                    // Update game_players with ELO history
                    await db('game_players')
                        .where({ pod_id: pod.id, player_id: change.playerId })
                        .update({
                            elo_change: change.eloChange,
                            elo_before: player.currentElo
                        });
                }

                // Update our tracking state
                globalElo[change.playerId] = (globalElo[change.playerId] || 1500) + change.eloChange;
                leagueElo[leagueKey] = (leagueElo[leagueKey] || 1500) + change.eloChange;
                gamesPlayed[change.playerId] = (gamesPlayed[change.playerId] || 0) + 1;
            }

            processed++;
            if (processed % 50 === 0) {
                console.log(`  Processed ${processed}/${pods.length} pods...`);
            }
        }

        console.log(`\n✅ Processed ${processed} pods (${skipped} skipped)\n`);

        // Step 4: Update final ELO ratings
        console.log('Step 4: Updating final ELO ratings...');

        if (!DRY_RUN) {
            // Update users table
            for (const [userId, elo] of Object.entries(globalElo)) {
                await db('users')
                    .where('id', userId)
                    .update({ elo_rating: Math.round(elo) });
            }

            // Update user_leagues table
            for (const [key, elo] of Object.entries(leagueElo)) {
                const [userId, leagueId] = key.split('-');
                await db('user_leagues')
                    .where({ user_id: userId, league_id: leagueId })
                    .update({ elo_rating: Math.round(elo) });
            }

            console.log('✅ Final ELO ratings updated\n');
        } else {
            console.log('[DRY RUN] Would update final ELO ratings\n');
        }

        // Step 5: Show top players
        console.log('=== Top 10 Global ELO ===');
        const topPlayers = Object.entries(globalElo)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10);

        for (const [userId, elo] of topPlayers) {
            const user = await db('users')
                .where('id', userId)
                .select('firstname', 'lastname')
                .first();
            console.log(`  ${Math.round(elo)} - ${user?.firstname || 'Unknown'} ${user?.lastname || ''}`);
        }

        console.log('\n=== Backfill Complete ===');

    } catch (error) {
        console.error('Error during backfill:', error);
        process.exit(1);
    } finally {
        await db.destroy();
    }
}

backfillElo();
