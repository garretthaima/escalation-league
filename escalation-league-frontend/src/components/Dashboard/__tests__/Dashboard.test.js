import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Dashboard from '../Dashboard';

// Mock all APIs
jest.mock('../../../api/leaguesApi', () => ({
    getLeagueStats: jest.fn()
}));

jest.mock('../../../api/podsApi', () => ({
    getPods: jest.fn(),
    logPodResult: jest.fn()
}));

jest.mock('../../../api/userLeaguesApi', () => ({
    getUserLeagueStats: jest.fn()
}));

// Mock context providers
jest.mock('../../../context/PermissionsProvider', () => ({
    usePermissions: jest.fn()
}));

jest.mock('../../../context/ToastContext', () => ({
    useToast: () => ({
        showToast: jest.fn()
    })
}));

jest.mock('../../../context/WebSocketProvider', () => ({
    useWebSocket: () => ({
        socket: null,
        connected: false,
        joinLeague: jest.fn(),
        leaveLeague: jest.fn()
    })
}));

// Mock child components
jest.mock('../LeagueInfoBanner', () => {
    return function MockLeagueInfoBanner({ league }) {
        return <div data-testid="league-info-banner">{league?.name || 'No league'}</div>;
    };
});

jest.mock('../ActionItemsSection', () => {
    return function MockActionItemsSection({ pendingPods, activePods }) {
        return (
            <div data-testid="action-items-section">
                Pending: {pendingPods?.length || 0}, Active: {activePods?.length || 0}
            </div>
        );
    };
});

jest.mock('../QuickStatsCard', () => {
    return function MockQuickStatsCard({ userStats }) {
        return (
            <div data-testid="quick-stats-card">
                Points: {userStats?.total_points || 0}
            </div>
        );
    };
});

jest.mock('../../Leagues/Dashboard/LeaderboardSection', () => {
    return function MockLeaderboardSection({ leaderboard }) {
        return <div data-testid="leaderboard-section">{leaderboard?.length || 0} players</div>;
    };
});

jest.mock('../../Pods/Dashboard/DeclareResultModal', () => {
    return function MockDeclareResultModal() {
        return null;
    };
});

const { usePermissions } = require('../../../context/PermissionsProvider');
const { getLeagueStats } = require('../../../api/leaguesApi');
const { getPods } = require('../../../api/podsApi');
const { getUserLeagueStats } = require('../../../api/userLeaguesApi');

const renderDashboard = () => {
    return render(
        <BrowserRouter>
            <Dashboard />
        </BrowserRouter>
    );
};

