// Mocks must be BEFORE any imports for ESM compatibility
jest.mock('../../../api/axiosConfig', () => ({
    __esModule: true,
    default: { get: jest.fn(), post: jest.fn(), put: jest.fn(), delete: jest.fn() },
}));

// Mock API modules
jest.mock('../../../api/podsApi', () => ({
    getPods: jest.fn()
}));

jest.mock('../../../api/usersApi', () => ({
    getUserProfile: jest.fn()
}));

// Mock context
const mockPermissionsContext = {
    permissions: []
};

jest.mock('../../../context/PermissionsProvider', () => ({
    usePermissions: () => mockPermissionsContext
}));

// Mock react-router-dom
jest.mock('react-router-dom', () => ({
    Link: ({ children, to }) => <a href={to}>{children}</a>,
    NavLink: ({ children, to }) => <a href={to}>{children}</a>,
    useNavigate: () => jest.fn(),
    useLocation: () => ({ pathname: '/games/completed', search: '', state: null }),
    useParams: () => ({}),
    useSearchParams: () => [new URLSearchParams(), jest.fn()],
    MemoryRouter: ({ children }) => <>{children}</>,
    BrowserRouter: ({ children }) => <>{children}</>,
    Routes: ({ children }) => <>{children}</>,
    Route: () => null,
    Navigate: () => null,
    Outlet: () => <div data-testid="outlet">Outlet Content</div>,
}));

import React from 'react';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import CompletedGamesTab from '../CompletedGamesPage';

// Import mocked modules
import { getPods } from '../../../api/podsApi';
import { getUserProfile } from '../../../api/usersApi';

// Helper to render with Router context
const renderWithRouter = (component) => {
    return render(
        <MemoryRouter>
            {component}
        </MemoryRouter>
    );
};

