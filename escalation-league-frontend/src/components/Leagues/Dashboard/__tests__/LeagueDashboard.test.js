import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import LeagueDashboard from '../LeagueDashboard';

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

// Mock API modules
jest.mock('../../../../api/leaguesApi', () => ({
    getLeagueDetails: jest.fn(),
    getLeagueStats: jest.fn()
}));

jest.mock('../../../../api/userLeaguesApi', () => ({
    getLeagueParticipants: jest.fn(),
    getUserLeagueStats: jest.fn()
}));

jest.mock('../../../../api/metagameApi', () => ({
    getMetagameAnalysis: jest.fn()
}));

// Mock context
const mockPermissionsContext = {
    user: { id: 1, firstname: 'John', lastname: 'Doe' },
    loading: false,
    activeLeague: { league_id: 1, name: 'Test League' }
};

jest.mock('../../../../context/PermissionsProvider', () => ({
    usePermissions: () => mockPermissionsContext
}));

// Mock child components
jest.mock('../../../Shared/CollapsibleSection', () => {
    return function MockCollapsibleSection({ title, children, badge, actions }) {
        return (
            <div data-testid={`collapsible-${title.toLowerCase().replace(' ', '-')}`}>
                <div data-testid="section-title">{title}</div>
                {badge && <span data-testid="section-badge">{badge}</span>}
                {actions && <div data-testid="section-actions">{actions}</div>}
                <div data-testid="section-content">{children}</div>
            </div>
        );
    };
});

jest.mock('../../../Shared/LoadingSpinner', () => {
    return function MockLoadingSpinner({ size }) {
        return <div data-testid="loading-spinner" data-size={size}>Loading...</div>;
    };
});

jest.mock('../UserStandingCard', () => {
    return function MockUserStandingCard({ userStats, leagueId, onUpdateCommander }) {
        return (
            <div data-testid="user-standing-card">
                <span>Points: {userStats?.total_points}</span>
                <button onClick={onUpdateCommander}>Update Commander</button>
            </div>
        );
    };
});

jest.mock('../LeaderboardSection', () => {
    return function MockLeaderboardSection({ leaderboard, leagueId, currentUserId, compact }) {
        return (
            <div data-testid="leaderboard-section">
                <span>Players: {leaderboard?.length || 0}</span>
                <span>Current User: {currentUserId}</span>
            </div>
        );
    };
});

jest.mock('../MetagamePreview', () => {
    return function MockMetagamePreview({ metagame, leagueId, loading }) {
        return (
            <div data-testid="metagame-preview">
                {loading ? 'Loading metagame...' : metagame ? `Decks: ${metagame.totalDecks}` : 'No metagame'}
            </div>
        );
    };
});

jest.mock('../ParticipantsSection', () => {
    return function MockParticipantsSection({ participants, leagueId }) {
        return (
            <div data-testid="participants-section">
                <span>Participants: {participants?.length || 0}</span>
            </div>
        );
    };
});

jest.mock('../../UpdateCommanderModal', () => {
    return function MockUpdateCommanderModal({ show, onHide, onUpdate, leagueId, currentCommander }) {
        return show ? (
            <div data-testid="update-commander-modal">
                <span>League: {leagueId}</span>
                <span>Commander: {currentCommander}</span>
                <button onClick={onHide}>Close</button>
                <button onClick={onUpdate}>Update</button>
            </div>
        ) : null;
    };
});

import { getLeagueDetails, getLeagueStats } from '../../../../api/leaguesApi';
import { getLeagueParticipants, getUserLeagueStats } from '../../../../api/userLeaguesApi';
import { getMetagameAnalysis } from '../../../../api/metagameApi';

