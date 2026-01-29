import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Profile from '../Profile';

// Mock react-router-dom
const mockNavigate = jest.fn();
const mockSetSearchParams = jest.fn();
let mockSearchParams = new URLSearchParams();

jest.mock('react-router-dom', () => ({
    Link: ({ children, to }) => <a href={to}>{children}</a>,
    NavLink: ({ children, to }) => <a href={to}>{children}</a>,
    useNavigate: () => mockNavigate,
    useLocation: () => ({ pathname: '/', search: '', state: null }),
    useParams: () => ({}),
    useSearchParams: () => [mockSearchParams, mockSetSearchParams],
    MemoryRouter: ({ children }) => <>{children}</>,
}));

// Mock API calls
jest.mock('../../../../api/usersApi', () => ({
    getUserProfile: jest.fn(),
    updateUserProfile: jest.fn()
}));

// Mock context
const mockPermissionsContext = {
    permissions: [],
    user: null,
    darkMode: false,
    toggleDarkMode: jest.fn(),
    activeLeague: null,
    loading: false
};

jest.mock('../../../../context/PermissionsProvider', () => ({
    usePermissions: () => mockPermissionsContext
}));

// Mock child components
jest.mock('../OverviewTab', () => {
    return function MockOverviewTab({ user, currentLeague }) {
        return (
            <div data-testid="overview-tab">
                Overview Tab - User: {user?.firstname}
                {currentLeague && <span> - League: {currentLeague.name}</span>}
            </div>
        );
    };
});

jest.mock('../StatisticsTab', () => {
    return function MockStatisticsTab({ user, currentLeague }) {
        return <div data-testid="statistics-tab">Statistics Tab</div>;
    };
});

jest.mock('../LeagueTab', () => {
    return function MockLeagueTab({ currentLeague, onCommanderUpdated }) {
        return <div data-testid="league-tab">League Tab</div>;
    };
});

jest.mock('../ActivityTab', () => {
    return function MockActivityTab() {
        return <div data-testid="activity-tab">Activity Tab</div>;
    };
});

jest.mock('../SettingsTab', () => {
    return function MockSettingsTab({ user, handlePictureUpdate }) {
        return (
            <div data-testid="settings-tab">
                Settings Tab
                <button onClick={() => handlePictureUpdate('/new-picture.png')}>
                    Update Picture
                </button>
            </div>
        );
    };
});

jest.mock('../../../Shared/LoadingSpinner', () => {
    return function MockLoadingSpinner({ size }) {
        return <div data-testid="loading-spinner" data-size={size}>Loading...</div>;
    };
});

const { getUserProfile, updateUserProfile } = require('../../../../api/usersApi');