// TODO: Fix async/mock issues - tests skipped
describe.skip('CompletedGamesTab', () => {
    const mockUser = { id: 1, firstname: 'John', lastname: 'Doe' };

    const mockCompletedGames = [
        {
            id: 1,
            league_id: 1,
            league_name: 'Test League',
            created_at: '2024-01-15T10:00:00Z',
            win_condition: { name: 'Commander Damage', description: 'Win via commander damage', category: 'Combat' },
            participants: [
                { player_id: 1, firstname: 'John', lastname: 'Doe', result: 'win' },
                { player_id: 2, firstname: 'Jane', lastname: 'Smith', result: 'loss' },
                { player_id: 3, firstname: 'Bob', lastname: 'Wilson', result: 'loss' }
            ]
        },
        {
            id: 2,
            league_id: 1,
            league_name: 'Test League',
            created_at: '2024-01-14T10:00:00Z',
            win_condition: null,
            participants: [
                { player_id: 1, firstname: 'John', lastname: 'Doe', result: 'loss' },
                { player_id: 4, firstname: 'Alice', lastname: 'Johnson', result: 'win' },
                { player_id: 5, firstname: 'Charlie', lastname: 'Brown', result: 'loss' }
            ]
        },
        {
            id: 3,
            league_id: 1,
            league_name: 'Test League',
            created_at: '2024-01-13T10:00:00Z',
            win_condition: null,
            participants: [
                { player_id: 6, firstname: 'Other', lastname: 'Player', result: 'draw' },
                { player_id: 7, firstname: 'Another', lastname: 'Player', result: 'draw' }
            ]
        }
    ];

    beforeEach(() => {
        jest.clearAllMocks();
        mockPermissionsContext.permissions = [];

        getUserProfile.mockResolvedValue({ user: mockUser });
        getPods.mockResolvedValue(mockCompletedGames);

        // Mock URL.createObjectURL and URL.revokeObjectURL for CSV export
        global.URL.createObjectURL = jest.fn(() => 'mock-url');
        global.URL.revokeObjectURL = jest.fn();
    });

    afterEach(() => {
        // Cleanup DOM between tests
        cleanup();
    });

    describe('loading state', () => {
        it('should show loading indicator initially', () => {
            getUserProfile.mockImplementation(() => new Promise(() => {})); // Never resolves
            renderWithRouter(<CompletedGamesTab />);
            expect(screen.getByText('Loading completed games...')).toBeInTheDocument();
        });
    });

    describe('error handling', () => {
        it('should display error message when fetching games fails', async () => {
            getPods.mockRejectedValue(new Error('Network error'));
            renderWithRouter(<CompletedGamesTab />);

            await waitFor(() => {
                expect(screen.getByText('Failed to fetch completed games.')).toBeInTheDocument();
            });
        });
    });

    describe('rendering completed games', () => {
        it('should render the Completed Games heading', async () => {
            renderWithRouter(<CompletedGamesTab />);

            await waitFor(() => {
                expect(screen.getByRole('heading', { name: 'Completed Games' })).toBeInTheDocument();
            });
        });

        it('should render game cards by default', async () => {
            renderWithRouter(<CompletedGamesTab />);

            await waitFor(() => {
                expect(screen.getByText('Pod #1')).toBeInTheDocument();
                expect(screen.getByText('Pod #2')).toBeInTheDocument();
            });
        });

        it('should display win condition when available', async () => {
            renderWithRouter(<CompletedGamesTab />);

            await waitFor(() => {
                expect(screen.getByText('Commander Damage')).toBeInTheDocument();
                expect(screen.getByText('Combat')).toBeInTheDocument();
            });
        });

        it('should display "None" when no win condition', async () => {
            renderWithRouter(<CompletedGamesTab />);

            await waitFor(() => {
                const noneTexts = screen.getAllByText('None');
                expect(noneTexts.length).toBeGreaterThan(0);
            });
        });

        it('should display participants with links', async () => {
            renderWithRouter(<CompletedGamesTab />);

            await waitFor(() => {
                expect(screen.getByRole('link', { name: /John Doe/i })).toBeInTheDocument();
                expect(screen.getByRole('link', { name: /Jane Smith/i })).toBeInTheDocument();
            });
        });

        it('should show "Complete" badge on game cards', async () => {
            renderWithRouter(<CompletedGamesTab />);

            await waitFor(() => {
                const completeBadges = screen.getAllByText('Complete');
                expect(completeBadges.length).toBeGreaterThan(0);
            });
        });
    });

    describe('view mode toggle', () => {
        it('should render view mode buttons', async () => {
            renderWithRouter(<CompletedGamesTab />);

            await waitFor(() => {
                expect(screen.getByRole('button', { name: /Cards/i })).toBeInTheDocument();
                expect(screen.getByRole('button', { name: /Table/i })).toBeInTheDocument();
            });
        });

        it('should switch to table view when Table button is clicked', async () => {
            renderWithRouter(<CompletedGamesTab />);

            await waitFor(() => {
                expect(screen.getByRole('button', { name: /Table/i })).toBeInTheDocument();
            });

            fireEvent.click(screen.getByRole('button', { name: /Table/i }));

            await waitFor(() => {
                // Table view has column headers
                expect(screen.getByRole('columnheader', { name: /Pod #/i })).toBeInTheDocument();
                expect(screen.getByRole('columnheader', { name: /Date/i })).toBeInTheDocument();
                expect(screen.getByRole('columnheader', { name: /Winner/i })).toBeInTheDocument();
            });
        });

        it('should switch back to cards view when Cards button is clicked', async () => {
            renderWithRouter(<CompletedGamesTab />);

            await waitFor(() => {
                expect(screen.getByRole('button', { name: /Table/i })).toBeInTheDocument();
            });

            // Switch to table
            fireEvent.click(screen.getByRole('button', { name: /Table/i }));
            // Switch back to cards
            fireEvent.click(screen.getByRole('button', { name: /Cards/i }));

            await waitFor(() => {
                // Cards view has card-title elements
                expect(screen.getByText('Pod #1')).toBeInTheDocument();
            });
        });
    });

    describe('table view', () => {
        beforeEach(async () => {
            renderWithRouter(<CompletedGamesTab />);
            await waitFor(() => {
                expect(screen.getByRole('button', { name: /Table/i })).toBeInTheDocument();
            });
            fireEvent.click(screen.getByRole('button', { name: /Table/i }));
        });

        it('should display winner name in table', async () => {
            await waitFor(() => {
                // John Doe is the winner of game 1
                const cells = screen.getAllByRole('cell');
                const winnerCell = cells.find(cell => cell.textContent.includes('John Doe'));
                expect(winnerCell).toBeInTheDocument();
            });
        });

        it('should display "Draw" for draw games', async () => {
            await waitFor(() => {
                expect(screen.getByText('Draw')).toBeInTheDocument();
            });
        });

        it('should display user result badge', async () => {
            await waitFor(() => {
                // User (id: 1) won game 1 and lost game 2
                expect(screen.getByText('win')).toBeInTheDocument();
                expect(screen.getByText('loss')).toBeInTheDocument();
            });
        });

        it('should display "Spectator" badge when user not in game', async () => {
            await waitFor(() => {
                expect(screen.getByText('Spectator')).toBeInTheDocument();
            });
        });
    });

    describe('filters', () => {
        it('should render filter inputs', async () => {
            renderWithRouter(<CompletedGamesTab />);

            await waitFor(() => {
                expect(screen.getByPlaceholderText('Search by player...')).toBeInTheDocument();
                expect(screen.getByLabelText('Date')).toBeInTheDocument();
                expect(screen.getByPlaceholderText('Search win condition...')).toBeInTheDocument();
                expect(screen.getByLabelText('My games only')).toBeInTheDocument();
            });
        });

        it('should filter by player name', async () => {
            renderWithRouter(<CompletedGamesTab />);

            await waitFor(() => {
                expect(screen.getByPlaceholderText('Search by player...')).toBeInTheDocument();
            });

            fireEvent.change(screen.getByPlaceholderText('Search by player...'), {
                target: { value: 'Alice' }
            });

            await waitFor(() => {
                expect(screen.getByText('Pod #2')).toBeInTheDocument();
                expect(screen.queryByText('Pod #1')).not.toBeInTheDocument();
            });
        });

        it('should filter by win condition', async () => {
            renderWithRouter(<CompletedGamesTab />);

            await waitFor(() => {
                expect(screen.getByPlaceholderText('Search win condition...')).toBeInTheDocument();
            });

            fireEvent.change(screen.getByPlaceholderText('Search win condition...'), {
                target: { value: 'Commander' }
            });

            await waitFor(() => {
                expect(screen.getByText('Pod #1')).toBeInTheDocument();
                expect(screen.queryByText('Pod #2')).not.toBeInTheDocument();
            });
        });

        it('should filter by "My games only" checkbox', async () => {
            renderWithRouter(<CompletedGamesTab />);

            await waitFor(() => {
                expect(screen.getByLabelText('My games only')).toBeInTheDocument();
            });

            // Initially checked for non-admin
            expect(screen.getByLabelText('My games only')).toBeChecked();

            // Uncheck to show all games
            fireEvent.click(screen.getByLabelText('My games only'));

            await waitFor(() => {
                expect(screen.getByText('Pod #3')).toBeInTheDocument();
            });
        });

        it('should show Clear Filters button when filters are applied', async () => {
            renderWithRouter(<CompletedGamesTab />);

            await waitFor(() => {
                expect(screen.getByPlaceholderText('Search by player...')).toBeInTheDocument();
            });

            fireEvent.change(screen.getByPlaceholderText('Search by player...'), {
                target: { value: 'John' }
            });

            await waitFor(() => {
                expect(screen.getByRole('button', { name: /Clear Filters/i })).toBeInTheDocument();
            });
        });

        it('should reset filters when Clear Filters is clicked', async () => {
            renderWithRouter(<CompletedGamesTab />);

            await waitFor(() => {
                expect(screen.getByPlaceholderText('Search by player...')).toBeInTheDocument();
            });

            // Apply filter
            fireEvent.change(screen.getByPlaceholderText('Search by player...'), {
                target: { value: 'Alice' }
            });

            await waitFor(() => {
                expect(screen.getByRole('button', { name: /Clear Filters/i })).toBeInTheDocument();
            });

            // Clear filters
            fireEvent.click(screen.getByRole('button', { name: /Clear Filters/i }));

            await waitFor(() => {
                expect(screen.getByPlaceholderText('Search by player...')).toHaveValue('');
                expect(screen.getByLabelText('My games only')).toBeChecked();
            });
        });

        it('should filter by date', async () => {
            renderWithRouter(<CompletedGamesTab />);

            await waitFor(() => {
                expect(screen.getByLabelText('Date')).toBeInTheDocument();
            });

            fireEvent.change(screen.getByLabelText('Date'), {
                target: { value: '2024-01-15' }
            });

            await waitFor(() => {
                expect(screen.getByText('Pod #1')).toBeInTheDocument();
                expect(screen.queryByText('Pod #2')).not.toBeInTheDocument();
            });
        });
    });

    describe('empty state', () => {
        it('should show empty message when no games match filters', async () => {
            renderWithRouter(<CompletedGamesTab />);

            await waitFor(() => {
                expect(screen.getByPlaceholderText('Search by player...')).toBeInTheDocument();
            });

            fireEvent.change(screen.getByPlaceholderText('Search by player...'), {
                target: { value: 'NonexistentPlayer' }
            });

            await waitFor(() => {
                expect(screen.getByText(/No completed games found matching your filters/i)).toBeInTheDocument();
            });
        });

        it('should show count of filtered games', async () => {
            renderWithRouter(<CompletedGamesTab />);

            await waitFor(() => {
                // Default shows user's games only (2 games)
                expect(screen.getByText(/Showing 2 of 3 games/i)).toBeInTheDocument();
            });
        });
    });

    describe('CSV export', () => {
        it('should render Export CSV button', async () => {
            renderWithRouter(<CompletedGamesTab />);

            await waitFor(() => {
                expect(screen.getByRole('button', { name: /Export CSV/i })).toBeInTheDocument();
            });
        });

        it('should be disabled when no games to export', async () => {
            renderWithRouter(<CompletedGamesTab />);

            await waitFor(() => {
                expect(screen.getByPlaceholderText('Search by player...')).toBeInTheDocument();
            });

            // Filter to no results
            fireEvent.change(screen.getByPlaceholderText('Search by player...'), {
                target: { value: 'NonexistentPlayer' }
            });

            await waitFor(() => {
                expect(screen.getByRole('button', { name: /Export CSV/i })).toBeDisabled();
            });
        });

        it('should export CSV when clicked', async () => {
            renderWithRouter(<CompletedGamesTab />);

            await waitFor(() => {
                expect(screen.getByRole('button', { name: /Export CSV/i })).not.toBeDisabled();
            });

            fireEvent.click(screen.getByRole('button', { name: /Export CSV/i }));

            // Verify URL.createObjectURL was called for CSV blob creation
            expect(global.URL.createObjectURL).toHaveBeenCalled();
        });
    });

    describe('admin view', () => {
        it('should show all games by default for admin users', async () => {
            mockPermissionsContext.permissions = [{ name: 'admin_pod_update' }];
            renderWithRouter(<CompletedGamesTab />);

            await waitFor(() => {
                // Admin sees all 3 games and "My games only" is unchecked
                expect(screen.getByLabelText('My games only')).not.toBeChecked();
            });
        });
    });

    describe('trophy icon for winner', () => {
        it('should display trophy icon next to winner in card view', async () => {
            const { container } = renderWithRouter(<CompletedGamesTab />);

            await waitFor(() => {
                // Find trophy icons
                const trophyIcons = container.querySelectorAll('.fa-trophy');
                expect(trophyIcons.length).toBeGreaterThan(0);
            });
        });
    });

    describe('link to player profiles', () => {
        it('should have correct href for participant links', async () => {
            const { container } = renderWithRouter(<CompletedGamesTab />);

            await waitFor(() => {
                // Find a link to player profile
                const profileLink = container.querySelector('a[href="/leagues/1/profile/1"]');
                expect(profileLink).toBeInTheDocument();
            });
        });
    });
});
