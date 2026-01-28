import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import HomePage from '../HomePage';

// Mock react-router-dom
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
    Link: ({ children, to }) => <a href={to}>{children}</a>,
    NavLink: ({ children, to }) => <a href={to}>{children}</a>,
    useNavigate: () => mockNavigate,
    useLocation: () => ({ pathname: '/', search: '', state: null }),
    useParams: () => ({}),
    useSearchParams: () => [new URLSearchParams(), jest.fn()],
    MemoryRouter: ({ children }) => <>{children}</>,
    BrowserRouter: ({ children }) => <>{children}</>,
    Routes: ({ children }) => <>{children}</>,
    Route: () => null,
    Navigate: () => null,
    Outlet: () => null,
}));

// Mock APIs - Note: getActiveLeague is no longer used, HomePage uses context instead
jest.mock('../../../api/leaguesApi', () => ({
    getLeagueStats: jest.fn(),
}));

jest.mock('../../../api/podsApi', () => ({
    getPods: jest.fn(),
}));

// Default mock permissions (logged in user with no active league)
let mockPermissions = {
    activeLeague: null,
    user: { id: 1, email: 'test@example.com' },
    loading: false,
};

// Mock PermissionsProvider
jest.mock('../../../context/PermissionsProvider', () => ({
    usePermissions: () => mockPermissions
}));

// Mock child components to simplify testing
jest.mock('../LiveStatsBar', () => {
    return function MockLiveStatsBar({ activeGames, totalPlayers, completedGames, loading }) {
        return (
            <div data-testid="live-stats-bar">
                {loading ? 'Loading...' : `${activeGames} active, ${totalPlayers} players, ${completedGames} games`}
            </div>
        );
    };
});

jest.mock('../ActiveLeagueCard', () => {
    return function MockActiveLeagueCard({ league, playerCount }) {
        return (
            <div data-testid="active-league-card">
                {league ? `League: ${league.name}, ${playerCount} players` : 'No league'}
            </div>
        );
    };
});

jest.mock('../RecentWinners', () => {
    return function MockRecentWinners({ games, loading }) {
        return (
            <div data-testid="recent-winners">
                {loading ? 'Loading...' : `${games?.length || 0} recent games`}
            </div>
        );
    };
});

jest.mock('../../Leagues/Dashboard/LeaderboardSection', () => {
    return function MockLeaderboardSection({ leaderboard, compact }) {
        return (
            <div data-testid="leaderboard-section">
                {leaderboard.length} players {compact ? '(compact)' : ''}
            </div>
        );
    };
});

import { getLeagueStats } from '../../../api/leaguesApi';
import { getPods } from '../../../api/podsApi';

