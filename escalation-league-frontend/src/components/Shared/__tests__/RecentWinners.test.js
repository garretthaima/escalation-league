import React from 'react';
import { render, screen } from '@testing-library/react';
import RecentWinners from '../RecentWinners';

describe('RecentWinners', () => {
    const mockGames = [
        {
            id: 42,
            created_at: '2025-01-15T10:00:00Z',
            participants: [
                { firstname: 'Alice', result: 'win' },
                { firstname: 'Bob', result: 'loss' },
                { firstname: 'Carol', result: 'loss' }
            ]
        },
        {
            id: 41,
            created_at: '2025-01-14T10:00:00Z',
            participants: [
                { firstname: 'Dave', result: 'draw' },
                { firstname: 'Eve', result: 'draw' }
            ]
        },
        {
            id: 40,
            created_at: '2025-01-13T10:00:00Z',
            participants: [
                { firstname: 'Frank', result: 'win' },
                { firstname: 'Grace', result: 'loss' }
            ]
        }
    ];

    describe('loading state', () => {
        it('should show loading message when loading is true', () => {
            render(<RecentWinners loading={true} />);
            expect(screen.getByText('Loading...')).toBeInTheDocument();
        });

        it('should show spinner icon when loading', () => {
            const { container } = render(<RecentWinners loading={true} />);
            expect(container.querySelector('.fa-spinner')).toBeInTheDocument();
        });
    });

    describe('empty state', () => {
        it('should show no recent games message when games is empty', () => {
            render(<RecentWinners games={[]} />);
            expect(screen.getByText('No recent games')).toBeInTheDocument();
        });

        it('should show no recent games message when games is null', () => {
            render(<RecentWinners games={null} />);
            expect(screen.getByText('No recent games')).toBeInTheDocument();
        });

        it('should show history icon in empty state', () => {
            const { container } = render(<RecentWinners games={[]} />);
            expect(container.querySelector('.fa-history')).toBeInTheDocument();
        });
    });

    describe('with games data', () => {
        it('should render Recent Winners title', () => {
            render(<RecentWinners games={mockGames} />);
            expect(screen.getByText('Recent Winners')).toBeInTheDocument();
        });

        it('should display game IDs', () => {
            render(<RecentWinners games={mockGames} />);
            expect(screen.getByText('Game #42')).toBeInTheDocument();
            expect(screen.getByText('Game #41')).toBeInTheDocument();
            expect(screen.getByText('Game #40')).toBeInTheDocument();
        });

        it('should display winner names with crown icon', () => {
            const { container } = render(<RecentWinners games={mockGames} />);
            expect(screen.getByText('Alice')).toBeInTheDocument();
            expect(screen.getByText('Frank')).toBeInTheDocument();
            // Crown icons should be present for winners
            const crownIcons = container.querySelectorAll('.fa-crown');
            expect(crownIcons.length).toBeGreaterThanOrEqual(2);
        });

        it('should display Draw badge for draw games', () => {
            render(<RecentWinners games={mockGames} />);
            expect(screen.getByText('Draw')).toBeInTheDocument();
        });

        it('should display all games provided', () => {
            render(<RecentWinners games={mockGames} />);
            const gameItems = screen.getAllByText(/Game #/);
            expect(gameItems).toHaveLength(3);
        });
    });

    describe('date formatting', () => {
        it('should format dates correctly', () => {
            render(<RecentWinners games={mockGames} />);
            // Dates should be formatted as "Jan 15", "Jan 14", "Jan 13"
            expect(screen.getByText('Jan 15')).toBeInTheDocument();
            expect(screen.getByText('Jan 14')).toBeInTheDocument();
            expect(screen.getByText('Jan 13')).toBeInTheDocument();
        });
    });

    describe('edge cases', () => {
        it('should handle game with no participants', () => {
            const gamesWithNoParticipants = [
                { id: 1, created_at: '2025-01-15T10:00:00Z', participants: [] }
            ];
            render(<RecentWinners games={gamesWithNoParticipants} />);
            expect(screen.getByText('Game #1')).toBeInTheDocument();
            // Should show dash badge for no winner
            expect(screen.getByText('-')).toBeInTheDocument();
        });

        it('should handle game with null participants', () => {
            const gamesWithNullParticipants = [
                { id: 1, created_at: '2025-01-15T10:00:00Z', participants: null }
            ];
            render(<RecentWinners games={gamesWithNullParticipants} />);
            expect(screen.getByText('Game #1')).toBeInTheDocument();
        });

        it('should handle game with no winner (all losses)', () => {
            const gamesNoWinner = [
                {
                    id: 1,
                    created_at: '2025-01-15T10:00:00Z',
                    participants: [
                        { firstname: 'Alice', result: 'loss' },
                        { firstname: 'Bob', result: 'loss' }
                    ]
                }
            ];
            render(<RecentWinners games={gamesNoWinner} />);
            expect(screen.getByText('-')).toBeInTheDocument();
        });
    });

    describe('styling', () => {
        it('should have recent-winners-card class', () => {
            const { container } = render(<RecentWinners games={mockGames} />);
            expect(container.querySelector('.recent-winners-card')).toBeInTheDocument();
        });

        it('should have h-100 class for full height', () => {
            const { container } = render(<RecentWinners games={mockGames} />);
            expect(container.querySelector('.h-100')).toBeInTheDocument();
        });

        it('should have list-group for games list', () => {
            const { container } = render(<RecentWinners games={mockGames} />);
            expect(container.querySelector('.list-group')).toBeInTheDocument();
        });

        it('should have recent-winner-item class for each game', () => {
            const { container } = render(<RecentWinners games={mockGames} />);
            const items = container.querySelectorAll('.recent-winner-item');
            expect(items).toHaveLength(3);
        });

        it('should have recent-winner-badge class for winner badges', () => {
            const { container } = render(<RecentWinners games={mockGames} />);
            const badges = container.querySelectorAll('.recent-winner-badge');
            expect(badges.length).toBeGreaterThanOrEqual(2);
        });
    });
});
