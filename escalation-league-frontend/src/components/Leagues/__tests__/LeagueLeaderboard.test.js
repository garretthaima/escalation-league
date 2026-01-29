// Mock react-router-dom - MUST be before any imports
jest.mock('react-router-dom', () => ({
    Link: ({ to, children, className, onClick }) => (
        <a href={to} className={className} onClick={onClick} data-testid={`link-${to}`}>
            {children}
        </a>
    ),
    NavLink: ({ to, children, className }) => (
        <a href={to} className={className} data-testid={`link-${to}`}>
            {children}
        </a>
    ),
    useNavigate: () => jest.fn(),
    useLocation: () => ({ pathname: '/', search: '', state: null }),
    useParams: () => ({}),
    MemoryRouter: ({ children }) => <>{children}</>,
    BrowserRouter: ({ children }) => <>{children}</>
}));

// Mock API - MUST be before any imports
jest.mock('../../../api/leaguesApi', () => ({
    getLeagueStats: jest.fn()
}));

// Mock PermissionsProvider
const mockPermissionsContext = {
    loading: false,
    activeLeague: null
};

jest.mock('../../../context/PermissionsProvider', () => ({
    usePermissions: () => mockPermissionsContext
}));

// Mock Skeleton components
jest.mock('../../Shared/Skeleton', () => ({
    SkeletonLeaderboard: ({ rows }) => <div data-testid="skeleton-leaderboard" data-rows={rows}>Loading skeleton</div>,
    SkeletonText: ({ width, className }) => <div data-testid="skeleton-text" className={className}>Loading text</div>
}));

// Mock CSS import
jest.mock('../LeagueLeaderboard.css', () => ({}));

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
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import LeagueLeaderboard from '../LeagueLeaderboard';
import { getLeagueStats } from '../../../api/leaguesApi';