describe('LeagueDashboard', () => {
    const mockLeagueDetails = {
        id: 1,
        name: 'Test League',
        description: 'A test league for testing',
        current_week: 5,
        start_date: '2024-01-01',
        end_date: '2024-03-31',
        weekly_budget: 50
    };

    const mockUserStats = {
        total_points: 100,
        league_wins: 10,
        league_losses: 5,
        current_commander: 'Atraxa',
        commander_partner: null,
        decklist_url: 'https://moxfield.com/deck/123'
    };

    const mockLeaderboard = [
        { player_id: 1, firstname: 'John', lastname: 'Doe', total_points: 100, rank: 1 },
        { player_id: 2, firstname: 'Jane', lastname: 'Smith', total_points: 90, rank: 2 }
    ];

    const mockParticipants = [
        { user_id: 1, firstname: 'John', lastname: 'Doe', current_commander: 'Atraxa' },
        { user_id: 2, firstname: 'Jane', lastname: 'Smith', current_commander: 'Korvold' }
    ];

    const mockMetagame = {
        totalDecks: 25,
        totalCards: 1500,
        colorDistribution: [{ color: 'U', count: 10 }]
    };

    beforeEach(() => {
        jest.clearAllMocks();

        // Reset mock context
        mockPermissionsContext.user = { id: 1, firstname: 'John', lastname: 'Doe' };
        mockPermissionsContext.loading = false;
        mockPermissionsContext.activeLeague = { league_id: 1, name: 'Test League' };

        // Setup default API responses
        getLeagueDetails.mockResolvedValue(mockLeagueDetails);
        getLeagueStats.mockResolvedValue({ leaderboard: mockLeaderboard });
        getLeagueParticipants.mockResolvedValue(mockParticipants);
        getUserLeagueStats.mockResolvedValue(mockUserStats);
        getMetagameAnalysis.mockResolvedValue(mockMetagame);
    });

    describe('loading state', () => {
        it('should render loading spinner while permissions are loading', () => {
            mockPermissionsContext.loading = true;
            render(<LeagueDashboard />);
            expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
        });

        it('should render loading spinner while fetching data', async () => {
            getLeagueDetails.mockImplementation(() => new Promise(() => {})); // Never resolves

            render(<LeagueDashboard />);
            expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
        });

        it('should have lg size on loading spinner', () => {
            mockPermissionsContext.loading = true;
            render(<LeagueDashboard />);
            expect(screen.getByTestId('loading-spinner')).toHaveAttribute('data-size', 'lg');
        });
    });

    describe('navigation redirect', () => {
        it('should navigate to signup when not in a league', async () => {
            mockPermissionsContext.activeLeague = null;

            render(<LeagueDashboard />);

            await waitFor(() => {
                expect(mockNavigate).toHaveBeenCalledWith('/leagues/signup');
            });
        });
    });

    describe('error state', () => {
        it('should display error message when API fails', async () => {
            getLeagueDetails.mockRejectedValue(new Error('API Error'));

            render(<LeagueDashboard />);

            await waitFor(() => {
                expect(screen.getByText('Failed to load league dashboard.')).toBeInTheDocument();
            });
        });

        it('should have alert-danger class on error', async () => {
            getLeagueDetails.mockRejectedValue(new Error('API Error'));

            const { container } = render(<LeagueDashboard />);

            await waitFor(() => {
                expect(container.querySelector('.alert.alert-danger')).toBeInTheDocument();
            });
        });
    });

    describe('successful data loading', () => {
        it('should display league name', async () => {
            render(<LeagueDashboard />);

            await waitFor(() => {
                expect(screen.getByText('Test League')).toBeInTheDocument();
            });
        });

        it('should display league description', async () => {
            render(<LeagueDashboard />);

            await waitFor(() => {
                expect(screen.getByText('A test league for testing')).toBeInTheDocument();
            });
        });

        it('should display current week', async () => {
            render(<LeagueDashboard />);

            await waitFor(() => {
                expect(screen.getByText(/Week 5/)).toBeInTheDocument();
            });
        });

        it('should display weekly budget', async () => {
            render(<LeagueDashboard />);

            await waitFor(() => {
                expect(screen.getByText(/\$50\/week budget/)).toBeInTheDocument();
            });
        });

        it('should display formatted date range', async () => {
            render(<LeagueDashboard />);

            await waitFor(() => {
                expect(screen.getByText(/Jan 1, 2024/)).toBeInTheDocument();
                expect(screen.getByText(/Mar 31, 2024/)).toBeInTheDocument();
            });
        });
    });

    describe('child components', () => {
        it('should render UserStandingCard', async () => {
            render(<LeagueDashboard />);

            await waitFor(() => {
                expect(screen.getByTestId('user-standing-card')).toBeInTheDocument();
            });
        });

        it('should pass userStats to UserStandingCard', async () => {
            render(<LeagueDashboard />);

            await waitFor(() => {
                expect(screen.getByText('Points: 100')).toBeInTheDocument();
            });
        });

        it('should render LeaderboardSection', async () => {
            render(<LeagueDashboard />);

            await waitFor(() => {
                expect(screen.getByTestId('leaderboard-section')).toBeInTheDocument();
            });
        });

        it('should pass leaderboard data to LeaderboardSection', async () => {
            render(<LeagueDashboard />);

            await waitFor(() => {
                expect(screen.getByText('Players: 2')).toBeInTheDocument();
            });
        });

        it('should render MetagamePreview', async () => {
            render(<LeagueDashboard />);

            await waitFor(() => {
                expect(screen.getByTestId('metagame-preview')).toBeInTheDocument();
            });
        });

        it('should render ParticipantsSection', async () => {
            render(<LeagueDashboard />);

            await waitFor(() => {
                expect(screen.getByTestId('participants-section')).toBeInTheDocument();
            });
        });

        it('should pass participants count to section badge', async () => {
            render(<LeagueDashboard />);

            await waitFor(() => {
                expect(screen.getByText('Participants: 2')).toBeInTheDocument();
            });
        });
    });

    describe('collapsible sections', () => {
        it('should render Leaderboard section', async () => {
            render(<LeagueDashboard />);

            await waitFor(() => {
                expect(screen.getByTestId('collapsible-leaderboard')).toBeInTheDocument();
            });
        });

        it('should render Metagame Insights section', async () => {
            render(<LeagueDashboard />);

            await waitFor(() => {
                expect(screen.getByTestId('collapsible-metagame-insights')).toBeInTheDocument();
            });
        });

        it('should render Participants section', async () => {
            render(<LeagueDashboard />);

            await waitFor(() => {
                expect(screen.getByTestId('collapsible-participants')).toBeInTheDocument();
            });
        });

        it('should display leaderboard count in badge', async () => {
            render(<LeagueDashboard />);

            await waitFor(() => {
                const badges = screen.getAllByTestId('section-badge');
                expect(badges[0]).toHaveTextContent('2');
            });
        });
    });

    describe('metagame lazy loading', () => {
        it('should show loading state for metagame initially', async () => {
            getMetagameAnalysis.mockImplementation(() => new Promise(() => {}));

            render(<LeagueDashboard />);

            await waitFor(() => {
                expect(screen.getByText('Loading metagame...')).toBeInTheDocument();
            });
        });

        it('should display metagame data after loading', async () => {
            render(<LeagueDashboard />);

            await waitFor(() => {
                expect(screen.getByText('Decks: 25')).toBeInTheDocument();
            });
        });

        it('should handle metagame API error silently', async () => {
            const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
            getMetagameAnalysis.mockRejectedValue(new Error('Metagame API Error'));

            render(<LeagueDashboard />);

            await waitFor(() => {
                // Dashboard should still render without metagame
                expect(screen.getByText('Test League')).toBeInTheDocument();
            });

            consoleSpy.mockRestore();
        });
    });

    describe('user rank in leaderboard', () => {
        it('should set user rank from leaderboard data', async () => {
            render(<LeagueDashboard />);

            await waitFor(() => {
                expect(screen.getByText('Current User: 1')).toBeInTheDocument();
            });
        });
    });

    describe('update commander modal', () => {
        it('should not show modal initially', async () => {
            render(<LeagueDashboard />);

            await waitFor(() => {
                expect(screen.queryByTestId('update-commander-modal')).not.toBeInTheDocument();
            });
        });

        it('should show modal when Update Commander is clicked', async () => {
            render(<LeagueDashboard />);

            await waitFor(() => {
                expect(screen.getByTestId('user-standing-card')).toBeInTheDocument();
            });

            fireEvent.click(screen.getByText('Update Commander'));

            expect(screen.getByTestId('update-commander-modal')).toBeInTheDocument();
        });

        it('should hide modal when Close is clicked', async () => {
            render(<LeagueDashboard />);

            await waitFor(() => {
                expect(screen.getByTestId('user-standing-card')).toBeInTheDocument();
            });

            // Open modal
            fireEvent.click(screen.getByText('Update Commander'));
            expect(screen.getByTestId('update-commander-modal')).toBeInTheDocument();

            // Close modal
            fireEvent.click(screen.getByText('Close'));
            expect(screen.queryByTestId('update-commander-modal')).not.toBeInTheDocument();
        });

        it('should refresh user stats when Update is clicked', async () => {
            const updatedStats = { ...mockUserStats, total_points: 150 };
            getUserLeagueStats
                .mockResolvedValueOnce(mockUserStats)
                .mockResolvedValueOnce(updatedStats);

            render(<LeagueDashboard />);

            await waitFor(() => {
                expect(screen.getByTestId('user-standing-card')).toBeInTheDocument();
            });

            // Open modal and update
            fireEvent.click(screen.getByText('Update Commander'));
            fireEvent.click(screen.getByText('Update'));

            await waitFor(() => {
                expect(getUserLeagueStats).toHaveBeenCalledTimes(2);
            });
        });
    });

    describe('budget tracker link', () => {
        it('should render Budget Tracker link', async () => {
            render(<LeagueDashboard />);

            await waitFor(() => {
                const link = screen.getByRole('link', { name: /Budget Tracker/i });
                expect(link).toBeInTheDocument();
                expect(link).toHaveAttribute('href', '/leagues/budget');
            });
        });

        it('should have coins icon', async () => {
            const { container } = render(<LeagueDashboard />);

            await waitFor(() => {
                expect(container.querySelector('.fa-coins')).toBeInTheDocument();
            });
        });
    });

    describe('API error handling', () => {
        it('should handle getLeagueStats error gracefully', async () => {
            getLeagueStats.mockRejectedValue(new Error('Stats error'));

            render(<LeagueDashboard />);

            await waitFor(() => {
                // Should still render with empty leaderboard
                expect(screen.getByText('Players: 0')).toBeInTheDocument();
            });
        });

        it('should handle getLeagueParticipants error gracefully', async () => {
            getLeagueParticipants.mockRejectedValue(new Error('Participants error'));

            render(<LeagueDashboard />);

            await waitFor(() => {
                // Should still render with empty participants
                expect(screen.getByText('Participants: 0')).toBeInTheDocument();
            });
        });
    });

    describe('null league state', () => {
        it('should return null when league is not loaded', async () => {
            getLeagueDetails.mockResolvedValue(null);

            const { container } = render(<LeagueDashboard />);

            await waitFor(() => {
                expect(screen.queryByText('Test League')).not.toBeInTheDocument();
            });
        });
    });

    describe('BETA badge for metagame', () => {
        it('should show BETA badge in metagame section actions', async () => {
            render(<LeagueDashboard />);

            await waitFor(() => {
                const actionsContainer = screen.getAllByTestId('section-actions');
                // Find the one with BETA
                const betaBadge = actionsContainer.find(el => el.textContent.includes('BETA'));
                expect(betaBadge).toBeTruthy();
            });
        });
    });

    describe('responsive layout', () => {
        it('should have container class', async () => {
            const { container } = render(<LeagueDashboard />);

            await waitFor(() => {
                expect(container.querySelector('.container')).toBeInTheDocument();
            });
        });

        it('should have league-dashboard class', async () => {
            const { container } = render(<LeagueDashboard />);

            await waitFor(() => {
                expect(container.querySelector('.league-dashboard')).toBeInTheDocument();
            });
        });

        it('should have dashboard-hero class', async () => {
            const { container } = render(<LeagueDashboard />);

            await waitFor(() => {
                expect(container.querySelector('.dashboard-hero')).toBeInTheDocument();
            });
        });
    });
});