describe('Dashboard', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        jest.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
        console.error.mockRestore();
    });

    describe('loading state', () => {
        it('should show loading spinner while permissions are loading', () => {
            usePermissions.mockReturnValue({
                user: null,
                loading: true,
                activeLeague: null
            });

            renderDashboard();
            expect(screen.getByRole('status')).toBeInTheDocument();
        });

        it('should show loading spinner while fetching data', async () => {
            usePermissions.mockReturnValue({
                user: { id: 1 },
                loading: false,
                activeLeague: { league_id: 1, name: 'Test League' }
            });

            getUserLeagueStats.mockImplementation(() => new Promise(() => {}));
            getLeagueStats.mockImplementation(() => new Promise(() => {}));
            getPods.mockImplementation(() => new Promise(() => {}));

            renderDashboard();
            expect(screen.getByRole('status')).toBeInTheDocument();
        });
    });

    describe('no active league', () => {
        beforeEach(() => {
            usePermissions.mockReturnValue({
                user: { id: 1, firstname: 'John', lastname: 'Doe' },
                loading: false,
                activeLeague: null
            });
        });

        it('should show welcome message when user is not in a league', async () => {
            renderDashboard();
            await waitFor(() => {
                expect(screen.getByText('Welcome to Escalation League!')).toBeInTheDocument();
            });
        });

        it('should show prompt to join a league', async () => {
            renderDashboard();
            await waitFor(() => {
                expect(screen.getByText(/not part of any league yet/i)).toBeInTheDocument();
            });
        });

        it('should show Find a League button', async () => {
            renderDashboard();
            await waitFor(() => {
                expect(screen.getByRole('link', { name: /find a league/i })).toBeInTheDocument();
            });
        });
    });

    describe('with active league', () => {
        const mockActiveLeague = {
            league_id: 1,
            name: 'Test League',
            current_week: 3,
            end_date: '2026-03-01'
        };

        const mockUserStats = {
            total_points: 24,
            league_wins: 6,
            league_losses: 2,
            league_draws: 0,
            elo_rating: 1523
        };

        const mockLeaderboard = [
            { player_id: 1, firstname: 'John', lastname: 'Doe', total_points: 24, rank: 1 },
            { player_id: 2, firstname: 'Jane', lastname: 'Smith', total_points: 20, rank: 2 }
        ];

        beforeEach(() => {
            usePermissions.mockReturnValue({
                user: { id: 1, firstname: 'John', lastname: 'Doe' },
                loading: false,
                activeLeague: mockActiveLeague
            });

            getUserLeagueStats.mockResolvedValue(mockUserStats);
            getLeagueStats.mockResolvedValue({ leaderboard: mockLeaderboard });
            getPods.mockResolvedValue([]);
        });

        it('should render LeagueInfoBanner with league data', async () => {
            renderDashboard();
            await waitFor(() => {
                expect(screen.getByTestId('league-info-banner')).toBeInTheDocument();
            });
        });

        it('should render QuickStatsCard with user stats', async () => {
            renderDashboard();
            await waitFor(() => {
                expect(screen.getByTestId('quick-stats-card')).toBeInTheDocument();
            });
        });

        it('should render LeaderboardSection', async () => {
            renderDashboard();
            await waitFor(() => {
                expect(screen.getByTestId('leaderboard-section')).toBeInTheDocument();
            });
        });

        it('should render ActionItemsSection', async () => {
            renderDashboard();
            await waitFor(() => {
                expect(screen.getByTestId('action-items-section')).toBeInTheDocument();
            });
        });

        it('should fetch user league stats', async () => {
            renderDashboard();
            await waitFor(() => {
                expect(getUserLeagueStats).toHaveBeenCalledWith(1);
            });
        });

        it('should fetch league stats', async () => {
            renderDashboard();
            await waitFor(() => {
                expect(getLeagueStats).toHaveBeenCalledWith(1);
            });
        });

        it('should fetch pods for the league', async () => {
            renderDashboard();
            await waitFor(() => {
                expect(getPods).toHaveBeenCalledWith({ league_id: 1 });
            });
        });
    });

    describe('with pending and active pods', () => {
        const mockActiveLeague = {
            league_id: 1,
            name: 'Test League'
        };

        const mockPods = [
            {
                id: 1,
                confirmation_status: 'pending',
                participants: [
                    { player_id: 1, confirmed: 0 },
                    { player_id: 2, confirmed: 1 }
                ]
            },
            {
                id: 2,
                confirmation_status: 'active',
                participants: [
                    { player_id: 1 },
                    { player_id: 3 }
                ]
            },
            {
                id: 3,
                confirmation_status: 'complete',
                participants: [
                    { player_id: 1 }
                ]
            }
        ];

        beforeEach(() => {
            usePermissions.mockReturnValue({
                user: { id: 1 },
                loading: false,
                activeLeague: mockActiveLeague
            });

            getUserLeagueStats.mockResolvedValue({});
            getLeagueStats.mockResolvedValue({ leaderboard: [] });
            getPods.mockResolvedValue(mockPods);
        });

        it('should filter pods for current user', async () => {
            renderDashboard();
            await waitFor(() => {
                // Should show 1 pending (user hasn't confirmed) and 1 active
                expect(screen.getByText('Pending: 1, Active: 1')).toBeInTheDocument();
            });
        });
    });

    describe('error handling', () => {
        beforeEach(() => {
            usePermissions.mockReturnValue({
                user: { id: 1 },
                loading: false,
                activeLeague: { league_id: 1 }
            });
        });

        it('should handle API failures gracefully and still render', async () => {
            // Dashboard uses graceful degradation - individual API failures are caught
            // and return default values (null/empty arrays) instead of throwing
            getUserLeagueStats.mockRejectedValue(new Error('API Error'));
            getLeagueStats.mockRejectedValue(new Error('API Error'));
            getPods.mockRejectedValue(new Error('API Error'));

            renderDashboard();
            await waitFor(() => {
                // Dashboard should still render with empty/default data
                expect(screen.getByTestId('quick-stats-card')).toBeInTheDocument();
                // ActionItemsSection should still render
                expect(screen.getByTestId('action-items-section')).toBeInTheDocument();
            });
        });

        it('should show empty leaderboard state when API fails', async () => {
            getUserLeagueStats.mockRejectedValue(new Error('API Error'));
            getLeagueStats.mockRejectedValue(new Error('API Error'));
            getPods.mockRejectedValue(new Error('API Error'));

            renderDashboard();
            await waitFor(() => {
                // When leaderboard is empty, Dashboard shows "No standings yet"
                expect(screen.getByText('No standings yet. Play some games!')).toBeInTheDocument();
            });
        });
    });

    describe('API resilience', () => {
        beforeEach(() => {
            usePermissions.mockReturnValue({
                user: { id: 1 },
                loading: false,
                activeLeague: { league_id: 1 }
            });
        });

        it('should handle partial API failures gracefully', async () => {
            getUserLeagueStats.mockResolvedValue({ total_points: 10 });
            getLeagueStats.mockRejectedValue(new Error('Failed')); // This one fails
            getPods.mockResolvedValue([]);

            renderDashboard();
            await waitFor(() => {
                // Should still render with available data
                expect(screen.getByTestId('quick-stats-card')).toBeInTheDocument();
            });
        });
    });
});
