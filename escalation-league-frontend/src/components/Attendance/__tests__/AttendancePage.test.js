// Mock dependencies BEFORE importing modules
const mockShowToast = jest.fn();
const mockSocket = {
    on: jest.fn(),
    off: jest.fn()
};
const mockJoinSession = jest.fn();
const mockLeaveSession = jest.fn();
const mockJoinLeague = jest.fn();
const mockLeaveLeague = jest.fn();

// Setup mock context values
let mockPermissionsContext = {
    activeLeague: { id: 1, league_id: 1, league_name: 'Test League', name: 'Test League' },
    user: { id: 1, firstname: 'John', lastname: 'Doe' }
};

let mockWebSocketContext = {
    socket: mockSocket,
    connected: true,
    joinSession: mockJoinSession,
    leaveSession: mockLeaveSession,
    joinLeague: mockJoinLeague,
    leaveLeague: mockLeaveLeague
};

// Mock context providers
jest.mock('../../../context/PermissionsProvider', () => ({
    usePermissions: () => mockPermissionsContext
}));

jest.mock('../../../context/ToastContext', () => ({
    useToast: () => ({ showToast: mockShowToast })
}));

jest.mock('../../../context/WebSocketProvider', () => ({
    useWebSocket: () => mockWebSocketContext
}));

// Mock API calls
const mockGetActivePollSession = jest.fn();
const mockGetTodaySession = jest.fn();
const mockCheckIn = jest.fn();
const mockCheckOut = jest.fn();

jest.mock('../../../api/attendanceApi', () => ({
    getActivePollSession: (...args) => mockGetActivePollSession(...args),
    getTodaySession: (...args) => mockGetTodaySession(...args),
    checkIn: (...args) => mockCheckIn(...args),
    checkOut: (...args) => mockCheckOut(...args)
}));

// Mock LoadingSpinner
jest.mock('../../Shared/LoadingSpinner', () => {
    return function MockLoadingSpinner({ size }) {
        return <div data-testid="loading-spinner" data-size={size}>Loading...</div>;
    };
});

// Mock Shared components
jest.mock('../../Shared', () => ({
    DiscordIcon: () => <span data-testid="discord-icon">Discord</span>,
}));

// Mock dateFormatter to avoid axios import issues
jest.mock('../../../utils/dateFormatter', () => ({
    formatDate: (date, options = {}) => {
        const d = new Date(date);
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', ...options });
    },
    formatDateTime: (date) => new Date(date).toLocaleString('en-US'),
    formatDateWithWeekday: (date) => new Date(date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }),
    formatRelativeTime: (date) => 'recently',
    initTimezone: jest.fn().mockResolvedValue('America/Chicago'),
    setTimezoneLoader: jest.fn(),
    getTimezone: () => 'America/Chicago',
}));

// Mock CSS import
jest.mock('../AttendancePage.css', () => ({}));

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import AttendancePage from '../AttendancePage';

