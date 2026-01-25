// Mocks must be BEFORE any imports for ESM compatibility
jest.mock('../../../api/axiosConfig', () => ({
    __esModule: true,
    default: { get: jest.fn(), post: jest.fn(), put: jest.fn(), delete: jest.fn() },
}));

// Mock API modules
jest.mock('../../../api/podsApi', () => ({
    getPods: jest.fn(),
    logPodResult: jest.fn()
}));

jest.mock('../../../api/usersApi', () => ({
    getUserProfile: jest.fn()
}));

// Mock badge helpers
jest.mock('../../../utils/badgeHelpers', () => ({
    getResultBadge: (result) => <span data-testid="result-badge">{result}</span>,
    getConfirmationBadge: (confirmed) => (
        <span data-testid="confirmation-badge">{confirmed ? 'Confirmed' : 'Pending'}</span>
    )
}));

// Mock context
const mockShowToast = jest.fn();
jest.mock('../../../context/ToastContext', () => ({
    useToast: () => ({ showToast: mockShowToast })
}));

const mockSocket = {
    on: jest.fn(),
    off: jest.fn(),
    emit: jest.fn()
};

const mockWebSocketContext = {
    socket: mockSocket,
    connected: true,
    joinLeague: jest.fn(),
    leaveLeague: jest.fn()
};

jest.mock('../../../context/WebSocketProvider', () => ({
    useWebSocket: () => mockWebSocketContext
}));

const mockPermissionsContext = {
    permissions: []
};

jest.mock('../../../context/PermissionsProvider', () => ({
    usePermissions: () => mockPermissionsContext
}));

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ConfirmGamesTab from '../ConfirmGamesPage';

// Import mocked modules
import { getPods, logPodResult } from '../../../api/podsApi';
import { getUserProfile } from '../../../api/usersApi';