describe('Profile', () => {
    const mockUser = {
        id: 1,
        firstname: 'John',
        lastname: 'Doe',
        email: 'john@example.com',
        picture: '/images/profile-pictures/avatar1.png',
        wins: 10,
        losses: 5,
        draws: 2,
        elo_rank: 5,
        elo_rating: 1650,
        google_id: 'google123'
    };

    const mockCurrentLeague = {
        league_id: 1,
        name: 'Test League',
        is_active: true,
        league_wins: 5,
        league_losses: 2
    };

    beforeEach(() => {
        jest.clearAllMocks();
        mockSearchParams = new URLSearchParams();
        mockPermissionsContext.activeLeague = null;
        getUserProfile.mockResolvedValue({
            user: mockUser,
            currentLeague: mockCurrentLeague
        });
    });

    describe('loading state', () => {
        it('should show loading spinner while fetching profile', async () => {
            getUserProfile.mockImplementation(() => new Promise(() => {})); // Never resolves

            render(<Profile />);

            expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
            expect(screen.getByTestId('loading-spinner')).toHaveAttribute('data-size', 'lg');
        });
    });

    describe('error state', () => {
        it('should show error message when profile fetch fails', async () => {
            getUserProfile.mockRejectedValue(new Error('Network error'));

            render(<Profile />);

            await waitFor(() => {
                expect(screen.getByText('Failed to load profile.')).toBeInTheDocument();
            });
        });

        it('should not show error for 401 responses (handled by interceptor)', async () => {
            getUserProfile.mockRejectedValue({
                response: { status: 401 }
            });

            render(<Profile />);

            await waitFor(() => {
                // Should show "Unable to load profile data" instead of error
                expect(screen.getByText('Unable to load profile data.')).toBeInTheDocument();
            });
        });
    });

    describe('no user state', () => {
        it('should show warning when user data is not available', async () => {
            getUserProfile.mockResolvedValue({
                user: null,
                currentLeague: null
            });

            render(<Profile />);

            await waitFor(() => {
                expect(screen.getByText('Unable to load profile data.')).toBeInTheDocument();
            });
        });
    });

    describe('successful profile load', () => {
        it('should display user profile picture', async () => {
            render(<Profile />);

            await waitFor(() => {
                const profileImage = screen.getByAltText('Profile');
                expect(profileImage).toBeInTheDocument();
                expect(profileImage).toHaveAttribute('src', mockUser.picture);
            });
        });

        it('should display user name', async () => {
            render(<Profile />);

            await waitFor(() => {
                expect(screen.getByText('John Doe')).toBeInTheDocument();
            });
        });

        it('should display user email', async () => {
            render(<Profile />);

            await waitFor(() => {
                expect(screen.getByText('john@example.com')).toBeInTheDocument();
            });
        });

        it('should display Google badge when user has google_id', async () => {
            render(<Profile />);

            await waitFor(() => {
                expect(screen.getByText('Google')).toBeInTheDocument();
            });
        });

        it('should display active league badge when activeLeague exists', async () => {
            mockPermissionsContext.activeLeague = { name: 'Active League' };

            render(<Profile />);

            await waitFor(() => {
                expect(screen.getByText('Active League')).toBeInTheDocument();
            });
        });

        it('should display global stats correctly', async () => {
            render(<Profile />);

            await waitFor(() => {
                expect(screen.getByText('17')).toBeInTheDocument(); // gamesPlayed: 10+5+2
                expect(screen.getByText('10')).toBeInTheDocument(); // wins
                expect(screen.getByText('59%')).toBeInTheDocument(); // winRate
                expect(screen.getByText('#5')).toBeInTheDocument(); // elo rank
            });
        });

        it('should show dash for ELO rank when not available', async () => {
            getUserProfile.mockResolvedValue({
                user: { ...mockUser, elo_rank: null },
                currentLeague: mockCurrentLeague
            });

            render(<Profile />);

            await waitFor(() => {
                // Find the ELO Rank stat value
                const eloRankValues = screen.getAllByText('\u2014'); // em-dash
                expect(eloRankValues.length).toBeGreaterThan(0);
            });
        });

        it('should display default profile picture when picture is null', async () => {
            getUserProfile.mockResolvedValue({
                user: { ...mockUser, picture: null },
                currentLeague: mockCurrentLeague
            });

            render(<Profile />);

            await waitFor(() => {
                const profileImage = screen.getByAltText('Profile');
                expect(profileImage).toHaveAttribute('src', '/images/profile-pictures/avatar1.png');
            });
        });

        it('should use external URL directly for profile picture', async () => {
            getUserProfile.mockResolvedValue({
                user: { ...mockUser, picture: 'https://example.com/avatar.jpg' },
                currentLeague: mockCurrentLeague
            });

            render(<Profile />);

            await waitFor(() => {
                const profileImage = screen.getByAltText('Profile');
                expect(profileImage).toHaveAttribute('src', 'https://example.com/avatar.jpg');
            });
        });
    });

    describe('tab navigation', () => {
        it('should render all tab buttons', async () => {
            render(<Profile />);

            await waitFor(() => {
                expect(screen.getByText('Overview')).toBeInTheDocument();
                expect(screen.getByText('Stats')).toBeInTheDocument();
                expect(screen.getByText('League')).toBeInTheDocument();
                expect(screen.getByText('Activity')).toBeInTheDocument();
                expect(screen.getByText('Settings')).toBeInTheDocument();
            });
        });

        it('should show overview tab by default', async () => {
            render(<Profile />);

            await waitFor(() => {
                expect(screen.getByTestId('overview-tab')).toBeInTheDocument();
            });
        });

        it('should switch to statistics tab when clicked', async () => {
            render(<Profile />);

            await waitFor(() => {
                expect(screen.getByTestId('overview-tab')).toBeInTheDocument();
            });

            fireEvent.click(screen.getByText('Stats'));

            expect(mockSetSearchParams).toHaveBeenCalledWith({ tab: 'statistics' });
        });

        it('should switch to league tab when clicked', async () => {
            render(<Profile />);

            await waitFor(() => {
                expect(screen.getByTestId('overview-tab')).toBeInTheDocument();
            });

            fireEvent.click(screen.getByText('League'));

            expect(mockSetSearchParams).toHaveBeenCalledWith({ tab: 'league' });
        });

        it('should switch to activity tab when clicked', async () => {
            render(<Profile />);

            await waitFor(() => {
                expect(screen.getByTestId('overview-tab')).toBeInTheDocument();
            });

            fireEvent.click(screen.getByText('Activity'));

            expect(mockSetSearchParams).toHaveBeenCalledWith({ tab: 'activity' });
        });

        it('should switch to settings tab when clicked', async () => {
            render(<Profile />);

            await waitFor(() => {
                expect(screen.getByTestId('overview-tab')).toBeInTheDocument();
            });

            fireEvent.click(screen.getByText('Settings'));

            expect(mockSetSearchParams).toHaveBeenCalledWith({ tab: 'settings' });
        });

        it('should show correct tab based on URL parameter', async () => {
            mockSearchParams = new URLSearchParams('tab=statistics');

            render(<Profile />);

            await waitFor(() => {
                expect(screen.getByTestId('statistics-tab')).toBeInTheDocument();
            });
        });

        it('should show league tab based on URL parameter', async () => {
            mockSearchParams = new URLSearchParams('tab=league');

            render(<Profile />);

            await waitFor(() => {
                expect(screen.getByTestId('league-tab')).toBeInTheDocument();
            });
        });

        it('should show activity tab based on URL parameter', async () => {
            mockSearchParams = new URLSearchParams('tab=activity');

            render(<Profile />);

            await waitFor(() => {
                expect(screen.getByTestId('activity-tab')).toBeInTheDocument();
            });
        });

        it('should show settings tab based on URL parameter', async () => {
            mockSearchParams = new URLSearchParams('tab=settings');

            render(<Profile />);

            await waitFor(() => {
                expect(screen.getByTestId('settings-tab')).toBeInTheDocument();
            });
        });

        it('should default to overview for invalid tab parameter', async () => {
            mockSearchParams = new URLSearchParams('tab=invalid');

            render(<Profile />);

            await waitFor(() => {
                expect(screen.getByTestId('overview-tab')).toBeInTheDocument();
            });
        });
    });

    describe('profile picture update', () => {
        it('should call updateUserProfile when picture is updated', async () => {
            mockSearchParams = new URLSearchParams('tab=settings');
            updateUserProfile.mockResolvedValue({});

            render(<Profile />);

            await waitFor(() => {
                expect(screen.getByTestId('settings-tab')).toBeInTheDocument();
            });

            fireEvent.click(screen.getByText('Update Picture'));

            await waitFor(() => {
                expect(updateUserProfile).toHaveBeenCalledWith({ picture: '/new-picture.png' });
            });
        });

        it('should show error when picture update fails', async () => {
            mockSearchParams = new URLSearchParams('tab=settings');
            updateUserProfile.mockRejectedValue(new Error('Update failed'));

            render(<Profile />);

            await waitFor(() => {
                expect(screen.getByTestId('settings-tab')).toBeInTheDocument();
            });

            fireEvent.click(screen.getByText('Update Picture'));

            await waitFor(() => {
                expect(screen.getByText('Failed to update profile picture.')).toBeInTheDocument();
            });
        });
    });

    describe('active tab styling', () => {
        it('should mark overview tab as active by default', async () => {
            render(<Profile />);

            await waitFor(() => {
                const overviewButton = screen.getByText('Overview').closest('button');
                expect(overviewButton).toHaveClass('active');
            });
        });

        it('should mark statistics tab as active when selected via URL', async () => {
            mockSearchParams = new URLSearchParams('tab=statistics');

            render(<Profile />);

            await waitFor(() => {
                const statsButton = screen.getByText('Stats').closest('button');
                expect(statsButton).toHaveClass('active');
            });
        });
    });

    describe('user display edge cases', () => {
        it('should display "User" when firstname is not set', async () => {
            getUserProfile.mockResolvedValue({
                user: { ...mockUser, firstname: null, lastname: null },
                currentLeague: mockCurrentLeague
            });

            render(<Profile />);

            await waitFor(() => {
                expect(screen.getByText('User')).toBeInTheDocument();
            });
        });

        it('should handle zero games correctly', async () => {
            getUserProfile.mockResolvedValue({
                user: { ...mockUser, wins: 0, losses: 0, draws: 0 },
                currentLeague: mockCurrentLeague
            });

            render(<Profile />);

            await waitFor(() => {
                expect(screen.getByText('0%')).toBeInTheDocument(); // 0 win rate
            });
        });
    });
});
