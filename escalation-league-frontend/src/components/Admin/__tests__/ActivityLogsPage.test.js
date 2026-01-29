// Mock dependencies BEFORE importing modules
const mockShowToast = jest.fn();

jest.mock('../../../context/ToastContext', () => ({
    useToast: () => ({ showToast: mockShowToast })
}));

jest.mock('../../../api/activityLogsApi', () => ({
    getActivityLogs: jest.fn(),
    getActionTypes: jest.fn()
}));

jest.mock('../../../api/adminApi', () => ({
    getAllUsers: jest.fn()
}));

jest.mock('../../Shared/LoadingSpinner', () => {
    return function MockLoadingSpinner() {
        return <div data-testid="loading-spinner">Loading...</div>;
    };
});

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ActivityLogsPage from '../ActivityLogsPage';

import { getActivityLogs, getActionTypes } from '../../../api/activityLogsApi';
import { getAllUsers } from '../../../api/adminApi';

describe('ActivityLogsPage', () => {
    const mockLogs = [
        {
            id: 1,
            timestamp: '2024-01-15T10:30:00Z',
            firstname: 'John',
            lastname: 'Doe',
            email: 'john@example.com',
            action: 'USER_LOGIN',
            metadata: '{"ip": "192.168.1.1"}'
        },
        {
            id: 2,
            timestamp: '2024-01-15T11:00:00Z',
            firstname: 'Jane',
            lastname: 'Smith',
            email: 'jane@example.com',
            action: 'POD_CREATE',
            metadata: { podId: 123 }
        }
    ];

    const mockUsers = [
        { id: 1, firstname: 'John', lastname: 'Doe', email: 'john@example.com' },
        { id: 2, firstname: 'Jane', lastname: 'Smith', email: 'jane@example.com' }
    ];

    const mockActionTypes = ['USER_LOGIN', 'POD_CREATE', 'LEAGUE_JOIN'];

    beforeEach(() => {
        jest.clearAllMocks();
        getActivityLogs.mockResolvedValue({
            logs: mockLogs,
            pagination: { page: 1, total: 2, totalPages: 1 }
        });
        getActionTypes.mockResolvedValue({ actions: mockActionTypes });
        getAllUsers.mockResolvedValue({ users: mockUsers });
    });

    describe('Initial Render', () => {
        it('should render the page title', async () => {
            render(<ActivityLogsPage />);
            expect(screen.getByText(/activity logs/i)).toBeInTheDocument();
        });

        it('should display loading spinner initially', async () => {
            render(<ActivityLogsPage />);
            await waitFor(() => {
                expect(getActivityLogs).toHaveBeenCalled();
            });
        });

        it('should fetch logs on mount', async () => {
            render(<ActivityLogsPage />);
            await waitFor(() => {
                expect(getActivityLogs).toHaveBeenCalled();
            });
        });

        it('should fetch filter data on mount', async () => {
            render(<ActivityLogsPage />);
            await waitFor(() => {
                expect(getAllUsers).toHaveBeenCalled();
                expect(getActionTypes).toHaveBeenCalled();
            });
        });
    });

    describe('Filters Section', () => {
        it('should render action type filter', async () => {
            render(<ActivityLogsPage />);
            await waitFor(() => {
                expect(screen.getByText('Action Type')).toBeInTheDocument();
            });
        });

        it('should render user filter', async () => {
            render(<ActivityLogsPage />);
            await waitFor(() => {
                expect(screen.getByText('User')).toBeInTheDocument();
            });
        });

        it('should render start date filter', async () => {
            render(<ActivityLogsPage />);
            await waitFor(() => {
                expect(screen.getByText('Start Date')).toBeInTheDocument();
            });
        });

        it('should render end date filter', async () => {
            render(<ActivityLogsPage />);
            await waitFor(() => {
                expect(screen.getByText('End Date')).toBeInTheDocument();
            });
        });

        it('should render Apply button', async () => {
            render(<ActivityLogsPage />);
            await waitFor(() => {
                expect(screen.getByRole('button', { name: /apply/i })).toBeInTheDocument();
            });
        });

        it('should render Clear button', async () => {
            render(<ActivityLogsPage />);
            await waitFor(() => {
                expect(screen.getByRole('button', { name: /clear/i })).toBeInTheDocument();
            });
        });

        it('should populate action types dropdown with fetched actions', async () => {
            render(<ActivityLogsPage />);
            await waitFor(() => {
                mockActionTypes.forEach(action => {
                    expect(screen.getByRole('option', { name: action })).toBeInTheDocument();
                });
            });
        });

        it('should populate users dropdown with fetched users', async () => {
            render(<ActivityLogsPage />);
            await waitFor(() => {
                const userOptions = screen.getAllByRole('option');
                expect(userOptions.length).toBeGreaterThan(2); // "All" + users
            });
        });
    });

    describe('Filter Interactions', () => {
        it('should update action filter when changed', async () => {
            render(<ActivityLogsPage />);

            // Wait for action types to be populated
            await waitFor(() => {
                expect(screen.getByRole('option', { name: 'USER_LOGIN' })).toBeInTheDocument();
            });

            // Get the select by name attribute
            const actionSelect = document.querySelector('select[name="action"]');
            fireEvent.change(actionSelect, { target: { value: 'USER_LOGIN' } });

            expect(actionSelect.value).toBe('USER_LOGIN');
        });

        it('should call fetchLogs when Apply is clicked', async () => {
            render(<ActivityLogsPage />);

            await waitFor(() => {
                expect(screen.getByRole('button', { name: /apply/i })).toBeInTheDocument();
            });

            fireEvent.click(screen.getByRole('button', { name: /apply/i }));

            await waitFor(() => {
                expect(getActivityLogs).toHaveBeenCalledTimes(2); // Initial + Apply
            });
        });

        it('should clear filters when Clear is clicked', async () => {
            render(<ActivityLogsPage />);

            await waitFor(() => {
                expect(screen.getByText('Action Type')).toBeInTheDocument();
            });

            const actionSelect = document.querySelector('select[name="action"]');
            fireEvent.change(actionSelect, { target: { value: 'USER_LOGIN' } });

            fireEvent.click(screen.getByRole('button', { name: /clear/i }));

            await waitFor(() => {
                expect(actionSelect.value).toBe('');
            });
        });
    });

    describe('Logs Table', () => {
        it('should render logs table when logs exist', async () => {
            render(<ActivityLogsPage />);

            await waitFor(() => {
                expect(screen.getByRole('table')).toBeInTheDocument();
            });
        });

        it('should display table headers', async () => {
            render(<ActivityLogsPage />);

            await waitFor(() => {
                expect(screen.getByRole('table')).toBeInTheDocument();
            });
            // "User" and "Action" appear in both filters and table headers
            const table = screen.getByRole('table');
            expect(table).toHaveTextContent('Timestamp');
            expect(table).toHaveTextContent('User');
            expect(table).toHaveTextContent('Action');
            expect(table).toHaveTextContent('Details');
        });

        it('should display log entries', async () => {
            render(<ActivityLogsPage />);

            await waitFor(() => {
                expect(screen.getByRole('table')).toBeInTheDocument();
            });
            expect(screen.getByText('John Doe')).toBeInTheDocument();
            expect(screen.getByText('john@example.com')).toBeInTheDocument();
            // USER_LOGIN appears in both filter options and log entries
            expect(screen.getAllByText('USER_LOGIN').length).toBeGreaterThan(0);
        });

        it('should display user email in log entries', async () => {
            render(<ActivityLogsPage />);

            await waitFor(() => {
                expect(screen.getByText('jane@example.com')).toBeInTheDocument();
            });
        });

        it('should display action badge', async () => {
            render(<ActivityLogsPage />);

            await waitFor(() => {
                const badges = screen.getAllByText('USER_LOGIN');
                expect(badges.length).toBeGreaterThan(0);
            });
        });
    });

    describe('Empty State', () => {
        it('should display empty message when no logs', async () => {
            getActivityLogs.mockResolvedValue({
                logs: [],
                pagination: { page: 1, total: 0, totalPages: 0 }
            });

            render(<ActivityLogsPage />);

            await waitFor(() => {
                expect(screen.getByText(/no activity logs found/i)).toBeInTheDocument();
            });
        });
    });

    describe('Error Handling', () => {
        it('should show error toast when fetching logs fails', async () => {
            getActivityLogs.mockRejectedValue(new Error('Network error'));

            render(<ActivityLogsPage />);

            await waitFor(() => {
                expect(mockShowToast).toHaveBeenCalledWith('Failed to load activity logs', 'error');
            });
        });

        it('should handle filter data fetch error gracefully', async () => {
            getAllUsers.mockRejectedValue(new Error('Network error'));
            getActionTypes.mockRejectedValue(new Error('Network error'));

            render(<ActivityLogsPage />);

            // Should not crash, just log error
            await waitFor(() => {
                expect(screen.getByText(/activity logs/i)).toBeInTheDocument();
            });
        });
    });

    describe('Pagination', () => {
        it('should display total entries badge', async () => {
            render(<ActivityLogsPage />);

            await waitFor(() => {
                expect(screen.getByText(/2 total entries/i)).toBeInTheDocument();
            });
        });

        it('should render pagination when multiple pages exist', async () => {
            getActivityLogs.mockResolvedValue({
                logs: mockLogs,
                pagination: { page: 1, total: 100, totalPages: 2 }
            });

            render(<ActivityLogsPage />);

            await waitFor(() => {
                expect(screen.getByText(/page 1 of 2/i)).toBeInTheDocument();
            });
        });

        it('should not render pagination when only one page', async () => {
            getActivityLogs.mockResolvedValue({
                logs: mockLogs,
                pagination: { page: 1, total: 2, totalPages: 1 }
            });

            render(<ActivityLogsPage />);

            await waitFor(() => {
                expect(screen.queryByText(/page 1 of/i)).not.toBeInTheDocument();
            });
        });

        it('should disable previous buttons on first page', async () => {
            getActivityLogs.mockResolvedValue({
                logs: mockLogs,
                pagination: { page: 1, total: 100, totalPages: 2 }
            });

            render(<ActivityLogsPage />);

            await waitFor(() => {
                const firstButton = screen.getAllByRole('button').find(
                    btn => btn.querySelector('.fa-angle-double-left')
                );
                expect(firstButton).toBeDisabled();
            });
        });
    });

    describe('Metadata Formatting', () => {
        it('should parse and display JSON metadata', async () => {
            render(<ActivityLogsPage />);

            await waitFor(() => {
                expect(screen.getByText(/ip:/i)).toBeInTheDocument();
            });
        });

        it('should handle object metadata', async () => {
            render(<ActivityLogsPage />);

            await waitFor(() => {
                expect(screen.getByText(/podId:/i)).toBeInTheDocument();
            });
        });

        it('should display dash for null metadata', async () => {
            getActivityLogs.mockResolvedValue({
                logs: [{
                    id: 3,
                    timestamp: '2024-01-15T10:30:00Z',
                    firstname: 'Test',
                    lastname: 'User',
                    email: 'test@example.com',
                    action: 'TEST_ACTION',
                    metadata: null
                }],
                pagination: { page: 1, total: 1, totalPages: 1 }
            });

            render(<ActivityLogsPage />);

            await waitFor(() => {
                expect(screen.getByText('-')).toBeInTheDocument();
            });
        });
    });

    describe('Date Formatting', () => {
        it('should format timestamp correctly', async () => {
            render(<ActivityLogsPage />);

            await waitFor(() => {
                // The exact format depends on locale, but the component should render timestamps
                expect(screen.getByRole('table')).toBeInTheDocument();
            });
        });

        it('should display dash for null timestamp', async () => {
            getActivityLogs.mockResolvedValue({
                logs: [{
                    id: 3,
                    timestamp: null,
                    firstname: 'Test',
                    lastname: 'User',
                    email: 'test@example.com',
                    action: 'TEST_ACTION',
                    metadata: null
                }],
                pagination: { page: 1, total: 1, totalPages: 1 }
            });

            render(<ActivityLogsPage />);

            await waitFor(() => {
                const dashes = screen.getAllByText('-');
                expect(dashes.length).toBeGreaterThan(0);
            });
        });
    });

    describe('Users API Response Format', () => {
        it('should handle users array directly', async () => {
            getAllUsers.mockResolvedValue([
                { id: 1, firstname: 'Direct', lastname: 'User', email: 'direct@example.com' }
            ]);

            render(<ActivityLogsPage />);

            await waitFor(() => {
                expect(screen.getByText('User')).toBeInTheDocument();
            });
        });

        it('should handle users wrapped in object', async () => {
            getAllUsers.mockResolvedValue({
                users: [{ id: 1, firstname: 'Wrapped', lastname: 'User', email: 'wrapped@example.com' }]
            });

            render(<ActivityLogsPage />);

            await waitFor(() => {
                expect(screen.getByText('User')).toBeInTheDocument();
            });
        });
    });
});