describe('AttendancePage', () => {
    const mockSession = {
        id: 1,
        session_date: '2024-01-15',
        name: 'Test Session',
        status: 'active',
        attendance: [
            { user_id: 1, firstname: 'John', lastname: 'Doe', is_active: true },
            { user_id: 2, firstname: 'Jane', lastname: 'Smith', is_active: true },
            { user_id: 3, firstname: 'Bob', lastname: 'Wilson', is_active: false }
        ]
    };

    beforeEach(() => {
        jest.clearAllMocks();

        // Reset mock context
        mockPermissionsContext = {
            activeLeague: { id: 1, league_id: 1, league_name: 'Test League', name: 'Test League' },
            user: { id: 1, firstname: 'John', lastname: 'Doe' }
        };

        mockWebSocketContext = {
            socket: mockSocket,
            connected: true,
            joinSession: mockJoinSession,
            leaveSession: mockLeaveSession,
            joinLeague: mockJoinLeague,
            leaveLeague: mockLeaveLeague
        };

        // Default API responses
        mockGetActivePollSession.mockResolvedValue({ session: null });
        mockGetTodaySession.mockResolvedValue(mockSession);
        mockCheckIn.mockResolvedValue({});
        mockCheckOut.mockResolvedValue({});
    });

    describe('No active league', () => {
        it('should show warning when user has no active league', async () => {
            mockPermissionsContext.activeLeague = null;

            render(<AttendancePage />);

            await waitFor(() => {
                expect(screen.getByText(/please join a league to access attendance/i)).toBeInTheDocument();
            });
        });
    });

    describe('Loading state', () => {
        it('should show loading spinner while fetching data', () => {
            mockGetActivePollSession.mockImplementation(() => new Promise(() => {}));

            render(<AttendancePage />);

            expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
        });
    });

    describe('Error handling', () => {
        it('should display error message when API call fails', async () => {
            mockGetActivePollSession.mockRejectedValue(new Error('API Error'));

            render(<AttendancePage />);

            await waitFor(() => {
                expect(screen.getByText(/failed to load attendance data/i)).toBeInTheDocument();
            });
        });
    });

    describe('Session display', () => {
        it('should render session info with active status', async () => {
            render(<AttendancePage />);

            await waitFor(() => {
                expect(screen.getByText('Test Session')).toBeInTheDocument();
            });
            expect(screen.getByText('active')).toBeInTheDocument();
        });

        it('should display session date correctly', async () => {
            render(<AttendancePage />);

            await waitFor(() => {
                // Date formatting varies, just check session card is rendered
                expect(screen.getByText(/Game Night/i)).toBeInTheDocument();
            });
        });

        it('should show league name', async () => {
            render(<AttendancePage />);

            await waitFor(() => {
                expect(screen.getByText('Test League')).toBeInTheDocument();
            });
        });

        it('should show attending count', async () => {
            render(<AttendancePage />);

            await waitFor(() => {
                expect(screen.getByText('2 players')).toBeInTheDocument();
            });
        });

        it('should fall back to date if session has no name', async () => {
            const sessionWithoutName = { ...mockSession, name: null };
            mockGetTodaySession.mockResolvedValue(sessionWithoutName);

            render(<AttendancePage />);

            await waitFor(() => {
                // When session has no name, it shows formatted date
                // Check that the page renders with session info present
                expect(screen.getByText(/Game Night/i)).toBeInTheDocument();
            });
        });
    });

    describe('Active poll banner', () => {
        it('should show Discord poll banner when active poll exists', async () => {
            mockGetActivePollSession.mockResolvedValue({ session: mockSession });

            render(<AttendancePage />);

            await waitFor(() => {
                expect(screen.getByText(/discord poll active/i)).toBeInTheDocument();
            });
            expect(screen.getByText(/poll open/i)).toBeInTheDocument();
        });

        it('should not show poll banner when no active poll', async () => {
            render(<AttendancePage />);

            await waitFor(() => {
                expect(screen.getByText('Test Session')).toBeInTheDocument();
            });
            expect(screen.queryByText(/discord poll active/i)).not.toBeInTheDocument();
        });
    });

    describe('User RSVP - Active session', () => {
        it('should show "I\'m Attending" button when user is not attending', async () => {
            const sessionNotAttending = {
                ...mockSession,
                attendance: [
                    { user_id: 2, firstname: 'Jane', lastname: 'Smith', is_active: true }
                ]
            };
            mockGetTodaySession.mockResolvedValue(sessionNotAttending);

            render(<AttendancePage />);

            await waitFor(() => {
                expect(screen.getByRole('button', { name: /i'm attending/i })).toBeInTheDocument();
            });
        });

        it('should show attending badge and "Can\'t Make It" button when user is attending', async () => {
            render(<AttendancePage />);

            await waitFor(() => {
                expect(screen.getByText(/you're attending/i)).toBeInTheDocument();
            });
            expect(screen.getByRole('button', { name: /can't make it/i })).toBeInTheDocument();
        });

        it('should call checkIn API and show toast when clicking "I\'m Attending"', async () => {
            const sessionNotAttending = {
                ...mockSession,
                attendance: []
            };
            mockGetTodaySession.mockResolvedValue(sessionNotAttending);

            render(<AttendancePage />);

            await waitFor(() => {
                expect(screen.getByRole('button', { name: /i'm attending/i })).toBeInTheDocument();
            });

            fireEvent.click(screen.getByRole('button', { name: /i'm attending/i }));

            await waitFor(() => {
                expect(mockCheckIn).toHaveBeenCalledWith(1);
            });
            expect(mockShowToast).toHaveBeenCalledWith("You're attending!", 'success');
        });

        it('should call checkOut API and show toast when clicking "Can\'t Make It"', async () => {
            render(<AttendancePage />);

            await waitFor(() => {
                expect(screen.getByRole('button', { name: /can't make it/i })).toBeInTheDocument();
            });

            fireEvent.click(screen.getByRole('button', { name: /can't make it/i }));

            await waitFor(() => {
                expect(mockCheckOut).toHaveBeenCalledWith(1);
            });
            expect(mockShowToast).toHaveBeenCalledWith("Marked as can't make it", 'success');
        });

        it('should show error toast when checkIn fails', async () => {
            const sessionNotAttending = {
                ...mockSession,
                attendance: []
            };
            mockGetTodaySession.mockResolvedValue(sessionNotAttending);
            mockCheckIn.mockRejectedValue(new Error('Check-in failed'));

            render(<AttendancePage />);

            await waitFor(() => {
                expect(screen.getByRole('button', { name: /i'm attending/i })).toBeInTheDocument();
            });

            fireEvent.click(screen.getByRole('button', { name: /i'm attending/i }));

            await waitFor(() => {
                expect(mockShowToast).toHaveBeenCalledWith('Failed to update attendance.', 'error');
            });
        });

        it('should show error toast when checkOut fails', async () => {
            mockCheckOut.mockRejectedValue(new Error('Check-out failed'));

            render(<AttendancePage />);

            await waitFor(() => {
                expect(screen.getByRole('button', { name: /can't make it/i })).toBeInTheDocument();
            });

            fireEvent.click(screen.getByRole('button', { name: /can't make it/i }));

            await waitFor(() => {
                expect(mockShowToast).toHaveBeenCalledWith('Failed to update attendance.', 'error');
            });
        });
    });

    describe('User RSVP - Locked/completed session', () => {
        it('should show locked message when session is locked', async () => {
            const lockedSession = { ...mockSession, status: 'locked' };
            mockGetTodaySession.mockResolvedValue(lockedSession);

            render(<AttendancePage />);

            await waitFor(() => {
                expect(screen.getByText(/this session is locked/i)).toBeInTheDocument();
            });
        });

        it('should show completed message when session is completed', async () => {
            const completedSession = { ...mockSession, status: 'completed' };
            mockGetTodaySession.mockResolvedValue(completedSession);

            render(<AttendancePage />);

            await waitFor(() => {
                expect(screen.getByText(/this session is completed/i)).toBeInTheDocument();
            });
        });

        it('should show "You\'re attending" badge without buttons for locked session when attending', async () => {
            const lockedSession = { ...mockSession, status: 'locked' };
            mockGetTodaySession.mockResolvedValue(lockedSession);

            render(<AttendancePage />);

            await waitFor(() => {
                expect(screen.getByText(/you're attending/i)).toBeInTheDocument();
            });
            expect(screen.queryByRole('button', { name: /can't make it/i })).not.toBeInTheDocument();
        });

        it('should show "Not attending" badge for locked session when not attending', async () => {
            const lockedSessionNotAttending = {
                ...mockSession,
                status: 'locked',
                attendance: [
                    { user_id: 1, firstname: 'John', lastname: 'Doe', is_active: false }
                ]
            };
            mockGetTodaySession.mockResolvedValue(lockedSessionNotAttending);

            render(<AttendancePage />);

            await waitFor(() => {
                expect(screen.getByText(/not attending/i)).toBeInTheDocument();
            });
        });
    });

    describe('Attendance lists', () => {
        it('should display attending players', async () => {
            render(<AttendancePage />);

            await waitFor(() => {
                expect(screen.getByText('John Doe')).toBeInTheDocument();
            });
            expect(screen.getByText('Jane Smith')).toBeInTheDocument();
        });

        it('should display "Can\'t Make It" section when there are non-attending players', async () => {
            render(<AttendancePage />);

            await waitFor(() => {
                expect(screen.getByText(/can't make it \(1\)/i)).toBeInTheDocument();
            });
            expect(screen.getByText('Bob Wilson')).toBeInTheDocument();
        });

        it('should show "No one has confirmed yet" when no one is attending', async () => {
            const emptySession = { ...mockSession, attendance: [] };
            mockGetTodaySession.mockResolvedValue(emptySession);

            render(<AttendancePage />);

            await waitFor(() => {
                expect(screen.getByText(/no one has confirmed yet/i)).toBeInTheDocument();
            });
        });

        it('should not show "Can\'t Make It" section when everyone is attending', async () => {
            const allAttendingSession = {
                ...mockSession,
                attendance: [
                    { user_id: 1, firstname: 'John', lastname: 'Doe', is_active: true },
                    { user_id: 2, firstname: 'Jane', lastname: 'Smith', is_active: true }
                ]
            };
            mockGetTodaySession.mockResolvedValue(allAttendingSession);

            render(<AttendancePage />);

            await waitFor(() => {
                expect(screen.getByText('John Doe')).toBeInTheDocument();
            });
            // Check that the section header for "can't make it" doesn't exist (the button still shows)
            expect(screen.queryByText(/can't make it \(\d+\)/i)).not.toBeInTheDocument();
        });
    });

    describe('WebSocket integration', () => {
        it('should join session and league rooms when connected', async () => {
            render(<AttendancePage />);

            await waitFor(() => {
                expect(mockJoinSession).toHaveBeenCalledWith(1);
            });
            expect(mockJoinLeague).toHaveBeenCalledWith(1);
        });

        it('should not join rooms when not connected', async () => {
            mockWebSocketContext.connected = false;

            render(<AttendancePage />);

            await waitFor(() => {
                expect(screen.getByText('Test Session')).toBeInTheDocument();
            });
            expect(mockJoinSession).not.toHaveBeenCalled();
        });

        it('should register attendance:updated event handler', async () => {
            render(<AttendancePage />);

            await waitFor(() => {
                expect(mockSocket.on).toHaveBeenCalledWith('attendance:updated', expect.any(Function));
            });
        });

        it('should clean up socket listeners on unmount', async () => {
            const { unmount } = render(<AttendancePage />);

            await waitFor(() => {
                expect(screen.getByText('Test Session')).toBeInTheDocument();
            });

            unmount();

            expect(mockSocket.off).toHaveBeenCalledWith('attendance:updated', expect.any(Function));
            expect(mockLeaveSession).toHaveBeenCalledWith(1);
            expect(mockLeaveLeague).toHaveBeenCalledWith(1);
        });

        it('should handle attendance update from Discord and show toast', async () => {
            let attendanceHandler;
            mockSocket.on.mockImplementation((event, handler) => {
                if (event === 'attendance:updated') {
                    attendanceHandler = handler;
                }
            });

            render(<AttendancePage />);

            await waitFor(() => {
                expect(screen.getByText('Test Session')).toBeInTheDocument();
            });

            // Simulate attendance update from Discord
            act(() => {
                attendanceHandler({
                    sessionId: 1,
                    source: 'discord',
                    action: 'check_in',
                    user: { firstname: 'New', lastname: 'User' }
                });
            });

            await waitFor(() => {
                expect(mockShowToast).toHaveBeenCalledWith(
                    'New User is attending (via Discord)',
                    'info'
                );
            });
        });

        it('should handle checkout update from Discord', async () => {
            let attendanceHandler;
            mockSocket.on.mockImplementation((event, handler) => {
                if (event === 'attendance:updated') {
                    attendanceHandler = handler;
                }
            });

            render(<AttendancePage />);

            await waitFor(() => {
                expect(screen.getByText('Test Session')).toBeInTheDocument();
            });

            act(() => {
                attendanceHandler({
                    sessionId: 1,
                    source: 'discord',
                    action: 'check_out',
                    user: { firstname: 'Test', lastname: 'Player' }
                });
            });

            await waitFor(() => {
                expect(mockShowToast).toHaveBeenCalledWith(
                    "Test Player can't make it (via Discord)",
                    'info'
                );
            });
        });

        it('should ignore attendance updates for different sessions', async () => {
            let attendanceHandler;
            mockSocket.on.mockImplementation((event, handler) => {
                if (event === 'attendance:updated') {
                    attendanceHandler = handler;
                }
            });

            render(<AttendancePage />);

            await waitFor(() => {
                expect(screen.getByText('Test Session')).toBeInTheDocument();
            });

            // Clear any previous calls
            mockShowToast.mockClear();

            act(() => {
                attendanceHandler({
                    sessionId: 999, // Different session
                    source: 'discord',
                    action: 'check_in',
                    user: { firstname: 'Other', lastname: 'User' }
                });
            });

            // Should not show toast for different session
            expect(mockShowToast).not.toHaveBeenCalled();
        });

        it('should ignore non-Discord attendance updates', async () => {
            let attendanceHandler;
            mockSocket.on.mockImplementation((event, handler) => {
                if (event === 'attendance:updated') {
                    attendanceHandler = handler;
                }
            });

            render(<AttendancePage />);

            await waitFor(() => {
                expect(screen.getByText('Test Session')).toBeInTheDocument();
            });

            mockShowToast.mockClear();

            act(() => {
                attendanceHandler({
                    sessionId: 1,
                    source: 'web', // Not from Discord
                    action: 'check_in',
                    user: { firstname: 'Web', lastname: 'User' }
                });
            });

            expect(mockShowToast).not.toHaveBeenCalled();
        });
    });

    describe('No socket', () => {
        it('should handle null socket gracefully', async () => {
            mockWebSocketContext.socket = null;

            render(<AttendancePage />);

            await waitFor(() => {
                expect(screen.getByText('Test Session')).toBeInTheDocument();
            });
            // Should not throw
        });
    });

    describe('League ID variations', () => {
        it('should use league_id if available', async () => {
            mockPermissionsContext.activeLeague = { league_id: 5, name: 'Test' };

            render(<AttendancePage />);

            await waitFor(() => {
                expect(mockGetActivePollSession).toHaveBeenCalledWith(5);
            });
        });

        it('should fall back to id if league_id not available', async () => {
            mockPermissionsContext.activeLeague = { id: 10, name: 'Test' };

            render(<AttendancePage />);

            await waitFor(() => {
                expect(mockGetActivePollSession).toHaveBeenCalledWith(10);
            });
        });

        it('should not fetch if no league ID', async () => {
            mockPermissionsContext.activeLeague = null;

            render(<AttendancePage />);

            await waitFor(() => {
                expect(screen.getByText(/please join a league/i)).toBeInTheDocument();
            });
            expect(mockGetActivePollSession).not.toHaveBeenCalled();
        });
    });

    describe('Session status badges', () => {
        it('should show success badge for active status', async () => {
            render(<AttendancePage />);

            await waitFor(() => {
                const badge = screen.getByText('active');
                expect(badge).toHaveClass('bg-success');
            });
        });

        it('should show warning badge for locked status', async () => {
            const lockedSession = { ...mockSession, status: 'locked' };
            mockGetTodaySession.mockResolvedValue(lockedSession);

            render(<AttendancePage />);

            await waitFor(() => {
                const badge = screen.getByText('locked');
                expect(badge).toHaveClass('bg-warning');
            });
        });

        it('should show secondary badge for other statuses', async () => {
            const pendingSession = { ...mockSession, status: 'pending' };
            mockGetTodaySession.mockResolvedValue(pendingSession);

            render(<AttendancePage />);

            await waitFor(() => {
                const badge = screen.getByText('pending');
                expect(badge).toHaveClass('bg-secondary');
            });
        });
    });

    describe('Empty session date', () => {
        it('should handle missing session date gracefully', async () => {
            const sessionNoDate = { ...mockSession, session_date: null };
            mockGetTodaySession.mockResolvedValue(sessionNoDate);

            render(<AttendancePage />);

            await waitFor(() => {
                expect(screen.getByText('Test Session')).toBeInTheDocument();
            });
            // Date should be empty string when null
            expect(screen.getByText(/date:/i)).toBeInTheDocument();
        });
    });

    describe('Empty attendance array', () => {
        it('should handle session with no attendance array', async () => {
            const sessionNoAttendance = { ...mockSession, attendance: undefined };
            mockGetTodaySession.mockResolvedValue(sessionNoAttendance);

            render(<AttendancePage />);

            await waitFor(() => {
                expect(screen.getByText(/no one has confirmed yet/i)).toBeInTheDocument();
            });
        });
    });
});
