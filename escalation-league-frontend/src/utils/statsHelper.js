import { updateUserStats } from '../api/usersApi';
import { updateLeagueStats } from '../api/userLeaguesApi';

export const updateStats = async (participants, leagueId, reverse = false) => {
    for (const participant of participants) {
        const result = participant.result || 'loss'; // Default to "loss" if result is null
        const multiplier = reverse ? -1 : 1; // Reverse stats if needed

        // Update user stats
        await updateUserStats({
            userId: participant.player_id,
            wins: result === 'win' ? 1 * multiplier : 0,
            losses: result === 'loss' ? 1 * multiplier : 0,
            draws: result === 'draw' ? 1 * multiplier : 0,
        });

        // Update league stats
        await updateLeagueStats({
            userId: participant.player_id,
            leagueId,
            leagueWins: result === 'win' ? 1 * multiplier : 0,
            leagueLosses: result === 'loss' ? 1 * multiplier : 0,
            leagueDraws: result === 'draw' ? 1 * multiplier : 0,
        });
    }
};