describe('ConfirmGamesTab', () => {
    const mockUser = { id: 1, firstname: 'John', lastname: 'Doe' };

    const mockPendingGames = [
        {
            id: 1,
            league_id: 1,
            participants: [
                { player_id: 1, firstname: 'John', lastname: 'Doe', result: 'win', confirmed: 0 },
                { player_id: 2, firstname: 'Jane', lastname: 'Smith', result: 'loss', confirmed: 1 },
                { player_id: 3, firstname: 'Bob', lastname: 'Wilson', result: 'loss', confirmed: 0 }
            ]
        },
        {
            id: 2,
            league_id: 1,
            participants: [
                { player_id: 1, firstname: 'John', lastname: 'Doe', result: 'loss', confirmed: 1 },
                { player_id: 4, firstname: 'Alice', lastname: 'Johnson', result: 'win', confirmed: 0 }
            ]
        }
    ];

    beforeEach(() => {
        jest.clearAllMocks();
        mockPermissionsContext.permissions = [];

        getUserProfile.mockResolvedValue({ user: mockUser });
        getPods.mockResolvedValue(mockPendingGames);
    });

    describe('initial rendering', () => {
        it('should render pending games', async () => {
            render(<ConfirmGamesTab />);

            await waitFor(() => {
                expect(screen.getByText(/Pod #1/)).toBeInTheDocument();
                expect(screen.getByText(/Pod #2/)).toBeInTheDocument();
            });
        });

        it('should display "Pending Confirmation" in card header', async () => {
            render(<ConfirmGamesTab />);

            await waitFor(() => {
                const headers = screen.getAllByText(/Pending Confirmation/);
                expect(headers.length).toBe(2);
            });
        });

        it('should show participants in table format', async () => {
            render(<ConfirmGamesTab />);

            await waitFor(() => {
                // Names appear in multiple pods, use getAllByText
                expect(screen.getAllByText(/John Doe/).length).toBeGreaterThan(0);
                expect(screen.getAllByText(/Jane Smith/).length).toBeGreaterThan(0);
                expect(screen.getAllByText(/Bob Wilson/).length).toBeGreaterThan(0);
            });
        });

        it('should show column headers', async () => {
            render(<ConfirmGamesTab />);

            await waitFor(() => {
                expect(screen.getAllByRole('columnheader', { name: /Player/i }).length).toBeGreaterThan(0);
                expect(screen.getAllByRole('columnheader', { name: /Result/i }).length).toBeGreaterThan(0);
                expect(screen.getAllByRole('columnheader', { name: /Status/i }).length).toBeGreaterThan(0);
            });
        });
    });

    describe('error handling', () => {
        it('should display error message when fetching games fails', async () => {
            getPods.mockRejectedValue(new Error('Network error'));
            render(<ConfirmGamesTab />);

            await waitFor(() => {
                expect(screen.getByText('Failed to fetch games waiting confirmation.')).toBeInTheDocument();
            });
        });
    });

    describe('empty state', () => {
        it('should show empty message when no pending games', async () => {
            getPods.mockResolvedValue([]);
            render(<ConfirmGamesTab />);

            await waitFor(() => {
                expect(screen.getByText(/No games waiting for confirmation/i)).toBeInTheDocument();
            });
        });
    });

    describe('badge display', () => {
        it('should render result badges for participants', async () => {
            render(<ConfirmGamesTab />);

            await waitFor(() => {
                const resultBadges = screen.getAllByTestId('result-badge');
                expect(resultBadges.length).toBeGreaterThan(0);
            });
        });

        it('should render confirmation badges for participants', async () => {
            render(<ConfirmGamesTab />);

            await waitFor(() => {
                const confirmationBadges = screen.getAllByTestId('confirmation-badge');
                expect(confirmationBadges.length).toBeGreaterThan(0);
            });
        });

        it('should show "You" badge for current user', async () => {
            render(<ConfirmGamesTab />);

            await waitFor(() => {
                const youBadges = screen.getAllByText('You');
                expect(youBadges.length).toBeGreaterThan(0);
            });
        });
    });

    describe('confirm button', () => {
        it('should show confirm button for user who has not confirmed', async () => {
            render(<ConfirmGamesTab />);

            await waitFor(() => {
                const confirmButtons = screen.getAllByRole('button', { name: /Confirm Game Results/i });
                expect(confirmButtons.length).toBe(1); // Only one game where user hasn't confirmed
            });
        });

        it('should not show confirm button for user who has already confirmed', async () => {
            // In mockPendingGames[1], user (id: 1) has confirmed: 1
            render(<ConfirmGamesTab />);

            await waitFor(() => {
                // Should only have one confirm button (for game 1, not game 2)
                const confirmButtons = screen.getAllByRole('button', { name: /Confirm Game Results/i });
                expect(confirmButtons.length).toBe(1);
            });
        });

        it('should call logPodResult when confirm button is clicked', async () => {
            logPodResult.mockResolvedValue({});
            render(<ConfirmGamesTab />);

            await waitFor(() => {
                expect(screen.getByRole('button', { name: /Confirm Game Results/i })).toBeInTheDocument();
            });

            fireEvent.click(screen.getByRole('button', { name: /Confirm Game Results/i }));

            await waitFor(() => {
                expect(logPodResult).toHaveBeenCalledWith(1, {});
                expect(mockShowToast).toHaveBeenCalledWith('Game successfully confirmed!', 'success');
            });
        });

        it('should show error toast when confirmation fails', async () => {
            logPodResult.mockRejectedValue(new Error('Network error'));
            render(<ConfirmGamesTab />);

            await waitFor(() => {
                expect(screen.getByRole('button', { name: /Confirm Game Results/i })).toBeInTheDocument();
            });

            fireEvent.click(screen.getByRole('button', { name: /Confirm Game Results/i }));

            await waitFor(() => {
                expect(mockShowToast).toHaveBeenCalledWith('Failed to confirm game.', 'error');
            });
        });
    });

    describe('participant styling', () => {
        it('should apply table-success class to winner row', async () => {
            const { container } = render(<ConfirmGamesTab />);

            await waitFor(() => {
                const successRows = container.querySelectorAll('.table-success');
                expect(successRows.length).toBeGreaterThan(0);
            });
        });

        it('should apply table-secondary class to confirmed/draw participants', async () => {
            const { container } = render(<ConfirmGamesTab />);

            await waitFor(() => {
                const secondaryRows = container.querySelectorAll('.table-secondary');
                expect(secondaryRows.length).toBeGreaterThan(0);
            });
        });
    });

    describe('WebSocket integration', () => {
        it('should join league room when connected', async () => {
            render(<ConfirmGamesTab />);

            await waitFor(() => {
                expect(mockWebSocketContext.joinLeague).toHaveBeenCalledWith(1);
            });
        });

        it('should register pod:confirmed event listener', async () => {
            render(<ConfirmGamesTab />);

            await waitFor(() => {
                expect(mockSocket.on).toHaveBeenCalledWith('pod:confirmed', expect.any(Function));
            });
        });

        it('should cleanup socket listeners on unmount', async () => {
            const { unmount } = render(<ConfirmGamesTab />);

            await waitFor(() => {
                expect(mockSocket.on).toHaveBeenCalled();
            });

            unmount();

            expect(mockSocket.off).toHaveBeenCalledWith('pod:confirmed');
            expect(mockWebSocketContext.leaveLeague).toHaveBeenCalledWith(1);
        });

        it('should handle pod:confirmed event - update confirmation status', async () => {
            render(<ConfirmGamesTab />);

            await waitFor(() => {
                expect(mockSocket.on).toHaveBeenCalledWith('pod:confirmed', expect.any(Function));
            });

            // Get the callback registered for pod:confirmed
            const onConfirmedCall = mockSocket.on.mock.calls.find(call => call[0] === 'pod:confirmed');
            const onConfirmedCallback = onConfirmedCall[1];

            // Simulate another player confirming
            onConfirmedCallback({ podId: 1, playerId: 3, isComplete: false });

            await waitFor(() => {
                expect(mockShowToast).toHaveBeenCalledWith('A player confirmed the game result', 'info');
            });
        });

        it('should handle pod:confirmed event - game complete', async () => {
            render(<ConfirmGamesTab />);

            await waitFor(() => {
                expect(mockSocket.on).toHaveBeenCalledWith('pod:confirmed', expect.any(Function));
            });

            // Get the callback
            const onConfirmedCall = mockSocket.on.mock.calls.find(call => call[0] === 'pod:confirmed');
            const onConfirmedCallback = onConfirmedCall[1];

            // Simulate game completion
            onConfirmedCallback({ podId: 1, playerId: 3, isComplete: true });

            await waitFor(() => {
                expect(mockShowToast).toHaveBeenCalledWith('Game fully confirmed and completed!', 'success');
            });
        });
    });

    describe('admin view', () => {
        it('should show all pending games for admin users', async () => {
            mockPermissionsContext.permissions = [{ name: 'admin_pod_update' }];

            const adminPendingGames = [
                {
                    id: 3,
                    league_id: 1,
                    participants: [
                        { player_id: 5, firstname: 'Other', lastname: 'User', result: 'win', confirmed: 0 },
                        { player_id: 6, firstname: 'Another', lastname: 'User', result: 'loss', confirmed: 0 }
                    ]
                }
            ];

            getPods.mockResolvedValue(adminPendingGames);
            render(<ConfirmGamesTab />);

            await waitFor(() => {
                expect(screen.getByText(/Pod #3/)).toBeInTheDocument();
            });
        });
    });

    describe('defensive array handling', () => {
        it('should handle undefined games array', async () => {
            getPods.mockResolvedValue(undefined);
            render(<ConfirmGamesTab />);

            await waitFor(() => {
                expect(screen.getByText(/No games waiting for confirmation/i)).toBeInTheDocument();
            });
        });

        it('should handle null participants array gracefully', async () => {
            getPods.mockResolvedValue([
                { id: 1, league_id: 1, participants: null }
            ]);

            render(<ConfirmGamesTab />);

            await waitFor(() => {
                // Pods with null participants are filtered out for non-admin, so no games shown
                expect(screen.getByText(/No games waiting for confirmation/i)).toBeInTheDocument();
            });
        });

        it('should handle empty participants array gracefully', async () => {
            getPods.mockResolvedValue([
                { id: 1, league_id: 1, participants: [] }
            ]);

            render(<ConfirmGamesTab />);

            await waitFor(() => {
                // Pods with empty participants are filtered out for non-admin, so no games shown
                expect(screen.getByText(/No games waiting for confirmation/i)).toBeInTheDocument();
            });
        });
    });

    describe('draw game handling', () => {
        it('should apply secondary styling to draw participants', async () => {
            getPods.mockResolvedValue([
                {
                    id: 1,
                    league_id: 1,
                    participants: [
                        { player_id: 1, firstname: 'John', lastname: 'Doe', result: 'draw', confirmed: 0 },
                        { player_id: 2, firstname: 'Jane', lastname: 'Smith', result: 'draw', confirmed: 0 }
                    ]
                }
            ]);

            const { container } = render(<ConfirmGamesTab />);

            await waitFor(() => {
                const secondaryRows = container.querySelectorAll('.table-secondary');
                expect(secondaryRows.length).toBeGreaterThan(0);
            });
        });
    });

    describe('no websocket connection', () => {
        it('should not join league when socket is not connected', async () => {
            mockWebSocketContext.connected = false;
            render(<ConfirmGamesTab />);

            await waitFor(() => {
                expect(screen.getByText(/Pod #1/)).toBeInTheDocument();
            });

            // Should not call joinLeague when not connected
            expect(mockWebSocketContext.joinLeague).not.toHaveBeenCalled();
        });
    });
});