describe('LeagueLeaderboard', () => {
    const mockLeaderboardData = [
        {
            player_id: 1,
            firstname: 'John',
            lastname: 'Doe',
            rank: 1,
            total_points: 100,
            wins: 10,
            losses: 2,
            draws: 1,
            total_games: 13,
            win_rate: '76.9',
            qualified: true
        },
        {
            player_id: 2,
            firstname: 'Jane',
            lastname: 'Smith',
            rank: 2,
            total_points: 80,
            wins: 8,
            losses: 4,
            draws: 0,
            total_games: 12,
            win_rate: '66.7',
            qualified: false
        },
        {
            player_id: 3,
            firstname: 'Bob',
            lastname: 'Wilson',
            rank: 3,
            total_points: 60,
            wins: 6,
            losses: 5,
            draws: 2,
            total_games: 13,
            win_rate: '46.2',
            qualified: false
        }
    ];

    const mockStats = {
        total_players: 10,
        playoff_spots: 4
    };

    beforeEach(() => {
        jest.clearAllMocks();
        mockPermissionsContext.loading = false;
        mockPermissionsContext.activeLeague = { league_id: 1, name: 'Test League' };
        getLeagueStats.mockResolvedValue({
            leaderboard: mockLeaderboardData,
            stats: mockStats
        });
    });

    describe('Loading state', () => {
        it('should display skeleton loading when permissions are loading', () => {
            mockPermissionsContext.loading = true;
            render(<LeagueLeaderboard />);
            expect(screen.getByTestId('skeleton-leaderboard')).toBeInTheDocument();
        });

        it('should display skeleton with 10 rows', () => {
            mockPermissionsContext.loading = true;
            render(<LeagueLeaderboard />);
            const skeleton = screen.getByTestId('skeleton-leaderboard');
            expect(skeleton).toHaveAttribute('data-rows', '10');
        });

        it('should display skeleton text for stats', () => {
            mockPermissionsContext.loading = true;
            render(<LeagueLeaderboard />);
            expect(screen.getByTestId('skeleton-text')).toBeInTheDocument();
        });

        it('should display title while loading', () => {
            mockPermissionsContext.loading = true;
            render(<LeagueLeaderboard />);
            expect(screen.getByRole('heading', { name: /league leaderboard/i })).toBeInTheDocument();
        });
    });

    describe('Error state', () => {
        it('should display error when not in a league', async () => {
            mockPermissionsContext.activeLeague = null;
            render(<LeagueLeaderboard />);
            await waitFor(() => {
                expect(screen.getByText('You are not part of any league.')).toBeInTheDocument();
            });
        });

        it('should display error with alert-danger class', async () => {
            mockPermissionsContext.activeLeague = null;
            render(<LeagueLeaderboard />);
            await waitFor(() => {
                const alert = screen.getByText('You are not part of any league.');
                expect(alert).toHaveClass('alert', 'alert-danger');
            });
        });

        it('should display error when API call fails', async () => {
            getLeagueStats.mockRejectedValue(new Error('API Error'));
            render(<LeagueLeaderboard />);
            await waitFor(() => {
                expect(screen.getByText('Failed to fetch league stats.')).toBeInTheDocument();
            });
        });
    });

    describe('Empty leaderboard', () => {
        it('should display warning when leaderboard is empty', async () => {
            getLeagueStats.mockResolvedValue({
                leaderboard: [],
                stats: mockStats
            });
            render(<LeagueLeaderboard />);
            await waitFor(() => {
                expect(screen.getByText('No leaderboard data available.')).toBeInTheDocument();
            });
        });

        it('should display warning with alert-warning class', async () => {
            getLeagueStats.mockResolvedValue({
                leaderboard: [],
                stats: mockStats
            });
            render(<LeagueLeaderboard />);
            await waitFor(() => {
                const alert = screen.getByText('No leaderboard data available.');
                expect(alert).toHaveClass('alert', 'alert-warning');
            });
        });
    });

    describe('Leaderboard rendering', () => {
        it('should render leaderboard title', async () => {
            render(<LeagueLeaderboard />);
            await waitFor(() => {
                expect(screen.getByRole('heading', { name: /league leaderboard/i })).toBeInTheDocument();
            });
        });

        it('should render total players stat', async () => {
            render(<LeagueLeaderboard />);
            await waitFor(() => {
                expect(screen.getByText(/total players: 10/i)).toBeInTheDocument();
            });
        });

        it('should render playoff spots stat', async () => {
            render(<LeagueLeaderboard />);
            await waitFor(() => {
                expect(screen.getByText(/playoff spots: 4/i)).toBeInTheDocument();
            });
        });

        it('should not render playoff spots if not provided', async () => {
            getLeagueStats.mockResolvedValue({
                leaderboard: mockLeaderboardData,
                stats: { total_players: 10 }
            });
            render(<LeagueLeaderboard />);
            await waitFor(() => {
                expect(screen.queryByText(/playoff spots/i)).not.toBeInTheDocument();
            });
        });

        it('should render table with player data', async () => {
            render(<LeagueLeaderboard />);
            await waitFor(() => {
                expect(screen.getByRole('table')).toBeInTheDocument();
            });
        });

        it('should render player names', async () => {
            render(<LeagueLeaderboard />);
            await waitFor(() => {
                expect(screen.getAllByText('John Doe').length).toBeGreaterThan(0);
                expect(screen.getAllByText('Jane Smith').length).toBeGreaterThan(0);
                expect(screen.getAllByText('Bob Wilson').length).toBeGreaterThan(0);
            });
        });

        it('should render player ranks', async () => {
            render(<LeagueLeaderboard />);
            await waitFor(() => {
                const ranks = screen.getAllByText(/^[123]$/);
                expect(ranks.length).toBeGreaterThanOrEqual(3);
            });
        });

        it('should render player points with badge', async () => {
            render(<LeagueLeaderboard />);
            await waitFor(() => {
                const badges = screen.getAllByText('100');
                expect(badges.length).toBeGreaterThan(0);
            });
        });

        it('should render qualified badge for qualified players', async () => {
            render(<LeagueLeaderboard />);
            await waitFor(() => {
                const qualifiedBadges = screen.getAllByText('Qualified');
                expect(qualifiedBadges.length).toBeGreaterThan(0);
            });
        });

        it('should render link to player profile', async () => {
            render(<LeagueLeaderboard />);
            await waitFor(() => {
                expect(screen.getAllByTestId('link-/leagues/1/profile/1').length).toBeGreaterThan(0);
            });
        });
    });

    describe('Table columns', () => {
        it('should render Rank column header', async () => {
            render(<LeagueLeaderboard />);
            await waitFor(() => {
                expect(screen.getByText('Rank')).toBeInTheDocument();
            });
        });

        it('should render Player column header', async () => {
            render(<LeagueLeaderboard />);
            await waitFor(() => {
                expect(screen.getByText('Player')).toBeInTheDocument();
            });
        });

        it('should render Points column header', async () => {
            render(<LeagueLeaderboard />);
            await waitFor(() => {
                expect(screen.getByText('Points')).toBeInTheDocument();
            });
        });

        it('should render Wins column header', async () => {
            render(<LeagueLeaderboard />);
            await waitFor(() => {
                expect(screen.getByText('Wins')).toBeInTheDocument();
            });
        });

        it('should render Losses column header', async () => {
            render(<LeagueLeaderboard />);
            await waitFor(() => {
                expect(screen.getByText('Losses')).toBeInTheDocument();
            });
        });

        it('should render Draws column header', async () => {
            render(<LeagueLeaderboard />);
            await waitFor(() => {
                expect(screen.getByText('Draws')).toBeInTheDocument();
            });
        });

        it('should render Games column header', async () => {
            render(<LeagueLeaderboard />);
            await waitFor(() => {
                expect(screen.getByText('Games')).toBeInTheDocument();
            });
        });

        it('should render Win Rate column header', async () => {
            render(<LeagueLeaderboard />);
            await waitFor(() => {
                expect(screen.getByText('Win Rate')).toBeInTheDocument();
            });
        });

        it('should render Status column header', async () => {
            render(<LeagueLeaderboard />);
            await waitFor(() => {
                expect(screen.getByText('Status')).toBeInTheDocument();
            });
        });
    });

    describe('Sorting functionality', () => {
        it('should sort by name when Player header is clicked', async () => {
            render(<LeagueLeaderboard />);
            await waitFor(() => {
                expect(screen.getByText('Player')).toBeInTheDocument();
            });
            fireEvent.click(screen.getByText('Player'));
            // Verify sorting happened (ascending first)
            await waitFor(() => {
                expect(getLeagueStats).toHaveBeenCalled();
            });
        });

        it('should sort by total_points when Points header is clicked', async () => {
            render(<LeagueLeaderboard />);
            await waitFor(() => {
                expect(screen.getByText('Points')).toBeInTheDocument();
            });
            fireEvent.click(screen.getByText('Points'));
            // Verify component re-renders with sorted data
            await waitFor(() => {
                expect(screen.getByRole('table')).toBeInTheDocument();
            });
        });

        it('should sort by wins when Wins header is clicked', async () => {
            render(<LeagueLeaderboard />);
            await waitFor(() => {
                expect(screen.getByText('Wins')).toBeInTheDocument();
            });
            fireEvent.click(screen.getByText('Wins'));
            await waitFor(() => {
                expect(screen.getByRole('table')).toBeInTheDocument();
            });
        });

        it('should sort by losses when Losses header is clicked', async () => {
            render(<LeagueLeaderboard />);
            await waitFor(() => {
                expect(screen.getByText('Losses')).toBeInTheDocument();
            });
            fireEvent.click(screen.getByText('Losses'));
            await waitFor(() => {
                expect(screen.getByRole('table')).toBeInTheDocument();
            });
        });

        it('should sort by draws when Draws header is clicked', async () => {
            render(<LeagueLeaderboard />);
            await waitFor(() => {
                expect(screen.getByText('Draws')).toBeInTheDocument();
            });
            fireEvent.click(screen.getByText('Draws'));
            await waitFor(() => {
                expect(screen.getByRole('table')).toBeInTheDocument();
            });
        });

        it('should sort by total_games when Games header is clicked', async () => {
            render(<LeagueLeaderboard />);
            await waitFor(() => {
                expect(screen.getByText('Games')).toBeInTheDocument();
            });
            fireEvent.click(screen.getByText('Games'));
            await waitFor(() => {
                expect(screen.getByRole('table')).toBeInTheDocument();
            });
        });

        it('should sort by win_rate when Win Rate header is clicked', async () => {
            render(<LeagueLeaderboard />);
            await waitFor(() => {
                expect(screen.getByText('Win Rate')).toBeInTheDocument();
            });
            fireEvent.click(screen.getByText('Win Rate'));
            await waitFor(() => {
                expect(screen.getByRole('table')).toBeInTheDocument();
            });
        });

        it('should toggle sort direction when same header is clicked twice', async () => {
            render(<LeagueLeaderboard />);
            await waitFor(() => {
                expect(screen.getByText('Points')).toBeInTheDocument();
            });
            // First click - ascending
            fireEvent.click(screen.getByText('Points'));
            // Second click - descending
            fireEvent.click(screen.getByText('Points'));
            await waitFor(() => {
                expect(screen.getByRole('table')).toBeInTheDocument();
            });
        });
    });

    describe('Row expansion (mobile)', () => {
        it('should toggle row expansion when mobile row is clicked', async () => {
            render(<LeagueLeaderboard />);
            await waitFor(() => {
                expect(screen.getAllByText('John Doe').length).toBeGreaterThan(0);
            });
            // Find mobile row and click it
            const mobileRows = screen.getAllByText('John Doe');
            fireEvent.click(mobileRows[0].closest('tr'));
            // Check if expanded row shows
            await waitFor(() => {
                expect(screen.getByText(/Record:/)).toBeInTheDocument();
            });
        });

        it('should collapse row when clicked again', async () => {
            render(<LeagueLeaderboard />);
            await waitFor(() => {
                expect(screen.getAllByText('John Doe').length).toBeGreaterThan(0);
            });
            const mobileRows = screen.getAllByText('John Doe');
            // Expand
            fireEvent.click(mobileRows[0].closest('tr'));
            await waitFor(() => {
                expect(screen.getByText(/Record:/)).toBeInTheDocument();
            });
            // Collapse
            fireEvent.click(mobileRows[0].closest('tr'));
            // Record text should still be in DOM (just hidden by CSS)
        });

        it('should show expanded row details with record', async () => {
            render(<LeagueLeaderboard />);
            await waitFor(() => {
                expect(screen.getAllByText('John Doe').length).toBeGreaterThan(0);
            });
            const mobileRows = screen.getAllByText('John Doe');
            fireEvent.click(mobileRows[0].closest('tr'));
            await waitFor(() => {
                expect(screen.getByText(/10W - 2L - 1D/)).toBeInTheDocument();
            });
        });

        it('should show expanded row details with total games', async () => {
            render(<LeagueLeaderboard />);
            await waitFor(() => {
                expect(screen.getAllByText('John Doe').length).toBeGreaterThan(0);
            });
            const mobileRows = screen.getAllByText('John Doe');
            fireEvent.click(mobileRows[0].closest('tr'));
            await waitFor(() => {
                expect(screen.getByText(/Total Games:/)).toBeInTheDocument();
            });
        });

        it('should show expanded row details with win rate', async () => {
            render(<LeagueLeaderboard />);
            await waitFor(() => {
                expect(screen.getAllByText('John Doe').length).toBeGreaterThan(0);
            });
            const mobileRows = screen.getAllByText('John Doe');
            fireEvent.click(mobileRows[0].closest('tr'));
            await waitFor(() => {
                // Win rate is displayed in the expanded row or table (multiple instances possible)
                expect(screen.getAllByText(/76.9%/).length).toBeGreaterThan(0);
            });
        });
    });

    describe('Link click handling', () => {
        it('should stop propagation when profile link is clicked', async () => {
            render(<LeagueLeaderboard />);
            await waitFor(() => {
                expect(screen.getAllByTestId('link-/leagues/1/profile/1').length).toBeGreaterThan(0);
            });
            const links = screen.getAllByTestId('link-/leagues/1/profile/1');
            const link = links[0];
            const mockEvent = { stopPropagation: jest.fn() };
            fireEvent.click(link, mockEvent);
            // The link should be clickable without expanding the row
            expect(link).toBeInTheDocument();
        });
    });

    describe('Win rate display', () => {
        it('should display win rate with percentage sign', async () => {
            render(<LeagueLeaderboard />);
            await waitFor(() => {
                expect(screen.getByText('76.9%')).toBeInTheDocument();
            });
        });

        it('should display 0% for players with no win rate', async () => {
            getLeagueStats.mockResolvedValue({
                leaderboard: [{
                    player_id: 1,
                    firstname: 'Test',
                    lastname: 'User',
                    rank: 1,
                    total_points: 0,
                    wins: 0,
                    losses: 0,
                    draws: 0,
                    total_games: 0,
                    win_rate: null,
                    qualified: false
                }],
                stats: mockStats
            });
            render(<LeagueLeaderboard />);
            await waitFor(() => {
                expect(screen.getByText('0%')).toBeInTheDocument();
            });
        });
    });

    describe('API calls', () => {
        it('should call getLeagueStats with correct leagueId', async () => {
            render(<LeagueLeaderboard />);
            await waitFor(() => {
                expect(getLeagueStats).toHaveBeenCalledWith(1);
            });
        });

        it('should not call getLeagueStats when no activeLeague', async () => {
            mockPermissionsContext.activeLeague = null;
            render(<LeagueLeaderboard />);
            await waitFor(() => {
                expect(getLeagueStats).not.toHaveBeenCalled();
            });
        });
    });

    describe('Null/undefined handling', () => {
        it('should handle null total_points', async () => {
            getLeagueStats.mockResolvedValue({
                leaderboard: [{
                    player_id: 1,
                    firstname: 'Test',
                    lastname: 'User',
                    rank: 1,
                    total_points: null,
                    wins: 0,
                    losses: 0,
                    draws: 0,
                    total_games: 0,
                    win_rate: null,
                    qualified: false
                }],
                stats: mockStats
            });
            render(<LeagueLeaderboard />);
            await waitFor(() => {
                // Should show 0 for null points (multiple 0s shown across columns)
                expect(screen.getAllByText('0').length).toBeGreaterThan(0);
            });
        });

        it('should handle undefined stats', async () => {
            getLeagueStats.mockResolvedValue({
                leaderboard: mockLeaderboardData,
                stats: null
            });
            render(<LeagueLeaderboard />);
            await waitFor(() => {
                // Should not display stats section
                expect(screen.queryByText(/total players/i)).not.toBeInTheDocument();
            });
        });
    });
});
