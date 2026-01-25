// Mock the API - MUST be before any imports
jest.mock('../../../api/usersApi', () => ({
    getGlobalLeaderboard: jest.fn()
}));

// Mock the permissions context
const mockPermissionsContext = {
    user: null,
    permissions: [],
    loading: false
};

jest.mock('../../../context/PermissionsProvider', () => ({
    usePermissions: () => mockPermissionsContext
}));

// Mock the Skeleton component
jest.mock('../../Shared/Skeleton', () => ({
    SkeletonLeaderboard: ({ rows }) => (
        <div data-testid="skeleton-leaderboard" data-rows={rows}>Loading Skeleton</div>
    )
}));

// Mock CSS import
jest.mock('../GlobalLeaderboard.css', () => ({}));

// Mock axiosConfig to prevent ESM issues
jest.mock('../../../api/axiosConfig', () => ({
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
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import GlobalLeaderboard from '../GlobalLeaderboard';
import { getGlobalLeaderboard } from '../../../api/usersApi';

describe('GlobalLeaderboard', () => {
    const mockLeaderboardData = [
        {
            player_id: 1,
            firstname: 'Alice',
            lastname: 'Smith',
            rank: 1,
            elo_rating: 1800,
            wins: 10,
            losses: 2,
            draws: 1,
            total_games: 13,
            win_rate: '76.92'
        },
        {
            player_id: 2,
            firstname: 'Bob',
            lastname: 'Johnson',
            rank: 2,
            elo_rating: 1750,
            wins: 8,
            losses: 4,
            draws: 0,
            total_games: 12,
            win_rate: '66.67'
        },
        {
            player_id: 3,
            firstname: 'Charlie',
            lastname: 'Brown',
            rank: 3,
            elo_rating: 1700,
            wins: 6,
            losses: 6,
            draws: 2,
            total_games: 14,
            win_rate: '42.86'
        },
        {
            player_id: 4,
            firstname: 'Diana',
            lastname: 'Prince',
            rank: 4,
            elo_rating: 1650,
            wins: 5,
            losses: 5,
            draws: 0,
            total_games: 10,
            win_rate: '50.00'
        }
    ];

    beforeEach(() => {
        jest.clearAllMocks();
        jest.spyOn(console, 'error').mockImplementation(() => {});
        // Reset mock context
        mockPermissionsContext.user = null;
        mockPermissionsContext.permissions = [];
        mockPermissionsContext.loading = false;
        // Mock window.innerWidth for desktop by default
        Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 1024 });
    });

    afterEach(() => {
        console.error.mockRestore();
    });

    describe('loading state', () => {
        it('should show skeleton loader when loading', () => {
            getGlobalLeaderboard.mockImplementation(() => new Promise(() => {}));
            render(<GlobalLeaderboard />);
            expect(screen.getByTestId('skeleton-leaderboard')).toBeInTheDocument();
        });

        it('should pass correct rows prop to skeleton', () => {
            getGlobalLeaderboard.mockImplementation(() => new Promise(() => {}));
            render(<GlobalLeaderboard />);
            expect(screen.getByTestId('skeleton-leaderboard')).toHaveAttribute('data-rows', '10');
        });

        it('should show Global Leaderboard header during loading', () => {
            getGlobalLeaderboard.mockImplementation(() => new Promise(() => {}));
            render(<GlobalLeaderboard />);
            expect(screen.getByText('Global Leaderboard')).toBeInTheDocument();
        });

        it('should render globe icon in header during loading', () => {
            getGlobalLeaderboard.mockImplementation(() => new Promise(() => {}));
            render(<GlobalLeaderboard />);
            const header = screen.getByText('Global Leaderboard').closest('.card-header');
            expect(header.querySelector('.fa-globe')).toBeInTheDocument();
        });
    });

    describe('error state', () => {
        it('should show error message when API fails', async () => {
            getGlobalLeaderboard.mockRejectedValue(new Error('API Error'));
            render(<GlobalLeaderboard />);
            await waitFor(() => {
                expect(screen.getByText('Failed to fetch leaderboard.')).toBeInTheDocument();
            });
        });

        it('should render error alert with correct class', async () => {
            getGlobalLeaderboard.mockRejectedValue(new Error('API Error'));
            render(<GlobalLeaderboard />);
            await waitFor(() => {
                const alert = screen.getByText('Failed to fetch leaderboard.');
                expect(alert).toHaveClass('alert', 'alert-danger', 'text-center');
            });
        });

        it('should log error to console', async () => {
            const testError = new Error('Test error');
            getGlobalLeaderboard.mockRejectedValue(testError);
            render(<GlobalLeaderboard />);
            await waitFor(() => {
                expect(console.error).toHaveBeenCalledWith('Error fetching global leaderboard:', testError);
            });
        });
    });

    describe('empty state', () => {
        it('should show empty message when leaderboard is empty', async () => {
            getGlobalLeaderboard.mockResolvedValue({ leaderboard: [] });
            render(<GlobalLeaderboard />);
            await waitFor(() => {
                expect(screen.getByText('No players have completed games yet.')).toBeInTheDocument();
            });
        });

        it('should render empty warning with correct class', async () => {
            getGlobalLeaderboard.mockResolvedValue({ leaderboard: [] });
            render(<GlobalLeaderboard />);
            await waitFor(() => {
                const alert = screen.getByText('No players have completed games yet.');
                expect(alert).toHaveClass('alert', 'alert-warning', 'mb-0');
            });
        });

        it('should show Global Leaderboard header when empty', async () => {
            getGlobalLeaderboard.mockResolvedValue({ leaderboard: [] });
            render(<GlobalLeaderboard />);
            await waitFor(() => {
                expect(screen.getByText('Global Leaderboard')).toBeInTheDocument();
            });
        });
    });

    describe('successful data display', () => {
        beforeEach(() => {
            getGlobalLeaderboard.mockResolvedValue({ leaderboard: mockLeaderboardData });
        });

        it('should render all players', async () => {
            render(<GlobalLeaderboard />);
            await waitFor(() => {
                expect(screen.getByText('Alice Smith')).toBeInTheDocument();
                expect(screen.getByText('Bob Johnson')).toBeInTheDocument();
                expect(screen.getByText('Charlie Brown')).toBeInTheDocument();
                expect(screen.getByText('Diana Prince')).toBeInTheDocument();
            });
        });

        it('should show player count badge', async () => {
            render(<GlobalLeaderboard />);
            await waitFor(() => {
                expect(screen.getByText('4')).toBeInTheDocument();
            });
        });

        it('should render ELO ratings', async () => {
            render(<GlobalLeaderboard />);
            await waitFor(() => {
                expect(screen.getByText('1800')).toBeInTheDocument();
                expect(screen.getByText('1750')).toBeInTheDocument();
            });
        });

        it('should render table headers', async () => {
            render(<GlobalLeaderboard />);
            await waitFor(() => {
                expect(screen.getAllByText('Rank').length).toBeGreaterThan(0);
                expect(screen.getAllByText('Player').length).toBeGreaterThan(0);
                expect(screen.getAllByText(/ELO/).length).toBeGreaterThan(0);
                expect(screen.getAllByText(/Record/).length).toBeGreaterThan(0);
                expect(screen.getAllByText(/Games/).length).toBeGreaterThan(0);
                expect(screen.getAllByText(/Win %/).length).toBeGreaterThan(0);
            });
        });

        it('should show lifetime ELO subtitle', async () => {
            render(<GlobalLeaderboard />);
            await waitFor(() => {
                expect(screen.getByText('Ranked by lifetime ELO')).toBeInTheDocument();
            });
        });
    });

    describe('rank display', () => {
        beforeEach(() => {
            getGlobalLeaderboard.mockResolvedValue({ leaderboard: mockLeaderboardData });
        });

        it('should show crown icon for rank 1', async () => {
            render(<GlobalLeaderboard />);
            await waitFor(() => {
                const rankBadge = screen.getByText('#1').closest('.badge');
                expect(rankBadge).toHaveClass('bg-warning', 'text-dark');
                expect(rankBadge.querySelector('.fa-crown')).toBeInTheDocument();
            });
        });

        it('should show silver badge for rank 2', async () => {
            render(<GlobalLeaderboard />);
            await waitFor(() => {
                const rankBadge = screen.getByText('#2').closest('.badge');
                expect(rankBadge).toHaveClass('bg-secondary');
            });
        });

        it('should show bronze badge for rank 3', async () => {
            render(<GlobalLeaderboard />);
            await waitFor(() => {
                const rankBadge = screen.getByText('#3').closest('.badge');
                expect(rankBadge).toHaveClass('bg-danger');
            });
        });

        it('should show text-muted for rank 4+', async () => {
            render(<GlobalLeaderboard />);
            await waitFor(() => {
                const rankText = screen.getByText('#4');
                expect(rankText).toHaveClass('text-muted');
            });
        });
    });

    describe('current user highlighting', () => {
        it('should highlight current user row', async () => {
            mockPermissionsContext.user = { id: 2 }; // Bob's ID
            getGlobalLeaderboard.mockResolvedValue({ leaderboard: mockLeaderboardData });
            render(<GlobalLeaderboard />);
            await waitFor(() => {
                const bobRow = screen.getByText('Bob Johnson').closest('tr');
                expect(bobRow).toHaveClass('table-primary');
            });
        });

        it('should show "(you)" label for current user', async () => {
            mockPermissionsContext.user = { id: 1 }; // Alice's ID
            getGlobalLeaderboard.mockResolvedValue({ leaderboard: mockLeaderboardData });
            render(<GlobalLeaderboard />);
            await waitFor(() => {
                expect(screen.getByText('(you)')).toBeInTheDocument();
            });
        });

        it('should not highlight rows when user is not in leaderboard', async () => {
            mockPermissionsContext.user = { id: 999 };
            getGlobalLeaderboard.mockResolvedValue({ leaderboard: mockLeaderboardData });
            render(<GlobalLeaderboard />);
            await waitFor(() => {
                const rows = screen.getAllByRole('row');
                // Skip header row
                rows.slice(1).forEach(row => {
                    expect(row).not.toHaveClass('table-primary');
                });
            });
        });

        it('should not show "(you)" when user is null', async () => {
            mockPermissionsContext.user = null;
            getGlobalLeaderboard.mockResolvedValue({ leaderboard: mockLeaderboardData });
            render(<GlobalLeaderboard />);
            await waitFor(() => {
                expect(screen.queryByText('(you)')).not.toBeInTheDocument();
            });
        });
    });

    describe('record formatting', () => {
        it('should format record with wins and losses', async () => {
            getGlobalLeaderboard.mockResolvedValue({ leaderboard: mockLeaderboardData });
            render(<GlobalLeaderboard />);
            await waitFor(() => {
                // Bob has no draws, should show W-L format
                const bobRow = screen.getByText('Bob Johnson').closest('tr');
                expect(within(bobRow).getByText('8W')).toBeInTheDocument();
                expect(within(bobRow).getByText('4L')).toBeInTheDocument();
            });
        });

        it('should include draws when player has draws', async () => {
            getGlobalLeaderboard.mockResolvedValue({ leaderboard: mockLeaderboardData });
            render(<GlobalLeaderboard />);
            await waitFor(() => {
                // Alice has draws
                const aliceRow = screen.getByText('Alice Smith').closest('tr');
                expect(within(aliceRow).getByText('10W')).toBeInTheDocument();
                expect(within(aliceRow).getByText('2L')).toBeInTheDocument();
                expect(within(aliceRow).getByText('1D')).toBeInTheDocument();
            });
        });

        it('should handle zero wins', async () => {
            const playerWithNoWins = [{
                player_id: 5,
                firstname: 'Newbie',
                lastname: 'Player',
                rank: 1,
                elo_rating: 1400,
                wins: 0,
                losses: 3,
                draws: 0,
                total_games: 3,
                win_rate: '0.00'
            }];
            getGlobalLeaderboard.mockResolvedValue({ leaderboard: playerWithNoWins });
            render(<GlobalLeaderboard />);
            await waitFor(() => {
                expect(screen.getByText('0W')).toBeInTheDocument();
            });
        });

        it('should handle null wins/losses', async () => {
            const playerWithNullStats = [{
                player_id: 5,
                firstname: 'Null',
                lastname: 'Stats',
                rank: 1,
                elo_rating: 1500,
                wins: null,
                losses: null,
                draws: null,
                total_games: 0,
                win_rate: null
            }];
            getGlobalLeaderboard.mockResolvedValue({ leaderboard: playerWithNullStats });
            render(<GlobalLeaderboard />);
            await waitFor(() => {
                expect(screen.getByText('0W')).toBeInTheDocument();
                expect(screen.getByText('0L')).toBeInTheDocument();
            });
        });
    });

    describe('win rate display', () => {
        it('should display win rate with percentage', async () => {
            getGlobalLeaderboard.mockResolvedValue({ leaderboard: mockLeaderboardData });
            render(<GlobalLeaderboard />);
            await waitFor(() => {
                expect(screen.getByText('76.92%')).toBeInTheDocument();
            });
        });

        it('should display dash when win rate is null', async () => {
            const playerWithNullWinRate = [{
                player_id: 5,
                firstname: 'New',
                lastname: 'Player',
                rank: 1,
                elo_rating: 1500,
                wins: 0,
                losses: 0,
                draws: 0,
                total_games: 0,
                win_rate: null
            }];
            getGlobalLeaderboard.mockResolvedValue({ leaderboard: playerWithNullWinRate });
            render(<GlobalLeaderboard />);
            await waitFor(() => {
                const cells = screen.getAllByText('-');
                expect(cells.length).toBeGreaterThan(0);
            });
        });
    });

    describe('default ELO display', () => {
        it('should show 1500 when elo_rating is null', async () => {
            const playerWithNullElo = [{
                player_id: 5,
                firstname: 'Default',
                lastname: 'Elo',
                rank: 1,
                elo_rating: null,
                wins: 0,
                losses: 0,
                draws: 0,
                total_games: 0,
                win_rate: null
            }];
            getGlobalLeaderboard.mockResolvedValue({ leaderboard: playerWithNullElo });
            render(<GlobalLeaderboard />);
            await waitFor(() => {
                expect(screen.getByText('1500')).toBeInTheDocument();
            });
        });
    });

    describe('sorting functionality', () => {
        beforeEach(() => {
            getGlobalLeaderboard.mockResolvedValue({ leaderboard: mockLeaderboardData });
        });

        it('should sort by ELO when clicking ELO header', async () => {
            render(<GlobalLeaderboard />);
            await waitFor(() => {
                expect(screen.getByText('Alice Smith')).toBeInTheDocument();
            });

            // Find the ELO header in the table (not the "lifetime ELO" text)
            const eloHeaders = screen.getAllByText(/^ELO/);
            const eloHeader = eloHeaders.find(el => el.closest('th'))?.closest('th');
            fireEvent.click(eloHeader);

            // Should now be ascending (lowest first)
            const rows = screen.getAllByRole('row').slice(1); // Skip header
            expect(within(rows[0]).getByText('Diana Prince')).toBeInTheDocument();
        });

        it('should toggle sort direction on subsequent clicks', async () => {
            render(<GlobalLeaderboard />);
            await waitFor(() => {
                expect(screen.getByText('Alice Smith')).toBeInTheDocument();
            });

            // Find the ELO header in the table (not the "lifetime ELO" text)
            const eloHeaders = screen.getAllByText(/^ELO/);
            const eloHeader = eloHeaders.find(el => el.closest('th'))?.closest('th');

            // First click - ascending
            fireEvent.click(eloHeader);
            let rows = screen.getAllByRole('row').slice(1);
            expect(within(rows[0]).getByText('Diana Prince')).toBeInTheDocument();

            // Second click - descending
            fireEvent.click(eloHeader);
            rows = screen.getAllByRole('row').slice(1);
            expect(within(rows[0]).getByText('Alice Smith')).toBeInTheDocument();
        });

        it('should sort by wins when clicking Record header', async () => {
            render(<GlobalLeaderboard />);
            await waitFor(() => {
                expect(screen.getByText('Alice Smith')).toBeInTheDocument();
            });

            const recordHeader = screen.getAllByText(/Record/)[0].closest('th');
            fireEvent.click(recordHeader);

            // Should be ascending (lowest wins first)
            const rows = screen.getAllByRole('row').slice(1);
            expect(within(rows[0]).getByText('Diana Prince')).toBeInTheDocument();
        });

        it('should sort by total games when clicking Games header', async () => {
            render(<GlobalLeaderboard />);
            await waitFor(() => {
                expect(screen.getByText('Alice Smith')).toBeInTheDocument();
            });

            const gamesHeader = screen.getAllByText(/Games/)[0].closest('th');
            fireEvent.click(gamesHeader);

            // Should be ascending (lowest games first)
            const rows = screen.getAllByRole('row').slice(1);
            expect(within(rows[0]).getByText('Diana Prince')).toBeInTheDocument(); // 10 games
        });

        it('should sort by win rate when clicking Win % header', async () => {
            render(<GlobalLeaderboard />);
            await waitFor(() => {
                expect(screen.getByText('Alice Smith')).toBeInTheDocument();
            });

            const winRateHeader = screen.getAllByText(/Win %/)[0].closest('th');
            fireEvent.click(winRateHeader);

            // Should be ascending (lowest win rate first)
            const rows = screen.getAllByRole('row').slice(1);
            expect(within(rows[0]).getByText('Charlie Brown')).toBeInTheDocument(); // 42.86%
        });

        it('should update ranks after sorting', async () => {
            render(<GlobalLeaderboard />);
            await waitFor(() => {
                expect(screen.getByText('Alice Smith')).toBeInTheDocument();
            });

            const eloHeader = screen.getAllByText(/^ELO/).find(el => el.closest('th'))?.closest('th');
            fireEvent.click(eloHeader); // Sort ascending

            // After sort, Diana (lowest ELO) should be rank 1
            const rows = screen.getAllByRole('row').slice(1);
            const dianaRow = within(rows[0]);
            expect(dianaRow.getByText('#1')).toBeInTheDocument();
        });

        it('should handle sorting with null values', async () => {
            const dataWithNulls = [
                ...mockLeaderboardData,
                {
                    player_id: 5,
                    firstname: 'Null',
                    lastname: 'Values',
                    rank: 5,
                    elo_rating: null,
                    wins: null,
                    losses: null,
                    draws: null,
                    total_games: null,
                    win_rate: null
                }
            ];
            getGlobalLeaderboard.mockResolvedValue({ leaderboard: dataWithNulls });
            render(<GlobalLeaderboard />);
            await waitFor(() => {
                expect(screen.getByText('Null Values')).toBeInTheDocument();
            });

            const eloHeader = screen.getAllByText(/^ELO/).find(el => el.closest('th'))?.closest('th');
            fireEvent.click(eloHeader);

            // Should not crash, null values treated as 0
            const rows = screen.getAllByRole('row').slice(1);
            expect(within(rows[0]).getByText('Null Values')).toBeInTheDocument();
        });
    });

    describe('sort icons', () => {
        beforeEach(() => {
            getGlobalLeaderboard.mockResolvedValue({ leaderboard: mockLeaderboardData });
        });

        it('should show inactive sort icon for non-sorted columns', async () => {
            render(<GlobalLeaderboard />);
            await waitFor(() => {
                expect(screen.getByText('Alice Smith')).toBeInTheDocument();
            });

            // Games column should have inactive icon (ELO is default sorted)
            const gamesHeader = screen.getAllByText(/Games/)[0].closest('th');
            expect(gamesHeader.querySelector('.fa-sort')).toBeInTheDocument();
            expect(gamesHeader.querySelector('.sort-icon-inactive')).toBeInTheDocument();
        });

        it('should show down arrow for descending sort', async () => {
            render(<GlobalLeaderboard />);
            await waitFor(() => {
                expect(screen.getByText('Alice Smith')).toBeInTheDocument();
            });

            // ELO is default sorted descending
            const eloHeader = screen.getAllByText(/^ELO/).find(el => el.closest('th'))?.closest('th');
            expect(eloHeader.querySelector('.fa-sort-down')).toBeInTheDocument();
        });

        it('should show up arrow for ascending sort', async () => {
            render(<GlobalLeaderboard />);
            await waitFor(() => {
                expect(screen.getByText('Alice Smith')).toBeInTheDocument();
            });

            const eloHeader = screen.getAllByText(/^ELO/).find(el => el.closest('th'))?.closest('th');
            fireEvent.click(eloHeader); // Sort ascending

            expect(eloHeader.querySelector('.fa-sort-up')).toBeInTheDocument();
        });
    });

    describe('mobile view', () => {
        beforeEach(() => {
            Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 500 });
            getGlobalLeaderboard.mockResolvedValue({ leaderboard: mockLeaderboardData });
        });

        it('should toggle expanded row on click in mobile view', async () => {
            render(<GlobalLeaderboard />);
            await waitFor(() => {
                expect(screen.getByText('Alice Smith')).toBeInTheDocument();
            });

            const aliceRow = screen.getByText('Alice Smith').closest('tr');
            fireEvent.click(aliceRow);

            // Should show expanded details
            await waitFor(() => {
                const expandedRows = document.querySelectorAll('.leaderboard-expanded-row');
                expect(expandedRows.length).toBe(1);
            });
        });

        it('should collapse row when clicking again', async () => {
            render(<GlobalLeaderboard />);
            await waitFor(() => {
                expect(screen.getByText('Alice Smith')).toBeInTheDocument();
            });

            const aliceRow = screen.getByText('Alice Smith').closest('tr');

            // Click to expand
            fireEvent.click(aliceRow);
            await waitFor(() => {
                expect(document.querySelector('.leaderboard-expanded-row')).toBeInTheDocument();
            });

            // Click again to collapse
            fireEvent.click(aliceRow);
            await waitFor(() => {
                expect(document.querySelector('.leaderboard-expanded-row')).not.toBeInTheDocument();
            });
        });

        it('should show expanded stats with Record label', async () => {
            render(<GlobalLeaderboard />);
            await waitFor(() => {
                expect(screen.getByText('Alice Smith')).toBeInTheDocument();
            });

            const aliceRow = screen.getByText('Alice Smith').closest('tr');
            fireEvent.click(aliceRow);

            await waitFor(() => {
                const expandedRow = document.querySelector('.leaderboard-expanded-row');
                expect(within(expandedRow).getByText('Record:')).toBeInTheDocument();
            });
        });

        it('should show Games in expanded row', async () => {
            render(<GlobalLeaderboard />);
            await waitFor(() => {
                expect(screen.getByText('Alice Smith')).toBeInTheDocument();
            });

            const aliceRow = screen.getByText('Alice Smith').closest('tr');
            fireEvent.click(aliceRow);

            await waitFor(() => {
                const expandedRow = document.querySelector('.leaderboard-expanded-row');
                expect(within(expandedRow).getByText('Games:')).toBeInTheDocument();
            });
        });

        it('should show Win % in expanded row', async () => {
            render(<GlobalLeaderboard />);
            await waitFor(() => {
                expect(screen.getByText('Alice Smith')).toBeInTheDocument();
            });

            const aliceRow = screen.getByText('Alice Smith').closest('tr');
            fireEvent.click(aliceRow);

            await waitFor(() => {
                const expandedRow = document.querySelector('.leaderboard-expanded-row');
                expect(within(expandedRow).getByText('Win %:')).toBeInTheDocument();
            });
        });

        it('should switch expanded row when clicking different player', async () => {
            render(<GlobalLeaderboard />);
            await waitFor(() => {
                expect(screen.getByText('Alice Smith')).toBeInTheDocument();
            });

            // Expand Alice's row
            const aliceRow = screen.getByText('Alice Smith').closest('tr');
            fireEvent.click(aliceRow);

            await waitFor(() => {
                expect(document.querySelector('.leaderboard-expanded-row')).toBeInTheDocument();
            });

            // Click Bob's row
            const bobRow = screen.getByText('Bob Johnson').closest('tr');
            fireEvent.click(bobRow);

            // Only Bob's row should be expanded
            await waitFor(() => {
                const expandedRows = document.querySelectorAll('.leaderboard-expanded-row');
                expect(expandedRows.length).toBe(1);
            });
        });

        it('should include draws in expanded row when player has draws', async () => {
            render(<GlobalLeaderboard />);
            await waitFor(() => {
                expect(screen.getByText('Alice Smith')).toBeInTheDocument();
            });

            const aliceRow = screen.getByText('Alice Smith').closest('tr');
            fireEvent.click(aliceRow);

            await waitFor(() => {
                const expandedRow = document.querySelector('.leaderboard-expanded-row');
                expect(within(expandedRow).getByText('1D')).toBeInTheDocument();
            });
        });
    });

    describe('desktop view row click', () => {
        beforeEach(() => {
            Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 1024 });
            getGlobalLeaderboard.mockResolvedValue({ leaderboard: mockLeaderboardData });
        });

        it('should not toggle expanded row on desktop', async () => {
            render(<GlobalLeaderboard />);
            await waitFor(() => {
                expect(screen.getByText('Alice Smith')).toBeInTheDocument();
            });

            const aliceRow = screen.getByText('Alice Smith').closest('tr');
            fireEvent.click(aliceRow);

            // Should not expand
            expect(document.querySelector('.leaderboard-expanded-row')).not.toBeInTheDocument();
        });
    });

    describe('total games display', () => {
        it('should show 0 when total_games is null', async () => {
            const playerWithNullGames = [{
                player_id: 5,
                firstname: 'No',
                lastname: 'Games',
                rank: 1,
                elo_rating: 1500,
                wins: 0,
                losses: 0,
                draws: 0,
                total_games: null,
                win_rate: null
            }];
            getGlobalLeaderboard.mockResolvedValue({ leaderboard: playerWithNullGames });
            render(<GlobalLeaderboard />);
            await waitFor(() => {
                // Check that 0 is displayed for total games
                const row = screen.getByText('No Games').closest('tr');
                // Total games column (5th td)
                const cells = within(row).getAllByRole('cell');
                expect(cells[4]).toHaveTextContent('0');
            });
        });
    });

    describe('API call behavior', () => {
        it('should call getGlobalLeaderboard on mount', async () => {
            getGlobalLeaderboard.mockResolvedValue({ leaderboard: [] });
            render(<GlobalLeaderboard />);
            await waitFor(() => {
                expect(getGlobalLeaderboard).toHaveBeenCalledTimes(1);
            });
        });

        it('should only call API once', async () => {
            getGlobalLeaderboard.mockResolvedValue({ leaderboard: mockLeaderboardData });
            render(<GlobalLeaderboard />);
            await waitFor(() => {
                expect(screen.getByText('Alice Smith')).toBeInTheDocument();
            });
            // Wait a bit more
            await new Promise(resolve => setTimeout(resolve, 100));
            expect(getGlobalLeaderboard).toHaveBeenCalledTimes(1);
        });
    });
});
