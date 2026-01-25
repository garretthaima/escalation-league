import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import Dashboard from '../Dashboard';

// Mock the API
jest.mock('../../../api/usersApi', () => ({
    getUserProfile: jest.fn()
}));

const { getUserProfile } = require('../../../api/usersApi');

describe('Dashboard', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        // Suppress console.error for cleaner test output
        jest.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
        console.error.mockRestore();
    });

    describe('loading state', () => {
        it('should show loading message initially', () => {
            getUserProfile.mockImplementation(() => new Promise(() => {})); // Never resolves
            render(<Dashboard />);
            expect(screen.getByText('Loading...')).toBeInTheDocument();
        });

        it('should have correct loading class', () => {
            getUserProfile.mockImplementation(() => new Promise(() => {}));
            render(<Dashboard />);
            const loadingDiv = screen.getByText('Loading...');
            expect(loadingDiv).toHaveClass('text-center', 'mt-4');
        });
    });

    describe('successful data fetch', () => {
        const mockUser = {
            id: 1,
            firstname: 'John',
            lastname: 'Doe',
            email: 'john@example.com'
        };

        beforeEach(() => {
            getUserProfile.mockResolvedValue({ user: mockUser });
        });

        it('should render welcome message with user name', async () => {
            render(<Dashboard />);
            await waitFor(() => {
                expect(screen.getByText('Welcome, John Doe!')).toBeInTheDocument();
            });
        });

        it('should render success alert', async () => {
            render(<Dashboard />);
            await waitFor(() => {
                expect(screen.getByText('You are successfully logged in.')).toBeInTheDocument();
            });
        });

        it('should render container with correct classes', async () => {
            render(<Dashboard />);
            await waitFor(() => {
                const container = screen.getByText('Welcome, John Doe!').closest('.container');
                expect(container).toHaveClass('container', 'mt-4');
            });
        });

        it('should render success alert with correct class', async () => {
            render(<Dashboard />);
            await waitFor(() => {
                const alert = screen.getByText('You are successfully logged in.').closest('.alert');
                expect(alert).toHaveClass('alert', 'alert-success');
            });
        });

        it('should render check icon', async () => {
            render(<Dashboard />);
            await waitFor(() => {
                const alert = screen.getByText('You are successfully logged in.').closest('.alert');
                const icon = alert.querySelector('i');
                expect(icon).toHaveClass('fas', 'fa-check-circle', 'me-2');
            });
        });

        it('should render h2 heading', async () => {
            render(<Dashboard />);
            await waitFor(() => {
                const heading = screen.getByRole('heading', { level: 2 });
                expect(heading).toBeInTheDocument();
                expect(heading).toHaveClass('mb-4');
            });
        });
    });

    describe('error handling', () => {
        it('should show error message when API fails', async () => {
            getUserProfile.mockRejectedValue(new Error('API Error'));
            render(<Dashboard />);
            await waitFor(() => {
                expect(screen.getByText('Failed to load user information.')).toBeInTheDocument();
            });
        });

        it('should render error alert with correct class', async () => {
            getUserProfile.mockRejectedValue(new Error('API Error'));
            render(<Dashboard />);
            await waitFor(() => {
                const alert = screen.getByText('Failed to load user information.');
                expect(alert).toHaveClass('alert', 'alert-danger', 'text-center', 'mt-4');
            });
        });

        it('should log error to console', async () => {
            const testError = new Error('Test error');
            getUserProfile.mockRejectedValue(testError);
            render(<Dashboard />);
            await waitFor(() => {
                expect(console.error).toHaveBeenCalledWith('Error fetching user info:', testError);
            });
        });
    });

    describe('no user data', () => {
        it('should show warning when user is null', async () => {
            getUserProfile.mockResolvedValue({ user: null });
            render(<Dashboard />);
            await waitFor(() => {
                expect(screen.getByText('No user data available.')).toBeInTheDocument();
            });
        });

        it('should show warning when user is undefined', async () => {
            getUserProfile.mockResolvedValue({});
            render(<Dashboard />);
            await waitFor(() => {
                expect(screen.getByText('No user data available.')).toBeInTheDocument();
            });
        });

        it('should render warning alert with correct class', async () => {
            getUserProfile.mockResolvedValue({ user: null });
            render(<Dashboard />);
            await waitFor(() => {
                const alert = screen.getByText('No user data available.');
                expect(alert).toHaveClass('alert', 'alert-warning', 'text-center', 'mt-4');
            });
        });
    });

    describe('API call behavior', () => {
        it('should call getUserProfile on mount', async () => {
            getUserProfile.mockResolvedValue({ user: { firstname: 'Test', lastname: 'User' } });
            render(<Dashboard />);
            await waitFor(() => {
                expect(getUserProfile).toHaveBeenCalledTimes(1);
            });
        });

        it('should only call getUserProfile once', async () => {
            getUserProfile.mockResolvedValue({ user: { firstname: 'Test', lastname: 'User' } });
            render(<Dashboard />);
            await waitFor(() => {
                expect(screen.getByText('Welcome, Test User!')).toBeInTheDocument();
            });
            // Wait a bit more to ensure no additional calls
            await new Promise(resolve => setTimeout(resolve, 100));
            expect(getUserProfile).toHaveBeenCalledTimes(1);
        });
    });

    describe('different user data variations', () => {
        it('should handle user with empty firstname', async () => {
            getUserProfile.mockResolvedValue({ user: { firstname: '', lastname: 'Smith' } });
            render(<Dashboard />);
            await waitFor(() => {
                expect(screen.getByText('Welcome, Smith!')).toBeInTheDocument();
            });
        });

        it('should handle user with empty lastname', async () => {
            getUserProfile.mockResolvedValue({ user: { firstname: 'Jane', lastname: '' } });
            render(<Dashboard />);
            await waitFor(() => {
                expect(screen.getByText('Welcome, Jane !')).toBeInTheDocument();
            });
        });

        it('should handle user with special characters in name', async () => {
            getUserProfile.mockResolvedValue({ user: { firstname: "O'Brien", lastname: 'Mc-Donald' } });
            render(<Dashboard />);
            await waitFor(() => {
                expect(screen.getByText("Welcome, O'Brien Mc-Donald!")).toBeInTheDocument();
            });
        });

        it('should handle user with long names', async () => {
            const longFirstName = 'VeryLongFirstNameThatCouldPotentiallyBreakTheLayout';
            const longLastName = 'VeryLongLastNameThatCouldPotentiallyBreakTheLayout';
            getUserProfile.mockResolvedValue({ user: { firstname: longFirstName, lastname: longLastName } });
            render(<Dashboard />);
            await waitFor(() => {
                expect(screen.getByText(`Welcome, ${longFirstName} ${longLastName}!`)).toBeInTheDocument();
            });
        });
    });
});
