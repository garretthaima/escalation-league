import React from 'react';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import QuickStatsCard from '../QuickStatsCard';

const renderQuickStatsCard = (props = {}) => {
    return render(
        <BrowserRouter>
            <QuickStatsCard {...props} />
        </BrowserRouter>
    );
};

describe('QuickStatsCard', () => {
    describe('without user stats', () => {
        it('should show join league prompt when no userStats', () => {
            renderQuickStatsCard({ userStats: null });
            expect(screen.getByText("You're not in a league yet")).toBeInTheDocument();
        });

        it('should show Join a League link', () => {
            renderQuickStatsCard({ userStats: null });
            expect(screen.getByRole('link', { name: /join a league/i })).toBeInTheDocument();
        });
    });

    describe('with user stats', () => {
        const mockStats = {
            total_points: 24,
            league_wins: 6,
            league_losses: 2,
            league_draws: 1,
            elo_rating: 1523,
            current_commander: 'Thrasios',
            commander_partner: 'Tymna',
            rank: 3
        };

        it('should render points', () => {
            renderQuickStatsCard({ userStats: mockStats });
            expect(screen.getByText('24')).toBeInTheDocument();
            expect(screen.getByText('Points')).toBeInTheDocument();
        });

        it('should render win rate', () => {
            renderQuickStatsCard({ userStats: mockStats });
            // 6 wins / (6 + 2) = 75%
            expect(screen.getByText('75%')).toBeInTheDocument();
            expect(screen.getByText('Win Rate')).toBeInTheDocument();
        });

        it('should render W-L-D record', () => {
            renderQuickStatsCard({ userStats: mockStats });
            expect(screen.getByText('6')).toBeInTheDocument(); // Wins
            expect(screen.getByText('2')).toBeInTheDocument(); // Losses
            expect(screen.getByText('1')).toBeInTheDocument(); // Draws
        });

        it('should render rank', () => {
            renderQuickStatsCard({ userStats: mockStats });
            expect(screen.getByText('#3')).toBeInTheDocument();
        });

        it('should render total players when provided', () => {
            renderQuickStatsCard({ userStats: mockStats, totalPlayers: 12 });
            expect(screen.getByText('/12')).toBeInTheDocument();
        });

        it('should render ELO rating', () => {
            renderQuickStatsCard({ userStats: mockStats });
            expect(screen.getByText('1523 ELO')).toBeInTheDocument();
        });

        it('should render commander name', () => {
            renderQuickStatsCard({ userStats: mockStats });
            expect(screen.getByText('Thrasios + Tymna')).toBeInTheDocument();
        });

        it('should render Full Profile link', () => {
            renderQuickStatsCard({ userStats: mockStats });
            expect(screen.getByRole('link', { name: /full profile/i })).toBeInTheDocument();
        });
    });

    describe('edge cases', () => {
        it('should handle 0 games (0% win rate)', () => {
            renderQuickStatsCard({
                userStats: {
                    total_points: 0,
                    league_wins: 0,
                    league_losses: 0,
                    league_draws: 0
                }
            });
            expect(screen.getByText('0%')).toBeInTheDocument();
        });

        it('should handle missing elo_rating', () => {
            renderQuickStatsCard({
                userStats: {
                    total_points: 10,
                    league_wins: 2,
                    league_losses: 1
                }
            });
            // Should not crash, and ELO section should not appear
            expect(screen.queryByText('ELO')).not.toBeInTheDocument();
        });

        it('should handle commander without partner', () => {
            renderQuickStatsCard({
                userStats: {
                    total_points: 10,
                    current_commander: 'Korvold'
                }
            });
            expect(screen.getByText('Korvold')).toBeInTheDocument();
            expect(screen.queryByText('+')).not.toBeInTheDocument();
        });
    });

    describe('rank styling', () => {
        it('should apply gold styling for top 3 rank', () => {
            renderQuickStatsCard({
                userStats: { total_points: 30, rank: 1 }
            });
            const rankBadge = screen.getByText('#1').closest('.rank-badge');
            expect(rankBadge).toHaveClass('rank-badge-gold');
        });

        it('should apply default styling for rank > 3', () => {
            renderQuickStatsCard({
                userStats: { total_points: 10, rank: 5 }
            });
            const rankBadge = screen.getByText('#5').closest('.rank-badge');
            expect(rankBadge).toHaveClass('rank-badge-default');
        });
    });
});
