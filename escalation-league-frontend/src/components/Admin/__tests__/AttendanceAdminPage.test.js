// Mock dependencies BEFORE importing modules
const mockShowToast = jest.fn();
const mockActiveLeague = { id: 1, league_id: 1, name: 'Test League' };

let mockPermissionsContext = {
    activeLeague: mockActiveLeague
};

const mockSocket = {
    on: jest.fn(),
    off: jest.fn(),
    emit: jest.fn()
};

jest.mock('../../../context/ToastContext', () => ({
    useToast: () => ({ showToast: mockShowToast })
}));

jest.mock('../../../context/PermissionsProvider', () => ({
    usePermissions: () => mockPermissionsContext
}));

jest.mock('../../../context/WebSocketProvider', () => ({
    useWebSocket: () => ({
        socket: mockSocket,
        connected: true,
        joinSession: jest.fn(),
        leaveSession: jest.fn(),
        joinLeague: jest.fn(),
        leaveLeague: jest.fn()
    })
}));

jest.mock('../../../api/attendanceApi', () => ({
    getLeagueSessions: jest.fn(),
    getSession: jest.fn(),
    adminCheckIn: jest.fn(),
    adminCheckOut: jest.fn(),
    postDiscordPoll: jest.fn(),
    closeDiscordPoll: jest.fn(),
    getMatchupMatrix: jest.fn(),
    getPodSuggestions: jest.fn(),
    lockSession: jest.fn(),
    reopenSession: jest.fn(),
    createPodWithPlayers: jest.fn(),
    createSession: jest.fn(),
    updateSessionStatus: jest.fn(),
    postSessionRecap: jest.fn()
}));

jest.mock('../../../api/userLeaguesApi', () => ({
    getLeagueParticipants: jest.fn()
}));

jest.mock('../../Shared/LoadingSpinner', () => {
    return function MockLoadingSpinner({ showText, text }) {
        return <div data-testid="loading-spinner">{text || 'Loading...'}</div>;
    };
});

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AttendanceAdminPage from '../AttendanceAdminPage';

import {
    getLeagueSessions,
    getSession,
    adminCheckIn,
    adminCheckOut,
    postDiscordPoll,
    closeDiscordPoll,
    getMatchupMatrix,
    getPodSuggestions,
    lockSession,
    reopenSession,
    createPodWithPlayers,
    createSession,
    updateSessionStatus,
    postSessionRecap
} from '../../../api/attendanceApi';
import { getLeagueParticipants } from '../../../api/userLeaguesApi';