describe('HomePage', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        // Reset mock permissions to default (logged in, no league)
        mockPermissions = {
            activeLeague: null,
            user: { id: 1, email: 'test@example.com' },
            loading: false,
        };
        // Default API mocks
        getLeagueStats.mockResolvedValue({ leaderboard: [] });
        getPods.mockResolvedValue([]);
    });

    describe('hero section rendering', () => {
        it('should render the hero section', async () => {
            const { container } = render(<HomePage />);
            await waitFor(() => {
                expect(container.querySelector('.hero-section')).toBeInTheDocument();
            });
        });

        it('should render the hero background', async () => {
            const { container } = render(<HomePage />);
            await waitFor(() => {
                expect(container.querySelector('.hero-background')).toBeInTheDocument();
            });
        });

        it('should render the hero content', async () => {
            const { container } = render(<HomePage />);
            await waitFor(() => {
                expect(container.querySelector('.hero-content')).toBeInTheDocument();
            });
        });

        it('should render the welcome heading', async () => {
            render(<HomePage />);
            await waitFor(() => {
                expect(screen.getByRole('heading', { name: 'Welcome to Escalation League' })).toBeInTheDocument();
            });
        });

        it('should render the tagline text', async () => {
            render(<HomePage />);
            await waitFor(() => {
                expect(screen.getByText('Compete, track your progress, and climb the leaderboard!')).toBeInTheDocument();
            });
        });

        it('should render the Join a League button in hero section', async () => {
            render(<HomePage />);
            await waitFor(() => {
                const buttons = screen.getAllByRole('button', { name: 'Join a League' });
                expect(buttons.length).toBeGreaterThanOrEqual(1);
            });
        });
    });

    describe('new components rendering', () => {
        it('should render LiveStatsBar component', async () => {
            render(<HomePage />);
            await waitFor(() => {
                expect(screen.getByTestId('live-stats-bar')).toBeInTheDocument();
            });
        });

        it('should render ActiveLeagueCard component', async () => {
            render(<HomePage />);
            await waitFor(() => {
                expect(screen.getByTestId('active-league-card')).toBeInTheDocument();
            });
        });

        it('should render RecentWinners component', async () => {
            render(<HomePage />);
            await waitFor(() => {
                expect(screen.getByTestId('recent-winners')).toBeInTheDocument();
            });
        });

        it('should render Top Players section', async () => {
            render(<HomePage />);
            await waitFor(() => {
                expect(screen.getByText('Top Players')).toBeInTheDocument();
            });
        });
    });

    describe('data fetching', () => {
        it('should use activeLeague from context (not call API)', async () => {
            // HomePage now uses activeLeague from PermissionsProvider context
            // instead of calling getActiveLeague API directly
            render(<HomePage />);
            await waitFor(() => {
                // Component should render without API call
                expect(screen.getByTestId('active-league-card')).toBeInTheDocument();
            });
        });

        it('should fetch league stats when active league exists in context', async () => {
            const mockLeague = { id: 1, name: 'Season 5' };
            mockPermissions = {
                activeLeague: mockLeague,
                user: { id: 1, email: 'test@example.com' },
                loading: false,
            };
            getLeagueStats.mockResolvedValue({ leaderboard: [] });

            render(<HomePage />);
            await waitFor(() => {
                expect(getLeagueStats).toHaveBeenCalledWith(1);
            });
        });

        it('should fetch pods when active league exists in context', async () => {
            const mockLeague = { id: 1, name: 'Season 5' };
            mockPermissions = {
                activeLeague: mockLeague,
                user: { id: 1, email: 'test@example.com' },
                loading: false,
            };

            render(<HomePage />);
            await waitFor(() => {
                expect(getPods).toHaveBeenCalledWith({ confirmation_status: 'active', league_id: 1 });
                expect(getPods).toHaveBeenCalledWith({ confirmation_status: 'complete', league_id: 1 });
            });
        });

        it('should not fetch league data when no active league in context', async () => {
            // activeLeague is null by default in mock
            render(<HomePage />);
            await waitFor(() => {
                expect(screen.getByTestId('active-league-card')).toBeInTheDocument();
            });
            expect(getLeagueStats).not.toHaveBeenCalled();
        });
    });

    describe('with active league data', () => {
        const mockLeague = { id: 1, name: 'Season 5' };
        const mockLeaderboard = [
            { user_id: 1, firstname: 'Alice', total_points: 24 },
            { user_id: 2, firstname: 'Bob', total_points: 21 },
            { user_id: 3, firstname: 'Carol', total_points: 18 },
        ];
        const mockActivePods = [{ id: 1 }, { id: 2 }];
        const mockCompletedPods = [
            { id: 10, created_at: '2025-01-15T10:00:00Z' },
            { id: 11, created_at: '2025-01-14T10:00:00Z' },
        ];

        beforeEach(() => {
            // Set activeLeague in context instead of mocking getActiveLeague
            mockPermissions = {
                activeLeague: mockLeague,
                user: { id: 1, email: 'test@example.com' },
                loading: false,
            };
            getLeagueStats.mockResolvedValue({ leaderboard: mockLeaderboard });
            getPods.mockImplementation(({ confirmation_status }) => {
                if (confirmation_status === 'active') return Promise.resolve(mockActivePods);
                if (confirmation_status === 'complete') return Promise.resolve(mockCompletedPods);
                return Promise.resolve([]);
            });
        });

        it('should display league data in ActiveLeagueCard', async () => {
            render(<HomePage />);
            await waitFor(() => {
                expect(screen.getByTestId('active-league-card')).toHaveTextContent('League: Season 5');
            });
        });

        it('should display stats in LiveStatsBar', async () => {
            render(<HomePage />);
            await waitFor(() => {
                expect(screen.getByTestId('live-stats-bar')).toHaveTextContent('2 active');
                expect(screen.getByTestId('live-stats-bar')).toHaveTextContent('3 players');
                expect(screen.getByTestId('live-stats-bar')).toHaveTextContent('2 games');
            });
        });

        it('should render LeaderboardSection when leaderboard has data', async () => {
            render(<HomePage />);
            await waitFor(() => {
                expect(screen.getByTestId('leaderboard-section')).toBeInTheDocument();
            });
        });

        it('should pass compact=true to LeaderboardSection', async () => {
            render(<HomePage />);
            await waitFor(() => {
                expect(screen.getByTestId('leaderboard-section')).toHaveTextContent('(compact)');
            });
        });

        it('should show View Full Leaderboard button', async () => {
            render(<HomePage />);
            await waitFor(() => {
                expect(screen.getByRole('button', { name: /view full leaderboard/i })).toBeInTheDocument();
            });
        });
    });

    describe('empty leaderboard state', () => {
        it('should show no standings message when leaderboard is empty', async () => {
            mockPermissions = {
                activeLeague: { id: 1, name: 'Test League' },
                user: { id: 1, email: 'test@example.com' },
                loading: false,
            };
            getLeagueStats.mockResolvedValue({ leaderboard: [] });

            render(<HomePage />);
            await waitFor(() => {
                expect(screen.getByText('No standings yet')).toBeInTheDocument();
            });
        });
    });

    describe('quick links section', () => {
        it('should render the quick links section', async () => {
            const { container } = render(<HomePage />);
            await waitFor(() => {
                expect(container.querySelector('.quick-links')).toBeInTheDocument();
            });
        });

        it('should render three homepage cards', async () => {
            const { container } = render(<HomePage />);
            await waitFor(() => {
                const cards = container.querySelectorAll('.homepage-card');
                expect(cards).toHaveLength(3);
            });
        });

        it('should render Join a League card', async () => {
            render(<HomePage />);
            await waitFor(() => {
                expect(screen.getByRole('heading', { name: 'Join a League' })).toBeInTheDocument();
            });
        });

        it('should render View Games card', async () => {
            render(<HomePage />);
            await waitFor(() => {
                expect(screen.getByRole('heading', { name: 'View Games' })).toBeInTheDocument();
            });
        });

        it('should render Leaderboard card', async () => {
            render(<HomePage />);
            await waitFor(() => {
                expect(screen.getByRole('heading', { name: 'Leaderboard' })).toBeInTheDocument();
            });
        });
    });

    describe('navigation - hero button', () => {
        it('should navigate to /leagues when hero button is clicked', async () => {
            render(<HomePage />);
            await waitFor(() => {
                const heroButton = screen.getByRole('button', { name: 'Join a League' });
                fireEvent.click(heroButton);
            });
            expect(mockNavigate).toHaveBeenCalledWith('/leagues');
        });
    });

    describe('navigation - quick link cards', () => {
        it('should navigate to /leagues when Join a League card is clicked', async () => {
            const { container } = render(<HomePage />);
            await waitFor(() => {
                const cards = container.querySelectorAll('.homepage-card');
                fireEvent.click(cards[0]);
            });
            expect(mockNavigate).toHaveBeenCalledWith('/leagues');
        });

        it('should navigate to /pods when View Games card is clicked', async () => {
            const { container } = render(<HomePage />);
            await waitFor(() => {
                const cards = container.querySelectorAll('.homepage-card');
                fireEvent.click(cards[1]);
            });
            expect(mockNavigate).toHaveBeenCalledWith('/pods');
        });

        it('should navigate to /leagues when Leaderboard card is clicked', async () => {
            const { container } = render(<HomePage />);
            await waitFor(() => {
                const cards = container.querySelectorAll('.homepage-card');
                fireEvent.click(cards[2]);
            });
            expect(mockNavigate).toHaveBeenCalledWith('/leagues');
        });

        it('should navigate to /leagues when View Full Leaderboard is clicked', async () => {
            mockPermissions = {
                activeLeague: { id: 1, name: 'Test League' },
                user: { id: 1, email: 'test@example.com' },
                loading: false,
            };
            getLeagueStats.mockResolvedValue({
                leaderboard: [{ user_id: 1, firstname: 'Alice', total_points: 24 }]
            });

            render(<HomePage />);
            await waitFor(() => {
                const viewButton = screen.getByRole('button', { name: /view full leaderboard/i });
                fireEvent.click(viewButton);
            });
            expect(mockNavigate).toHaveBeenCalledWith('/leagues');
        });
    });

    describe('error handling', () => {
        it('should render with no league when context has no active league', async () => {
            // Default mock has activeLeague: null
            render(<HomePage />);
            await waitFor(() => {
                // Should still render without crashing
                expect(screen.getByTestId('active-league-card')).toHaveTextContent('No league');
            });
        });

        it('should handle getLeagueStats failure gracefully', async () => {
            mockPermissions = {
                activeLeague: { id: 1, name: 'Test League' },
                user: { id: 1, email: 'test@example.com' },
                loading: false,
            };
            getLeagueStats.mockRejectedValue(new Error('Network error'));

            render(<HomePage />);
            await waitFor(() => {
                // Should still render the page
                expect(screen.getByText('Top Players')).toBeInTheDocument();
            });
        });

        it('should handle getPods failure gracefully', async () => {
            mockPermissions = {
                activeLeague: { id: 1, name: 'Test League' },
                user: { id: 1, email: 'test@example.com' },
                loading: false,
            };
            getLeagueStats.mockResolvedValue({ leaderboard: [] });
            getPods.mockRejectedValue(new Error('Network error'));

            render(<HomePage />);
            await waitFor(() => {
                // Should still render the page
                expect(screen.getByTestId('live-stats-bar')).toBeInTheDocument();
            });
        });
    });

    describe('styling', () => {
        it('should have btn-primary class on hero button', async () => {
            render(<HomePage />);
            await waitFor(() => {
                const heroButton = screen.getByRole('button', { name: 'Join a League' });
                expect(heroButton).toHaveClass('btn', 'btn-primary');
            });
        });
    });
});
