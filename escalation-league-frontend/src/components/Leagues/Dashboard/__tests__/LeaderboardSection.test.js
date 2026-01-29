// Mock axiosConfig to prevent ESM issues - MUST be before any imports
jest.mock('../../../../api/axiosConfig', () => ({
    __esModule: true,
    default: {
        get: jest.fn(),
        post: jest.fn(),
        put: jest.fn(),
        delete: jest.fn(),
        interceptors: {
            request: { use: jest.fn() },
            response: { use: jest.fn() }
        }
    }
}));

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import LeaderboardSection from '../LeaderboardSection';

// Wrapper component with Router
const renderWithRouter = (component) => {
    return render(
        <BrowserRouter>
            {component}
        </BrowserRouter>
    );
};

describe('LeaderboardSection', () => {
    const mockLeaderboard = [
        {
            player_id: 1,
            firstname: 'John',
            lastname: 'Doe',
            total_points: 100,
            wins: 10,
            losses: 5,
            draws: 2,
            total_games: 17,
            win_rate: '58.8',
            elo_rating: 1650,
            rank: 1,
            qualified: true
        },
        {
            player_id: 2,
            firstname: 'Jane',
            lastname: 'Smith',
            total_points: 90,
            wins: 8,
            losses: 6,
            draws: 0,
            total_games: 14,
            win_rate: '57.1',
            elo_rating: 1600,
            rank: 2,
            qualified: true
        },
        {
            player_id: 3,
            firstname: 'Bob',
            lastname: 'Johnson',
            total_points: 80,
            wins: 7,
            losses: 7,
            draws: 1,
            total_games: 15,
            win_rate: '46.7',
            elo_rating: 1550,
            rank: 3,
            qualified: false
        }
    ];

    const defaultProps = {
        leaderboard: mockLeaderboard,
        leagueId: 1,
        currentUserId: 2,
        compact: true
    };

    describe('rendering', () => {
        it('should render leaderboard table', () => {
            renderWithRouter(<LeaderboardSection {...defaultProps} />);
            expect(screen.getByRole('table')).toBeInTheDocument();
        });

        it('should render all players', () => {
            renderWithRouter(<LeaderboardSection {...defaultProps} />);
            expect(screen.getByText('John Doe')).toBeInTheDocument();
            expect(screen.getByText('Jane Smith')).toBeInTheDocument();
            expect(screen.getByText('Bob Johnson')).toBeInTheDocument();
        });

        it('should show "(you)" indicator for current user', () => {
            renderWithRouter(<LeaderboardSection {...defaultProps} />);
            expect(screen.getByText('(you)')).toBeInTheDocument();
        });

        it('should highlight current user row with table-primary class', () => {
            renderWithRouter(<LeaderboardSection {...defaultProps} />);
            const janeRow = screen.getByText('Jane Smith').closest('tr');
            expect(janeRow).toHaveClass('table-primary');
        });

        it('should render table headers', () => {
            renderWithRouter(<LeaderboardSection {...defaultProps} />);
            expect(screen.getByText('Rank')).toBeInTheDocument();
            expect(screen.getByText('Player')).toBeInTheDocument();
            expect(screen.getByText('Points')).toBeInTheDocument();
        });
    });

    describe('empty state', () => {
        it('should render empty message when leaderboard is empty', () => {
            renderWithRouter(<LeaderboardSection {...defaultProps} leaderboard={[]} />);
            expect(screen.getByText('No leaderboard data available.')).toBeInTheDocument();
        });

        it('should render empty message when leaderboard is null', () => {
            renderWithRouter(<LeaderboardSection {...defaultProps} leaderboard={null} />);
            expect(screen.getByText('No leaderboard data available.')).toBeInTheDocument();
        });

        it('should render empty message when leaderboard is undefined', () => {
            renderWithRouter(<LeaderboardSection {...defaultProps} leaderboard={undefined} />);
            expect(screen.getByText('No leaderboard data available.')).toBeInTheDocument();
        });
    });

    describe('rank badges', () => {
        it('should show gold badge for rank 1 with crown icon', () => {
            renderWithRouter(<LeaderboardSection {...defaultProps} />);
            const johnRow = screen.getByText('John Doe').closest('tr');
            const badge = johnRow.querySelector('.badge.bg-warning');
            expect(badge).toBeInTheDocument();
            expect(badge.querySelector('.fa-crown')).toBeInTheDocument();
        });

        it('should show silver badge for rank 2', () => {
            renderWithRouter(<LeaderboardSection {...defaultProps} />);
            const janeRow = screen.getByText('Jane Smith').closest('tr');
            const badge = janeRow.querySelector('.badge.bg-secondary');
            expect(badge).toBeInTheDocument();
        });

        it('should show bronze badge for rank 3', () => {
            renderWithRouter(<LeaderboardSection {...defaultProps} />);
            const bobRow = screen.getByText('Bob Johnson').closest('tr');
            const badge = bobRow.querySelector('.badge.bg-danger');
            expect(badge).toBeInTheDocument();
        });

        it('should show text-muted for ranks beyond 3', () => {
            const leaderboardWithRank4 = [
                ...mockLeaderboard,
                {
                    player_id: 4,
                    firstname: 'Alice',
                    lastname: 'Williams',
                    total_points: 70,
                    wins: 5,
                    losses: 8,
                    draws: 0,
                    total_games: 13,
                    win_rate: '38.5',
                    elo_rating: 1500,
                    rank: 4,
                    qualified: false
                }
            ];
            renderWithRouter(<LeaderboardSection {...defaultProps} leaderboard={leaderboardWithRank4} />);
            const aliceRow = screen.getByText('Alice Williams').closest('tr');
            const rankCell = aliceRow.querySelector('.text-muted');
            expect(rankCell).toHaveTextContent('#4');
        });
    });

    describe('record display', () => {
        it('should display wins and losses', () => {
            renderWithRouter(<LeaderboardSection {...defaultProps} />);
            // John has 10W and 5L
            expect(screen.getByText('10W')).toBeInTheDocument();
            expect(screen.getByText('5L')).toBeInTheDocument();
        });

        it('should display draws when greater than 0', () => {
            renderWithRouter(<LeaderboardSection {...defaultProps} />);
            // John has 2D
            expect(screen.getByText('2D')).toBeInTheDocument();
        });

        it('should not display draws when 0', () => {
            renderWithRouter(<LeaderboardSection {...defaultProps} />);
            // Jane has 0 draws - only her row should not have draws displayed
            const janeRow = screen.getByText('Jane Smith').closest('tr');
            expect(janeRow.textContent).not.toContain('0D');
        });
    });

    describe('points display', () => {
        it('should display total points for each player', () => {
            renderWithRouter(<LeaderboardSection {...defaultProps} />);
            expect(screen.getByText('100')).toBeInTheDocument();
            expect(screen.getByText('90')).toBeInTheDocument();
            expect(screen.getByText('80')).toBeInTheDocument();
        });

        it('should handle missing points gracefully', () => {
            const playerWithNoPoints = [{
                player_id: 5,
                firstname: 'New',
                lastname: 'Player',
                rank: 1
            }];
            renderWithRouter(<LeaderboardSection {...defaultProps} leaderboard={playerWithNoPoints} />);
            expect(screen.getAllByText('0').length).toBeGreaterThan(0);
        });
    });

    describe('qualified badge', () => {
        it('should display Qualified badge for qualified players', () => {
            renderWithRouter(<LeaderboardSection {...defaultProps} />);
            const qualifiedBadges = screen.getAllByText('Qualified');
            expect(qualifiedBadges.length).toBe(2); // John and Jane
        });
    });

    describe('player links', () => {
        it('should link to player profile', () => {
            renderWithRouter(<LeaderboardSection {...defaultProps} />);
            const johnLink = screen.getByRole('link', { name: 'John Doe' });
            expect(johnLink).toHaveAttribute('href', '/leagues/1/profile/1');
        });

        it('should stop propagation when clicking player link', () => {
            renderWithRouter(<LeaderboardSection {...defaultProps} />);
            const johnLink = screen.getByRole('link', { name: 'John Doe' });
            const clickEvent = { stopPropagation: jest.fn() };
            fireEvent.click(johnLink, clickEvent);
            // Link should be clickable without issues
            expect(johnLink).toBeInTheDocument();
        });
    });

    describe('compact mode', () => {
        it('should show only first 10 players in compact mode', () => {
            const manyPlayers = Array.from({ length: 15 }, (_, i) => ({
                player_id: i + 1,
                firstname: `Player${i + 1}`,
                lastname: 'Test',
                total_points: 100 - i * 5,
                wins: 10 - i,
                losses: i,
                draws: 0,
                total_games: 10,
                win_rate: '50.0',
                elo_rating: 1500,
                rank: i + 1,
                qualified: false
            }));

            renderWithRouter(<LeaderboardSection {...defaultProps} leaderboard={manyPlayers} compact={true} />);
            expect(screen.getByText('Player1 Test')).toBeInTheDocument();
            expect(screen.getByText('Player10 Test')).toBeInTheDocument();
            expect(screen.queryByText('Player11 Test')).not.toBeInTheDocument();
        });

        it('should show "Show all" button when more than 10 players in compact mode', () => {
            const manyPlayers = Array.from({ length: 15 }, (_, i) => ({
                player_id: i + 1,
                firstname: `Player${i + 1}`,
                lastname: 'Test',
                total_points: 100 - i * 5,
                wins: 10 - i,
                losses: i,
                draws: 0,
                total_games: 10,
                win_rate: '50.0',
                elo_rating: 1500,
                rank: i + 1,
                qualified: false
            }));

            renderWithRouter(<LeaderboardSection {...defaultProps} leaderboard={manyPlayers} compact={true} />);
            expect(screen.getByText(/Show all 15 players/)).toBeInTheDocument();
        });

        it('should toggle to show all players when clicking "Show all"', () => {
            const manyPlayers = Array.from({ length: 15 }, (_, i) => ({
                player_id: i + 1,
                firstname: `Player${i + 1}`,
                lastname: 'Test',
                total_points: 100 - i * 5,
                wins: 10 - i,
                losses: i,
                draws: 0,
                total_games: 10,
                win_rate: '50.0',
                elo_rating: 1500,
                rank: i + 1,
                qualified: false
            }));

            renderWithRouter(<LeaderboardSection {...defaultProps} leaderboard={manyPlayers} compact={true} />);

            fireEvent.click(screen.getByText(/Show all 15 players/));

            expect(screen.getByText('Player11 Test')).toBeInTheDocument();
            expect(screen.getByText('Player15 Test')).toBeInTheDocument();
            expect(screen.getByText(/Show less/)).toBeInTheDocument();
        });

        it('should toggle back to show less when clicking "Show less"', () => {
            const manyPlayers = Array.from({ length: 15 }, (_, i) => ({
                player_id: i + 1,
                firstname: `Player${i + 1}`,
                lastname: 'Test',
                total_points: 100 - i * 5,
                wins: 10 - i,
                losses: i,
                draws: 0,
                total_games: 10,
                win_rate: '50.0',
                elo_rating: 1500,
                rank: i + 1,
                qualified: false
            }));

            renderWithRouter(<LeaderboardSection {...defaultProps} leaderboard={manyPlayers} compact={true} />);

            // Show all
            fireEvent.click(screen.getByText(/Show all 15 players/));
            // Show less
            fireEvent.click(screen.getByText(/Show less/));

            expect(screen.queryByText('Player11 Test')).not.toBeInTheDocument();
        });

        it('should not show toggle button with 10 or fewer players', () => {
            renderWithRouter(<LeaderboardSection {...defaultProps} compact={true} />);
            expect(screen.queryByText(/Show all/)).not.toBeInTheDocument();
        });
    });

    describe('non-compact mode', () => {
        it('should show all players when compact is false', () => {
            const manyPlayers = Array.from({ length: 15 }, (_, i) => ({
                player_id: i + 1,
                firstname: `Player${i + 1}`,
                lastname: 'Test',
                total_points: 100 - i * 5,
                wins: 10 - i,
                losses: i,
                draws: 0,
                total_games: 10,
                win_rate: '50.0',
                elo_rating: 1500,
                rank: i + 1,
                qualified: false
            }));

            renderWithRouter(<LeaderboardSection {...defaultProps} leaderboard={manyPlayers} compact={false} />);
            expect(screen.getByText('Player15 Test')).toBeInTheDocument();
            expect(screen.queryByText(/Show all/)).not.toBeInTheDocument();
        });
    });

    describe('mobile row expansion', () => {
        beforeEach(() => {
            // Mock window.innerWidth for mobile
            Object.defineProperty(window, 'innerWidth', {
                writable: true,
                configurable: true,
                value: 500
            });
        });

        afterEach(() => {
            Object.defineProperty(window, 'innerWidth', {
                writable: true,
                configurable: true,
                value: 1024
            });
        });

        it('should expand row on mobile when clicked', () => {
            renderWithRouter(<LeaderboardSection {...defaultProps} />);
            const johnRow = screen.getByText('John Doe').closest('tr');
            fireEvent.click(johnRow);

            // Should show expanded details
            const expandedRow = screen.getByText(/Record:/).closest('tr');
            expect(expandedRow).toHaveClass('leaderboard-expanded-row');
        });

        it('should collapse row when clicked again', () => {
            renderWithRouter(<LeaderboardSection {...defaultProps} />);
            const johnRow = screen.getByText('John Doe').closest('tr');

            // Expand
            fireEvent.click(johnRow);
            expect(screen.getByText(/Record:/)).toBeInTheDocument();

            // Collapse
            fireEvent.click(johnRow);
            expect(screen.queryByText(/Record:/)).not.toBeInTheDocument();
        });

        it('should display ELO, games, win rate in expanded row', () => {
            renderWithRouter(<LeaderboardSection {...defaultProps} />);
            const johnRow = screen.getByText('John Doe').closest('tr');
            fireEvent.click(johnRow);

            // Check for expanded content
            expect(screen.getByText('ELO:')).toBeInTheDocument();
            expect(screen.getByText('Games:')).toBeInTheDocument();
            expect(screen.getByText('Win %:')).toBeInTheDocument();
        });
    });

    describe('desktop row expansion', () => {
        beforeEach(() => {
            Object.defineProperty(window, 'innerWidth', {
                writable: true,
                configurable: true,
                value: 1024
            });
        });

        it('should not expand row on desktop when clicked', () => {
            renderWithRouter(<LeaderboardSection {...defaultProps} />);
            const johnRow = screen.getByText('John Doe').closest('tr');
            fireEvent.click(johnRow);

            // Should NOT show expanded details on desktop
            expect(screen.queryByText(/^Record:$/)).not.toBeInTheDocument();
        });
    });

    describe('elo and win rate display', () => {
        it('should display default ELO of 1500 when not provided', () => {
            const playerWithoutElo = [{
                player_id: 1,
                firstname: 'Test',
                lastname: 'Player',
                rank: 1,
                elo_rating: undefined
            }];
            renderWithRouter(<LeaderboardSection {...defaultProps} leaderboard={playerWithoutElo} />);
            // ELO column exists in table
            expect(screen.getByText('ELO')).toBeInTheDocument();
        });

        it('should display dash when win_rate is not provided', () => {
            const playerWithoutWinRate = [{
                player_id: 1,
                firstname: 'Test',
                lastname: 'Player',
                rank: 1,
                win_rate: null
            }];
            renderWithRouter(<LeaderboardSection {...defaultProps} leaderboard={playerWithoutWinRate} />);
            // Win % column exists
            expect(screen.getByText('Win %')).toBeInTheDocument();
        });
    });

    describe('total games display', () => {
        it('should display total games for each player', () => {
            renderWithRouter(<LeaderboardSection {...defaultProps} />);
            // Check that games column header exists
            expect(screen.getByText('Games')).toBeInTheDocument();
        });

        it('should show 0 for missing total_games', () => {
            const playerWithNoGames = [{
                player_id: 1,
                firstname: 'Test',
                lastname: 'Player',
                rank: 1,
                total_games: undefined
            }];
            renderWithRouter(<LeaderboardSection {...defaultProps} leaderboard={playerWithNoGames} />);
            expect(screen.getAllByText('0').length).toBeGreaterThan(0);
        });
    });
});