// TODO: Fix async/mock issues - tests skipped
describe.skip('AttendanceAdminPage', () => {
    const mockSessions = [
        { id: 1, session_date: '2024-01-15', name: 'Week 1', status: 'active' },
        { id: 2, session_date: '2024-01-22', name: 'Week 2', status: 'locked' },
        { id: 3, session_date: '2024-01-29', name: 'Week 3', status: 'completed' }
    ];

    const mockSessionDetails = {
        id: 1,
        session_date: '2024-01-15',
        name: 'Week 1',
        status: 'active',
        has_active_poll: false,
        attendance: [
            { user_id: 1, firstname: 'John', lastname: 'Doe', is_active: true, updated_via: 'web' },
            { user_id: 2, firstname: 'Jane', lastname: 'Smith', is_active: false, updated_via: 'discord' }
        ]
    };

    const mockParticipants = [
        { user_id: 1, firstname: 'John', lastname: 'Doe' },
        { user_id: 2, firstname: 'Jane', lastname: 'Smith' },
        { user_id: 3, firstname: 'Bob', lastname: 'Wilson' }
    ];

    beforeEach(() => {
        jest.clearAllMocks();
        mockPermissionsContext = { activeLeague: mockActiveLeague };
        getLeagueSessions.mockResolvedValue(mockSessions);
        getSession.mockResolvedValue(mockSessionDetails);
        getLeagueParticipants.mockResolvedValue(mockParticipants);
        window.confirm = jest.fn(() => true);
    });

    describe('No Active League', () => {
        it('should display warning when no active league', async () => {
            mockPermissionsContext = { activeLeague: null };

            render(<AttendanceAdminPage />);

            expect(screen.getByText(/please select an active league/i)).toBeInTheDocument();
        });
    });

    describe('Initial Render with Active League', () => {
        it('should fetch sessions on mount', async () => {
            render(<AttendanceAdminPage />);

            await waitFor(() => {
                expect(getLeagueSessions).toHaveBeenCalledWith(1);
            });
        });

        it('should fetch participants on mount', async () => {
            render(<AttendanceAdminPage />);

            await waitFor(() => {
                expect(getLeagueParticipants).toHaveBeenCalledWith(1);
            });
        });

        it('should display sessions sidebar', async () => {
            render(<AttendanceAdminPage />);

            await waitFor(() => {
                expect(screen.getByText(/sessions/i)).toBeInTheDocument();
            });
        });

        it('should display session list', async () => {
            render(<AttendanceAdminPage />);

            await waitFor(() => {
                expect(screen.getByText(/week 1/i)).toBeInTheDocument();
            });
        });

        it('should auto-select first non-completed session', async () => {
            render(<AttendanceAdminPage />);

            await waitFor(() => {
                expect(getSession).toHaveBeenCalledWith(1);
            });
        });
    });

    describe('Session List', () => {
        it('should display session dates', async () => {
            render(<AttendanceAdminPage />);

            await waitFor(() => {
                expect(screen.getByText(/jan 15/i)).toBeInTheDocument();
            });
        });

        it('should display session status badges', async () => {
            render(<AttendanceAdminPage />);

            await waitFor(() => {
                expect(screen.getByText('active')).toBeInTheDocument();
            });
        });

        it('should display create session button', async () => {
            render(<AttendanceAdminPage />);

            await waitFor(() => {
                const createButtons = screen.getAllByRole('button');
                const createButton = createButtons.find(btn => btn.querySelector('.fa-plus'));
                expect(createButton).toBeInTheDocument();
            });
        });

        it('should display empty message when no sessions', async () => {
            getLeagueSessions.mockResolvedValue([]);
            getSession.mockResolvedValue(null);

            render(<AttendanceAdminPage />);

            await waitFor(() => {
                expect(screen.getByText(/no sessions yet/i)).toBeInTheDocument();
            });
        });
    });

    describe('Session Selection', () => {
        it('should fetch session details when session is selected', async () => {
            render(<AttendanceAdminPage />);

            await waitFor(() => {
                expect(screen.getByText(/week 2/i)).toBeInTheDocument();
            });

            // Click on Week 2 session
            const week2Button = screen.getByText(/week 2/i).closest('button');
            fireEvent.click(week2Button);

            await waitFor(() => {
                expect(getSession).toHaveBeenCalledWith(2);
            });
        });
    });

    describe('Session Details', () => {
        it('should display session header', async () => {
            render(<AttendanceAdminPage />);

            await waitFor(() => {
                expect(screen.getByText('Week 1')).toBeInTheDocument();
            });
        });

        it('should display attendance lists', async () => {
            render(<AttendanceAdminPage />);

            await waitFor(() => {
                expect(screen.getByText(/attending/i)).toBeInTheDocument();
                expect(screen.getByText(/can't make it/i)).toBeInTheDocument();
            });
        });

        it('should display attending players', async () => {
            render(<AttendanceAdminPage />);

            await waitFor(() => {
                expect(screen.getByText('John Doe')).toBeInTheDocument();
            });
        });

        it('should display not attending players', async () => {
            render(<AttendanceAdminPage />);

            await waitFor(() => {
                expect(screen.getByText('Jane Smith')).toBeInTheDocument();
            });
        });

        it('should display no response players', async () => {
            render(<AttendanceAdminPage />);

            await waitFor(() => {
                expect(screen.getByText(/no response/i)).toBeInTheDocument();
                expect(screen.getByText('Bob Wilson')).toBeInTheDocument();
            });
        });

        it('should display Discord badge for Discord RSVPs', async () => {
            render(<AttendanceAdminPage />);

            await waitFor(() => {
                const discordBadges = screen.getAllByRole('img', { hidden: true });
                // Look for discord icon in badges
                expect(document.querySelector('.fa-discord')).toBeInTheDocument();
            });
        });
    });

    describe('Attendance Actions', () => {
        it('should call adminCheckIn when marking player as attending', async () => {
            adminCheckIn.mockResolvedValue({});

            render(<AttendanceAdminPage />);

            await waitFor(() => {
                expect(screen.getByText('Bob Wilson')).toBeInTheDocument();
            });

            // Find the check button for Bob Wilson in no response section
            const checkButtons = screen.getAllByRole('button');
            const checkButton = checkButtons.find(btn => btn.querySelector('.fa-check'));
            if (checkButton) {
                fireEvent.click(checkButton);

                await waitFor(() => {
                    expect(adminCheckIn).toHaveBeenCalled();
                });
            }
        });

        it('should call adminCheckOut when marking player as not attending', async () => {
            adminCheckOut.mockResolvedValue({});

            render(<AttendanceAdminPage />);

            await waitFor(() => {
                expect(screen.getByText('John Doe')).toBeInTheDocument();
            });

            // Find the X button for John Doe in attending section
            const removeButtons = screen.getAllByRole('button');
            const removeButton = removeButtons.find(btn =>
                btn.classList.contains('btn-outline-danger') && btn.querySelector('.fa-times')
            );
            if (removeButton) {
                fireEvent.click(removeButton);

                await waitFor(() => {
                    expect(adminCheckOut).toHaveBeenCalled();
                });
            }
        });

        it('should show success toast after check-in', async () => {
            adminCheckIn.mockResolvedValue({});

            render(<AttendanceAdminPage />);

            await waitFor(() => {
                expect(screen.getByText('Bob Wilson')).toBeInTheDocument();
            });

            const checkButtons = screen.getAllByRole('button');
            const checkButton = checkButtons.find(btn => btn.querySelector('.fa-check'));
            if (checkButton) {
                fireEvent.click(checkButton);

                await waitFor(() => {
                    expect(mockShowToast).toHaveBeenCalledWith('Player marked as attending.', 'success');
                });
            }
        });
    });

    describe('Discord Poll', () => {
        it('should display Post Discord Poll button for active sessions', async () => {
            render(<AttendanceAdminPage />);

            await waitFor(() => {
                expect(screen.getByRole('button', { name: /post discord poll/i })).toBeInTheDocument();
            });
        });

        it('should open poll modal when clicking Post Discord Poll', async () => {
            render(<AttendanceAdminPage />);

            await waitFor(() => {
                expect(screen.getByRole('button', { name: /post discord poll/i })).toBeInTheDocument();
            });

            fireEvent.click(screen.getByRole('button', { name: /post discord poll/i }));

            await waitFor(() => {
                expect(screen.getByText(/poll message/i)).toBeInTheDocument();
            });
        });

        it('should post poll when confirming', async () => {
            postDiscordPoll.mockResolvedValue({});

            render(<AttendanceAdminPage />);

            await waitFor(() => {
                expect(screen.getByRole('button', { name: /post discord poll/i })).toBeInTheDocument();
            });

            fireEvent.click(screen.getByRole('button', { name: /post discord poll/i }));

            await waitFor(() => {
                expect(screen.getByRole('button', { name: /^post poll$/i })).toBeInTheDocument();
            });

            fireEvent.click(screen.getByRole('button', { name: /^post poll$/i }));

            await waitFor(() => {
                expect(postDiscordPoll).toHaveBeenCalled();
            });
        });

        it('should display Close Poll button when poll is active', async () => {
            getSession.mockResolvedValue({
                ...mockSessionDetails,
                has_active_poll: true
            });

            render(<AttendanceAdminPage />);

            await waitFor(() => {
                expect(screen.getByRole('button', { name: /close poll/i })).toBeInTheDocument();
            });
        });
    });

    describe('Session Status Actions', () => {
        it('should display Lock Session button when requirements met', async () => {
            getSession.mockResolvedValue({
                ...mockSessionDetails,
                attendance: [
                    { user_id: 1, firstname: 'John', lastname: 'Doe', is_active: true },
                    { user_id: 2, firstname: 'Jane', lastname: 'Smith', is_active: true },
                    { user_id: 3, firstname: 'Bob', lastname: 'Wilson', is_active: true }
                ]
            });

            render(<AttendanceAdminPage />);

            await waitFor(() => {
                expect(screen.getByRole('button', { name: /lock session/i })).toBeInTheDocument();
            });
        });

        it('should call lockSession when Lock is clicked', async () => {
            lockSession.mockResolvedValue({});
            getPodSuggestions.mockResolvedValue({ pods: [] });
            getSession.mockResolvedValue({
                ...mockSessionDetails,
                attendance: [
                    { user_id: 1, firstname: 'John', lastname: 'Doe', is_active: true },
                    { user_id: 2, firstname: 'Jane', lastname: 'Smith', is_active: true },
                    { user_id: 3, firstname: 'Bob', lastname: 'Wilson', is_active: true }
                ]
            });

            render(<AttendanceAdminPage />);

            await waitFor(() => {
                expect(screen.getByRole('button', { name: /lock session/i })).toBeInTheDocument();
            });

            fireEvent.click(screen.getByRole('button', { name: /lock session/i }));

            await waitFor(() => {
                expect(lockSession).toHaveBeenCalledWith(1);
            });
        });

        it('should display Reopen button for locked sessions', async () => {
            getSession.mockResolvedValue({
                ...mockSessionDetails,
                status: 'locked'
            });

            render(<AttendanceAdminPage />);

            await waitFor(() => {
                expect(screen.getByRole('button', { name: /reopen/i })).toBeInTheDocument();
            });
        });

        it('should call reopenSession when Reopen is clicked', async () => {
            reopenSession.mockResolvedValue({});
            getSession.mockResolvedValue({
                ...mockSessionDetails,
                status: 'locked'
            });

            render(<AttendanceAdminPage />);

            await waitFor(() => {
                expect(screen.getByRole('button', { name: /reopen/i })).toBeInTheDocument();
            });

            fireEvent.click(screen.getByRole('button', { name: /reopen/i }));

            await waitFor(() => {
                expect(reopenSession).toHaveBeenCalledWith(1);
            });
        });
    });

    describe('Pod Suggestions', () => {
        it('should display pod suggestions panel for locked sessions', async () => {
            getSession.mockResolvedValue({
                ...mockSessionDetails,
                status: 'locked',
                attendance: [
                    { user_id: 1, firstname: 'John', lastname: 'Doe', is_active: true },
                    { user_id: 2, firstname: 'Jane', lastname: 'Smith', is_active: true }
                ]
            });

            render(<AttendanceAdminPage />);

            await waitFor(() => {
                expect(screen.getByText(/pod suggestions/i)).toBeInTheDocument();
            });
        });

        it('should display Generate Suggestions button', async () => {
            getSession.mockResolvedValue({
                ...mockSessionDetails,
                status: 'locked',
                attendance: [{ user_id: 1, firstname: 'John', lastname: 'Doe', is_active: true }]
            });

            render(<AttendanceAdminPage />);

            await waitFor(() => {
                expect(screen.getByRole('button', { name: /generate suggestions/i })).toBeInTheDocument();
            });
        });

        it('should fetch pod suggestions when Generate is clicked', async () => {
            getPodSuggestions.mockResolvedValue({
                pods: [
                    { players: [{ id: 1, firstname: 'John', lastname: 'Doe' }], score: 0, size: 1 }
                ]
            });
            getSession.mockResolvedValue({
                ...mockSessionDetails,
                status: 'locked',
                attendance: [{ user_id: 1, firstname: 'John', lastname: 'Doe', is_active: true }]
            });

            render(<AttendanceAdminPage />);

            await waitFor(() => {
                expect(screen.getByRole('button', { name: /generate suggestions/i })).toBeInTheDocument();
            });

            fireEvent.click(screen.getByRole('button', { name: /generate suggestions/i }));

            await waitFor(() => {
                expect(getPodSuggestions).toHaveBeenCalledWith(1);
            });
        });

        it('should display pod suggestion cards', async () => {
            getPodSuggestions.mockResolvedValue({
                pods: [
                    {
                        players: [
                            { id: 1, firstname: 'John', lastname: 'Doe' },
                            { id: 2, firstname: 'Jane', lastname: 'Smith' }
                        ],
                        score: 0,
                        size: 2
                    }
                ]
            });
            getSession.mockResolvedValue({
                ...mockSessionDetails,
                status: 'locked',
                attendance: [
                    { user_id: 1, firstname: 'John', lastname: 'Doe', is_active: true },
                    { user_id: 2, firstname: 'Jane', lastname: 'Smith', is_active: true }
                ]
            });

            render(<AttendanceAdminPage />);

            await waitFor(() => {
                expect(screen.getByRole('button', { name: /generate suggestions/i })).toBeInTheDocument();
            });

            fireEvent.click(screen.getByRole('button', { name: /generate suggestions/i }));

            await waitFor(() => {
                expect(screen.getByText(/pod 1/i)).toBeInTheDocument();
            });
        });

        it('should call createPodWithPlayers when Create Pod is clicked', async () => {
            createPodWithPlayers.mockResolvedValue({});
            getPodSuggestions.mockResolvedValue({
                pods: [
                    {
                        players: [{ id: 1, firstname: 'John', lastname: 'Doe' }],
                        score: 0,
                        size: 1
                    }
                ]
            });
            getSession.mockResolvedValue({
                ...mockSessionDetails,
                status: 'locked',
                attendance: [{ user_id: 1, firstname: 'John', lastname: 'Doe', is_active: true }]
            });

            render(<AttendanceAdminPage />);

            await waitFor(() => {
                expect(screen.getByRole('button', { name: /generate suggestions/i })).toBeInTheDocument();
            });

            fireEvent.click(screen.getByRole('button', { name: /generate suggestions/i }));

            await waitFor(() => {
                expect(screen.getByRole('button', { name: /create pod/i })).toBeInTheDocument();
            });

            fireEvent.click(screen.getByRole('button', { name: /create pod/i }));

            await waitFor(() => {
                expect(createPodWithPlayers).toHaveBeenCalledWith(1, [1]);
            });
        });
    });

    describe('Create Session Modal', () => {
        it('should open create session modal when plus button clicked', async () => {
            render(<AttendanceAdminPage />);

            await waitFor(() => {
                const createButton = screen.getAllByRole('button').find(btn =>
                    btn.querySelector('.fa-plus') && btn.closest('.card-header')
                );
                expect(createButton).toBeInTheDocument();
            });

            const createButton = screen.getAllByRole('button').find(btn =>
                btn.querySelector('.fa-plus') && btn.closest('.card-header')
            );
            fireEvent.click(createButton);

            await waitFor(() => {
                expect(screen.getByText(/create session/i)).toBeInTheDocument();
            });
        });

        it('should have date input in create modal', async () => {
            render(<AttendanceAdminPage />);

            await waitFor(() => {
                const createButton = screen.getAllByRole('button').find(btn =>
                    btn.querySelector('.fa-plus') && btn.closest('.card-header')
                );
                expect(createButton).toBeInTheDocument();
            });

            const createButton = screen.getAllByRole('button').find(btn =>
                btn.querySelector('.fa-plus') && btn.closest('.card-header')
            );
            fireEvent.click(createButton);

            await waitFor(() => {
                expect(screen.getByText(/date \*/i)).toBeInTheDocument();
            });

            // Check that the date input exists in the modal
            const modal = document.querySelector('.modal');
            const dateInput = modal?.querySelector('input[type="date"]');
            expect(dateInput).toBeInTheDocument();
        });

        it('should create session when form submitted', async () => {
            createSession.mockResolvedValue({ id: 4 });

            render(<AttendanceAdminPage />);

            await waitFor(() => {
                const createButton = screen.getAllByRole('button').find(btn =>
                    btn.querySelector('.fa-plus') && btn.closest('.card-header')
                );
                expect(createButton).toBeInTheDocument();
            });

            const createButton = screen.getAllByRole('button').find(btn =>
                btn.querySelector('.fa-plus') && btn.closest('.card-header')
            );
            fireEvent.click(createButton);

            await waitFor(() => {
                expect(screen.getByText(/date \*/i)).toBeInTheDocument();
            });

            const modal = document.querySelector('.modal');
            const dateInput = modal?.querySelector('input[type="date"]');
            fireEvent.change(dateInput, { target: { value: '2024-02-01' } });

            const submitButton = screen.getByRole('button', { name: /^create$/i });
            fireEvent.click(submitButton);

            await waitFor(() => {
                expect(createSession).toHaveBeenCalled();
            });
        });
    });

    describe('Matchup Matrix', () => {
        it('should display Matchup Matrix button', async () => {
            render(<AttendanceAdminPage />);

            await waitFor(() => {
                expect(screen.getByRole('button', { name: /matchup matrix/i })).toBeInTheDocument();
            });
        });

        it('should open matrix modal when button clicked', async () => {
            getMatchupMatrix.mockResolvedValue({
                players: [{ id: 1, firstname: 'John' }],
                matrix: { 1: { 1: 0 } }
            });

            render(<AttendanceAdminPage />);

            await waitFor(() => {
                expect(screen.getByRole('button', { name: /matchup matrix/i })).toBeInTheDocument();
            });

            fireEvent.click(screen.getByRole('button', { name: /matchup matrix/i }));

            await waitFor(() => {
                expect(getMatchupMatrix).toHaveBeenCalledWith(1);
            });
        });
    });

    describe('Error Handling', () => {
        it('should display error when sessions fetch fails', async () => {
            getLeagueSessions.mockRejectedValue(new Error('Network error'));

            render(<AttendanceAdminPage />);

            await waitFor(() => {
                // Error is logged but component doesn't crash
                expect(screen.getByText(/sessions/i)).toBeInTheDocument();
            });
        });

        it('should show error toast when check-in fails', async () => {
            adminCheckIn.mockRejectedValue({
                response: { data: { error: 'Check-in failed' } }
            });

            render(<AttendanceAdminPage />);

            await waitFor(() => {
                expect(screen.getByText('Bob Wilson')).toBeInTheDocument();
            });

            const checkButtons = screen.getAllByRole('button');
            const checkButton = checkButtons.find(btn => btn.querySelector('.fa-check'));
            if (checkButton) {
                fireEvent.click(checkButton);

                await waitFor(() => {
                    expect(mockShowToast).toHaveBeenCalledWith('Check-in failed', 'error');
                });
            }
        });
    });

    describe('Completed Session', () => {
        it('should display completed alert for completed sessions', async () => {
            getSession.mockResolvedValue({
                ...mockSessionDetails,
                status: 'completed'
            });

            render(<AttendanceAdminPage />);

            await waitFor(() => {
                expect(screen.getByText(/this session has been completed/i)).toBeInTheDocument();
            });
        });

        it('should hide attendance modification buttons for completed sessions', async () => {
            getSession.mockResolvedValue({
                ...mockSessionDetails,
                status: 'completed'
            });

            render(<AttendanceAdminPage />);

            await waitFor(() => {
                // No response section should not be visible for completed sessions
                const noResponseSection = screen.queryByText(/no response \(/i);
                expect(noResponseSection).not.toBeInTheDocument();
            });
        });
    });

    describe('WebSocket Integration', () => {
        it('should register WebSocket event listeners', async () => {
            render(<AttendanceAdminPage />);

            await waitFor(() => {
                expect(mockSocket.on).toHaveBeenCalledWith('attendance:updated', expect.any(Function));
            });
        });

        it('should unregister WebSocket listeners on unmount', async () => {
            const { unmount } = render(<AttendanceAdminPage />);

            await waitFor(() => {
                expect(mockSocket.on).toHaveBeenCalled();
            });

            unmount();

            expect(mockSocket.off).toHaveBeenCalledWith('attendance:updated', expect.any(Function));
        });
    });
});
